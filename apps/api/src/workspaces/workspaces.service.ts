import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddMemberDto,
  CreateWorkspaceDto,
  UpdateMemberRoleDto,
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

  async remove(
    userId: string,
    workspaceId: string,
    dto: { confirmSlug: string },
  ) {
    await this.assertRole(userId, workspaceId, ['OWNER']);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace bulunamadı.');
    }
    if (workspace.slug !== dto.confirmSlug) {
      throw new BadRequestException(
        'Onay için workspace slug değerini doğru girmeniz gerekir.',
      );
    }

    const ownedCount = await this.prisma.membership.count({
      where: { userId, role: 'OWNER' },
    });
    if (ownedCount <= 1) {
      throw new BadRequestException(
        'Son sahibi olduğunuz workspace silinemez. Önce başka bir workspace oluşturun.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.link.deleteMany({ where: { workspaceId } });
      await tx.workspace.delete({ where: { id: workspaceId } });
    });

    return {
      message: 'Workspace silindi.',
      deletedWorkspaceId: workspaceId,
    };
  }

  async addMember(userId: string, workspaceId: string, dto: AddMemberDto) {
    await this.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }
    if (user.id === userId) {
      throw new BadRequestException('Kendini üye olarak ekleyemezsin.');
    }
    return this.prisma.membership.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
      create: { userId: user.id, workspaceId, role: dto.role },
      update: { role: dto.role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updateMemberRole(
    actorUserId: string,
    workspaceId: string,
    memberUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    await this.assertRole(actorUserId, workspaceId, ['OWNER', 'ADMIN']);
    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: memberUserId, workspaceId } },
    });
    if (!membership) {
      throw new NotFoundException('Üye bulunamadı.');
    }
    if (membership.role === 'OWNER') {
      throw new ForbiddenException('Sahip rolü bu yolla değiştirilemez.');
    }
    if (actorUserId === memberUserId) {
      throw new BadRequestException('Kendi rolünü değiştiremezsin.');
    }

    const actor = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: actorUserId, workspaceId } },
    });
    if (actor?.role === 'ADMIN' && membership.role === 'ADMIN') {
      throw new ForbiddenException(
        'Admin başka bir adminin rolünü değiştiremez.',
      );
    }

    return this.prisma.membership.update({
      where: { userId_workspaceId: { userId: memberUserId, workspaceId } },
      data: { role: dto.role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async removeMember(
    actorUserId: string,
    workspaceId: string,
    memberUserId: string,
  ) {
    await this.assertRole(actorUserId, workspaceId, ['OWNER', 'ADMIN']);
    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: memberUserId, workspaceId } },
    });
    if (!membership) {
      throw new NotFoundException('Üye bulunamadı.');
    }
    if (membership.role === 'OWNER') {
      throw new ForbiddenException('Workspace sahibi kaldırılamaz.');
    }
    if (actorUserId === memberUserId) {
      throw new BadRequestException(
        'Kendini bu yolla çıkaramazsın. Ayrı bir ayrılma akışı kullan.',
      );
    }

    const actor = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: actorUserId, workspaceId } },
    });
    if (actor?.role === 'ADMIN' && membership.role === 'ADMIN') {
      throw new ForbiddenException('Admin başka bir admini kaldıramaz.');
    }

    await this.prisma.membership.delete({
      where: { userId_workspaceId: { userId: memberUserId, workspaceId } },
    });

    return {
      message: 'Üye kaldırıldı.',
      removedUserId: memberUserId,
    };
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
