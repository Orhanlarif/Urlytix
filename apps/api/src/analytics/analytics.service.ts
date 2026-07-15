import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

type GroupedItem = {
  name: string;
  count: number;
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    private readonly workspaces: WorkspacesService,
  ) {}

  async getDashboardOverview(
    userId: string,
    workspaceId: string,
    query: AnalyticsQueryDto,
  ) {
    await this.workspaces.assertMember(userId, workspaceId);

    const startOfToday = this.getStartOfToday();
    const range = this.resolveRange(query);
    const linkScope = { workspaceId };
    const rangeWhere = {
      link: linkScope,
      clickedAt: {
        gte: range.from,
        lte: range.to,
      },
    };

    const [
      totalLinks,
      totalClicks,
      clicksToday,
      topLinkGroups,
      recentClicks,
      deviceGroups,
      referrerGroups,
      brandHostname,
      rangeClicks,
    ] = await Promise.all([
      this.prisma.link.count({
        where: linkScope,
      }),

      this.prisma.clickEvent.count({
        where: {
          link: linkScope,
        },
      }),

      this.prisma.clickEvent.count({
        where: {
          link: linkScope,
          clickedAt: {
            gte: startOfToday,
          },
        },
      }),

      this.prisma.clickEvent.groupBy({
        by: ['linkId'],
        where: rangeWhere,
        _count: { _all: true },
        orderBy: {
          _count: {
            linkId: 'desc',
          },
        },
        take: 5,
      }),

      this.prisma.clickEvent.findMany({
        where: rangeWhere,
        orderBy: {
          clickedAt: 'desc',
        },
        take: 10,
        select: {
          id: true,
          clickedAt: true,
          country: true,
          city: true,
          deviceType: true,
          browser: true,
          os: true,
          referrer: true,
          isBot: true,
          link: {
            select: {
              id: true,
              title: true,
              shortCode: true,
              originalUrl: true,
            },
          },
        },
      }),

      this.prisma.clickEvent.groupBy({
        by: ['deviceType'],
        where: rangeWhere,
        _count: { _all: true },
      }),

      this.prisma.clickEvent.groupBy({
        by: ['referrer'],
        where: rangeWhere,
        _count: { _all: true },
      }),

      this.resolveBrandHostname(workspaceId),

      this.prisma.clickEvent.findMany({
        where: rangeWhere,
        select: {
          clickedAt: true,
        },
        orderBy: {
          clickedAt: 'asc',
        },
      }),
    ]);

    const topLinkIds = topLinkGroups.map((group) => group.linkId);
    const topLinks =
      topLinkIds.length === 0
        ? []
        : await this.prisma.link.findMany({
            where: {
              workspaceId,
              id: { in: topLinkIds },
            },
            select: {
              id: true,
              title: true,
              originalUrl: true,
              shortCode: true,
              createdAt: true,
            },
          });

    const topLinkCountById = new Map(
      topLinkGroups.map((group) => [
        group.linkId,
        typeof group._count === 'object' &&
        group._count &&
        '_all' in group._count
          ? (group._count._all ?? 0)
          : 0,
      ]),
    );

    const dailyClicks = this.buildDailyClicks(
      rangeClicks,
      range.days,
      range.to,
    );

    return {
      totalLinks,
      totalClicks,
      clicksToday,
      dailyClicks,
      topLinks: topLinkIds
        .map((id) => topLinks.find((link) => link.id === id))
        .filter((link): link is NonNullable<typeof link> => Boolean(link))
        .map((link) => ({
          id: link.id,
          title: link.title,
          originalUrl: link.originalUrl,
          shortCode: link.shortCode,
          shortUrl: this.appConfig.buildShortUrl(link.shortCode, brandHostname),
          totalClicks: topLinkCountById.get(link.id) ?? 0,
          createdAt: link.createdAt,
        })),
      recentClicks,
      deviceStats: this.mapGroups(deviceGroups, 'deviceType'),
      referrerStats: referrerGroups
        .map((group) => ({
          name: this.normalizeReferrer(group.referrer),
          count: group._count._all,
        }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async getLinkAnalytics(
    userId: string,
    linkId: string,
    query: AnalyticsQueryDto,
  ) {
    const link = await this.prisma.link.findUnique({
      where: {
        id: linkId,
      },
      include: {
        _count: {
          select: {
            clickEvents: true,
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Link bulunamadı.');
    }

    if (!link.workspaceId) {
      throw new ForbiddenException('Bu link bir workspace’e bağlı değil.');
    }
    await this.workspaces.assertMember(userId, link.workspaceId);

    const range = this.resolveRange(query);
    const where = {
      linkId,
      clickedAt: { gte: range.from, lte: range.to },
    };
    const brandHostname = await this.resolveBrandHostname(link.workspaceId);

    const [
      rangeClicks,
      recentClicks,
      uniqueVisitorGroups,
      deviceGroups,
      browserGroups,
      osGroups,
      referrerGroups,
      countryGroups,
      cityGroups,
      utmSourceGroups,
      utmMediumGroups,
      utmCampaignGroups,
      botClicks,
      humanClicks,
    ] = await Promise.all([
      this.prisma.clickEvent.findMany({
        where,
        select: {
          clickedAt: true,
        },
        orderBy: {
          clickedAt: 'asc',
        },
      }),

      this.prisma.clickEvent.findMany({
        where,
        orderBy: {
          clickedAt: 'desc',
        },
        take: 20,
        select: {
          id: true,
          clickedAt: true,
          country: true,
          city: true,
          deviceType: true,
          browser: true,
          os: true,
          referrer: true,
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
          isBot: true,
        },
      }),

      this.prisma.clickEvent.groupBy({
        by: ['visitorId'],
        where: {
          ...where,
          visitorId: {
            not: null,
          },
          isBot: false,
        },
      }),
      this.prisma.clickEvent.groupBy({
        by: ['deviceType'],
        where,
        _count: { _all: true },
      }),
      this.prisma.clickEvent.groupBy({
        by: ['browser'],
        where,
        _count: { _all: true },
      }),
      this.prisma.clickEvent.groupBy({
        by: ['os'],
        where,
        _count: { _all: true },
      }),
      this.prisma.clickEvent.groupBy({
        by: ['referrer'],
        where,
        _count: { _all: true },
      }),
      this.prisma.clickEvent.groupBy({
        by: ['country'],
        where,
        _count: { _all: true },
      }),
      this.prisma.clickEvent.groupBy({
        by: ['city'],
        where,
        _count: { _all: true },
      }),
      this.prisma.clickEvent.groupBy({
        by: ['utmSource'],
        where,
        _count: { _all: true },
      }),
      this.prisma.clickEvent.groupBy({
        by: ['utmMedium'],
        where,
        _count: { _all: true },
      }),
      this.prisma.clickEvent.groupBy({
        by: ['utmCampaign'],
        where,
        _count: { _all: true },
      }),
      this.prisma.clickEvent.count({ where: { ...where, isBot: true } }),
      this.prisma.clickEvent.count({ where: { ...where, isBot: false } }),
    ]);

    return {
      link: {
        id: link.id,
        title: link.title,
        originalUrl: link.originalUrl,
        shortCode: link.shortCode,
        shortUrl: this.appConfig.buildShortUrl(link.shortCode, brandHostname),
        status: link.status,
        expiresAt: link.expiresAt,
        hasPassword: Boolean(link.passwordHash),
        totalClicks: link._count.clickEvents,
        createdAt: link.createdAt,
      },
      uniqueVisitors: uniqueVisitorGroups.length,
      dailyClicks: this.buildDailyClicks(rangeClicks, range.days, range.to),
      deviceStats: this.mapGroups(deviceGroups, 'deviceType'),
      browserStats: this.mapGroups(browserGroups, 'browser'),
      osStats: this.mapGroups(osGroups, 'os'),
      referrerStats: referrerGroups
        .map((group) => ({
          name: this.normalizeReferrer(group.referrer),
          count: group._count._all,
        }))
        .sort((a, b) => b.count - a.count),
      geoStats: {
        countries: this.mapGroups(countryGroups, 'country'),
        cities: this.mapGroups(cityGroups, 'city'),
      },
      utmStats: {
        sources: this.mapGroups(utmSourceGroups, 'utmSource'),
        mediums: this.mapGroups(utmMediumGroups, 'utmMedium'),
        campaigns: this.mapGroups(utmCampaignGroups, 'utmCampaign'),
      },
      utmSourceStats: this.mapGroups(utmSourceGroups, 'utmSource'),
      botStats: {
        botClicks,
        humanClicks,
      },
      recentClicks,
    };
  }

  private async resolveBrandHostname(workspaceId?: string | null) {
    if (!workspaceId) {
      return null;
    }

    const domain = await this.prisma.domain.findFirst({
      where: {
        workspaceId,
        verifiedAt: { not: null },
      },
      orderBy: { verifiedAt: 'asc' },
      select: { hostname: true },
    });

    return domain?.hostname ?? null;
  }

  private mapGroups<K extends string>(
    groups: Array<Record<K, string | null> & { _count: { _all: number } }>,
    key: K,
  ): GroupedItem[] {
    return groups
      .map((group) => ({
        name: group[key]?.trim() || 'Unknown',
        count: group._count._all,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private normalizeReferrer(referrer: string | null) {
    if (!referrer) {
      return 'Direct';
    }

    try {
      const url = new URL(referrer);
      return url.hostname.replace('www.', '');
    } catch {
      return referrer;
    }
  }

  private buildDailyClicks(
    clicks: Array<{
      clickedAt: Date;
    }>,
    days: number,
    endDate = new Date(),
  ) {
    const result: Array<{
      date: string;
      clicks: number;
    }> = [];

    const map = new Map<string, number>();

    for (const click of clicks) {
      const key = click.clickedAt.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    }

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);

      result.push({
        date: key,
        clicks: map.get(key) ?? 0,
      });
    }

    return result;
  }

  private getStartOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private getDaysAgo(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private resolveRange(query: AnalyticsQueryDto) {
    const to = query.to ? new Date(query.to) : new Date();
    to.setHours(23, 59, 59, 999);
    const from = query.from ? new Date(query.from) : new Date(to);
    if (!query.from) {
      from.setDate(from.getDate() - (query.days - 1));
    }
    from.setHours(0, 0, 0, 0);
    const days = Math.min(
      365,
      Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000) + 1),
    );
    return { from, to, days };
  }
}
