import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';

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
    });
    return { webhook, secret };
  }

  async list(userId: string, workspaceId: string) {
    await this.workspaces.assertMember(userId, workspaceId);
    return this.prisma.webhook.findMany({ where: { workspaceId } });
  }

  async update(
    userId: string,
    workspaceId: string,
    id: string,
    dto: UpdateWebhookDto,
  ) {
    await this.workspaces.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    return this.prisma.webhook.update({
      where: { id, workspaceId },
      data: dto,
    });
  }

  async remove(userId: string, workspaceId: string, id: string) {
    await this.workspaces.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    await this.prisma.webhook.delete({ where: { id, workspaceId } });
    return { message: 'Webhook silindi.' };
  }
}
