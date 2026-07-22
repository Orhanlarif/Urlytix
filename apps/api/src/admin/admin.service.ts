import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ListAdminUsersQueryDto,
  UpdateAdminUserDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const [
      totalUsers,
      disabledUsers,
      totalWorkspaces,
      totalLinks,
      totalClicks,
      clicksToday,
      recentUsers,
      dailySignupsRaw,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { disabledAt: { not: null } } }),
      this.prisma.workspace.count(),
      this.prisma.link.count(),
      this.prisma.clickEvent.count(),
      this.prisma.clickEvent.count({
        where: { clickedAt: { gte: startOfToday } },
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          platformRole: true,
          disabledAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
    ]);

    const dailySignupsMap = new Map<string, number>();
    for (const row of dailySignupsRaw) {
      const key = row.createdAt.toISOString().slice(0, 10);
      dailySignupsMap.set(key, (dailySignupsMap.get(key) ?? 0) + 1);
    }

    const dailySignups: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(sevenDaysAgo);
      date.setUTCDate(sevenDaysAgo.getUTCDate() + i);
      const key = date.toISOString().slice(0, 10);
      dailySignups.push({ date: key, count: dailySignupsMap.get(key) ?? 0 });
    }

    return {
      totalUsers,
      activeUsers: totalUsers - disabledUsers,
      disabledUsers,
      totalWorkspaces,
      totalLinks,
      totalClicks,
      clicksToday,
      dailySignups,
      recentUsers: recentUsers.map((user) => this.toAdminUserSummary(user)),
    };
  }

  async listUsers(query: ListAdminUsersQueryDto) {
    const page = query.page;
    const pageSize = query.pageSize;
    const q = query.q?.trim();

    const where: Prisma.UserWhereInput = {};

    if (query.status === 'active') {
      where.disabledAt = null;
    } else if (query.status === 'disabled') {
      where.disabledAt = { not: null };
    }

    if (q) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          platformRole: true,
          disabledAt: true,
          createdAt: true,
          totpEnabledAt: true,
          _count: {
            select: {
              memberships: true,
              links: true,
              refreshSessions: true,
            },
          },
        },
      }),
    ]);

    return {
      data: users.map((user) => ({
        ...this.toAdminUserSummary(user),
        totpEnabled: Boolean(user.totpEnabledAt),
        membershipCount: user._count.memberships,
        linkCount: user._count.links,
        sessionCount: user._count.refreshSessions,
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        timezone: true,
        locale: true,
        platformRole: true,
        disabledAt: true,
        createdAt: true,
        updatedAt: true,
        totpEnabledAt: true,
        memberships: {
          select: {
            id: true,
            role: true,
            createdAt: true,
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            links: true,
            refreshSessions: true,
            apiKeys: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    return {
      ...this.toAdminUserSummary(user),
      timezone: user.timezone,
      locale: user.locale,
      updatedAt: user.updatedAt,
      totpEnabled: Boolean(user.totpEnabledAt),
      linkCount: user._count.links,
      sessionCount: user._count.refreshSessions,
      apiKeyCount: user._count.apiKeys,
      memberships: user.memberships.map((membership) => ({
        id: membership.id,
        role: membership.role,
        createdAt: membership.createdAt,
        workspace: membership.workspace,
      })),
    };
  }

  async updateUser(
    actorId: string,
    userId: string,
    dto: UpdateAdminUserDto,
  ) {
    if (dto.disabled === undefined) {
      throw new BadRequestException('Güncellenecek alan belirtilmedi.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        platformRole: true,
        disabledAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    if (userId === actorId && dto.disabled === true) {
      throw new BadRequestException('Kendi hesabını askıya alamazsın.');
    }

    if (user.platformRole === 'SUPER_ADMIN' && dto.disabled === true) {
      throw new BadRequestException(
        'Platform admin hesabı askıya alınamaz.',
      );
    }

    const disabledAt = dto.disabled ? new Date() : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.user.update({
        where: { id: userId },
        data: { disabledAt },
        select: {
          id: true,
          name: true,
          email: true,
          platformRole: true,
          disabledAt: true,
          createdAt: true,
          totpEnabledAt: true,
        },
      });

      if (dto.disabled) {
        await tx.refreshSession.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return next;
    });

    return {
      ...this.toAdminUserSummary(updated),
      totpEnabled: Boolean(updated.totpEnabledAt),
      message: dto.disabled
        ? 'Kullanıcı askıya alındı ve oturumları kapatıldı.'
        : 'Kullanıcı yeniden aktifleştirildi.',
    };
  }

  async revokeSessions(actorId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    const result = await this.prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return {
      message:
        userId === actorId
          ? 'Tüm oturumlar kapatıldı. Yeniden giriş yapman gerekebilir.'
          : 'Kullanıcının tüm oturumları kapatıldı.',
      revokedCount: result.count,
    };
  }

  private toAdminUserSummary(user: {
    id: string;
    name: string | null;
    email: string;
    platformRole: 'USER' | 'SUPER_ADMIN';
    disabledAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      platformRole: user.platformRole,
      disabled: Boolean(user.disabledAt),
      disabledAt: user.disabledAt,
      createdAt: user.createdAt,
    };
  }
}
