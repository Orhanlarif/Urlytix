import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddMemberDto,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
} from './dto/workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateWorkspaceDto) {
    return this.prisma.workspace.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        memberships: { create: { userId, role: 'OWNER' } },
      },
      include: { memberships: true },
    });
  }

  list(userId: string) {
    return this.prisma.workspace.findMany({
      where: { memberships: { some: { userId } } },
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { links: true, memberships: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(userId: string, workspaceId: string) {
    await this.assertMember(userId, workspaceId);
    return this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        memberships: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        subscription: { include: { plan: true } },
      },
    });
  }

  async update(userId: string, workspaceId: string, dto: UpdateWorkspaceDto) {
    await this.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: dto,
    });
  }

  async addMember(userId: string, workspaceId: string, dto: AddMemberDto) {
    await this.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }
    return this.prisma.membership.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
      create: { userId: user.id, workspaceId, role: dto.role },
      update: { role: dto.role },
    });
  }

  async assertMember(userId: string, workspaceId: string) {
    return this.assertRole(userId, workspaceId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
      'VIEWER',
    ]);
  }

  async assertRole(
    userId: string,
    workspaceId: string,
    roles: Array<'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'>,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership || !roles.includes(membership.role)) {
      throw new ForbiddenException('Workspace erişim yetkin yok.');
    }
    return membership;
  }
}
