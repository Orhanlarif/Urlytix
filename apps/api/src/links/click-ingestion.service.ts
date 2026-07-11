import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DeviceType } from '@prisma/client';
import { Queue, Worker } from 'bullmq';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';

export type ClickIngestionPayload = {
  linkId: string;
  visitorId: string;
  ipHash: string | null;
  country: string | null;
  city: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  deviceType: DeviceType;
  browser: string;
  os: string;
  isBot: boolean;
};

export interface ClickQueueAdapter {
  enqueue(payload: ClickIngestionPayload): Promise<void>;
}

@Injectable()
export class ClickIngestionService
  implements ClickQueueAdapter, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ClickIngestionService.name);
  private queue?: Queue<ClickIngestionPayload, void, 'click'>;
  private worker?: Worker<ClickIngestionPayload, void, 'click'>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
  ) {}

  onModuleInit() {
    const redisUrl = this.appConfig.redisUrl;
    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL tanımlı değil; click kayıtları senkron yedek modunda.',
      );
      return;
    }

    const parsed = new URL(redisUrl);
    const connection = {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      db: parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : 0,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
      maxRetriesPerRequest: null,
    };
    this.queue = new Queue<ClickIngestionPayload, void, 'click'>(
      'click-ingestion',
      {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 500 },
          removeOnComplete: 1_000,
          removeOnFail: 5_000,
        },
      },
    );
    this.worker = new Worker<ClickIngestionPayload, void, 'click'>(
      'click-ingestion',
      async (job) => {
        await this.persist(job.data);
      },
      {
        connection: { ...connection },
        concurrency: 20,
      },
    );
    this.worker.on('error', (error) => {
      this.logger.error('Click worker hatası', error.stack);
    });
  }

  async enqueue(payload: ClickIngestionPayload): Promise<void> {
    if (this.queue) {
      await this.queue.add('click', payload);
      return;
    }

    await this.persist(payload);
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  private async persist(payload: ClickIngestionPayload) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);

    await this.prisma.$transaction([
      this.prisma.clickEvent.create({ data: payload }),
      this.prisma.dailyLinkStat.upsert({
        where: { linkId_date: { linkId: payload.linkId, date } },
        create: {
          linkId: payload.linkId,
          date,
          totalClicks: 1,
          botClicks: payload.isBot ? 1 : 0,
        },
        update: {
          totalClicks: { increment: 1 },
          botClicks: { increment: payload.isBot ? 1 : 0 },
        },
      }),
    ]);
  }
}
