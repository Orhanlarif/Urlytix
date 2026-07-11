import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
  ) {}

  async create(userId: string, workspaceId: string, dto: CreateApiKeyDto) {
    await this.workspaces.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    const secret = `ur_live_${randomBytes(32).toString('base64url')}`;
    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        workspaceId,
        name: dto.name,
        prefix: secret.slice(0, 16),
        keyHash: createHash('sha256').update(secret).digest('hex'),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    return { apiKey, secret };
  }

  async list(userId: string, workspaceId: string) {
    await this.workspaces.assertMember(userId, workspaceId);
    return this.prisma.apiKey.findMany({
      where: { workspaceId, revokedAt: null },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async revoke(userId: string, workspaceId: string, id: string) {
    await this.workspaces.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    await this.prisma.apiKey.updateMany({
      where: { id, workspaceId },
      data: { revokedAt: new Date() },
    });
    return { message: 'API anahtarı iptal edildi.' };
  }
}
