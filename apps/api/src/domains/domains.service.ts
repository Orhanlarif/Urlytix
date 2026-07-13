import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { resolveTxt } from 'dns/promises';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateDomainDto } from './dto/create-domain.dto';

@Injectable()
export class DomainsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
  ) {}

  async create(userId: string, workspaceId: string, dto: CreateDomainDto) {
    await this.workspaces.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    const hostname = dto.hostname.trim().toLowerCase();
    const existing = await this.prisma.domain.findUnique({
      where: { hostname },
    });
    if (existing) {
      throw new ConflictException('Bu alan adı zaten kayıtlı.');
    }

    return this.prisma.domain.create({
      data: {
        workspaceId,
        hostname,
        verificationToken: randomBytes(24).toString('hex'),
      },
    });
  }

  async list(userId: string, workspaceId: string) {
    await this.workspaces.assertMember(userId, workspaceId);
    return this.prisma.domain.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verify(userId: string, workspaceId: string, domainId: string) {
    await this.workspaces.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    const domain = await this.getOwnedDomain(workspaceId, domainId);
    let records: string[][] = [];
    try {
      records = await resolveTxt(`_urlytix-verification.${domain.hostname}`);
    } catch {
      records = [];
    }
    const values = records.map((record) => record.join(''));

    if (!values.includes(domain.verificationToken)) {
      return {
        verified: false,
        record: `_urlytix-verification.${domain.hostname}`,
        expectedValue: domain.verificationToken,
      };
    }

    const verified = await this.prisma.domain.update({
      where: { id: domain.id },
      data: { verifiedAt: new Date() },
    });
    return { verified: true, domain: verified };
  }

  async remove(userId: string, workspaceId: string, domainId: string) {
    await this.workspaces.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    await this.getOwnedDomain(workspaceId, domainId);
    await this.prisma.domain.delete({ where: { id: domainId } });
    return { deletedDomainId: domainId };
  }

  private async getOwnedDomain(workspaceId: string, domainId: string) {
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, workspaceId },
    });
    if (!domain) {
      throw new NotFoundException('Alan adı bulunamadı.');
    }
    return domain;
  }
}
