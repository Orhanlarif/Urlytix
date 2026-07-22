import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformAdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(PlatformAdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
  ) {}

  async onModuleInit() {
    const emails = this.appConfig.platformAdminEmails;
    if (emails.length === 0) return;

    let promoted = 0;
    for (const email of emails) {
      const result = await this.prisma.user.updateMany({
        where: {
          email: { equals: email, mode: 'insensitive' },
          platformRole: { not: 'SUPER_ADMIN' },
        },
        data: { platformRole: 'SUPER_ADMIN' },
      });
      promoted += result.count;
    }

    if (promoted > 0) {
      this.logger.log(
        `Promoted ${promoted} user(s) to SUPER_ADMIN from PLATFORM_ADMIN_EMAILS.`,
      );
    }
  }
}
