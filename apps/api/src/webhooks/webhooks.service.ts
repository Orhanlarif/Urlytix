import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';

const webhookPublicSelect = {
  id: true,
  workspaceId: true,
  url: true,
  events: true,
  active: true,
  lastSentAt: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
  ) {}

  async create(userId: string, workspaceId: string, dto: CreateWebhookDto) {
    await this.workspaces.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    const secret = randomBytes(32).toString('base64url');
    const webhook = await this.prisma.webhook.create({
      data: {
        workspaceId,
        url: dto.url,
        events: dto.events,
        secretHash: createHash('sha256').update(secret).digest('hex'),
      },
      select: webhookPublicSelect,
    });
    return { webhook, secret };
  }

  async list(userId: string, workspaceId: string) {
    await this.workspaces.assertMember(userId, workspaceId);
    return this.prisma.webhook.findMany({
      where: { workspaceId },
      select: webhookPublicSelect,
    });
  }

  async update(
    userId: string,
    workspaceId: string,
    id: string,
    dto: UpdateWebhookDto,
  ) {
    await this.workspaces.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    const result = await this.prisma.webhook.updateMany({
      where: { id, workspaceId },
      data: dto,
    });
    if (result.count === 0) {
      throw new NotFoundException('Webhook bulunamadı.');
    }
    return this.prisma.webhook.findUniqueOrThrow({
      where: { id },
      select: webhookPublicSelect,
    });
  }

  async remove(userId: string, workspaceId: string, id: string) {
    await this.workspaces.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    const result = await this.prisma.webhook.deleteMany({
      where: { id, workspaceId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Webhook bulunamadı.');
    }
    return { message: 'Webhook silindi.' };
  }
}
