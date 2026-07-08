import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';

type GroupedItem = {
  name: string;
  count: number;
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
  ) {}

  async getDashboardOverview(userId: string) {
    const startOfToday = this.getStartOfToday();
    const last14DaysStart = this.getDaysAgo(13);

    const [totalLinks, totalClicks, clicksToday, topLinks, recentClicks] =
      await Promise.all([
        this.prisma.link.count({
          where: {
            userId,
          },
        }),

        this.prisma.clickEvent.count({
          where: {
            link: {
              userId,
            },
          },
        }),

        this.prisma.clickEvent.count({
          where: {
            link: {
              userId,
            },
            clickedAt: {
              gte: startOfToday,
            },
          },
        }),

        this.prisma.link.findMany({
          where: {
            userId,
          },
          orderBy: {
            clickEvents: {
              _count: 'desc',
            },
          },
          take: 5,
          select: {
            id: true,
            title: true,
            originalUrl: true,
            shortCode: true,
            createdAt: true,
            _count: {
              select: {
                clickEvents: true,
              },
            },
          },
        }),

        this.prisma.clickEvent.findMany({
          where: {
            link: {
              userId,
            },
          },
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
      ]);

    const last14DaysClicks = await this.prisma.clickEvent.findMany({
      where: {
        link: {
          userId,
        },
        clickedAt: {
          gte: last14DaysStart,
        },
      },
      select: {
        clickedAt: true,
      },
      orderBy: {
        clickedAt: 'asc',
      },
    });

    const dailyClicks = this.buildDailyClicks(last14DaysClicks, 14);

    return {
      totalLinks,
      totalClicks,
      clicksToday,
      dailyClicks,
      topLinks: topLinks.map((link) => ({
        id: link.id,
        title: link.title,
        originalUrl: link.originalUrl,
        shortCode: link.shortCode,
        shortUrl: this.appConfig.buildShortUrl(link.shortCode),
        totalClicks: link._count.clickEvents,
        createdAt: link.createdAt,
      })),
      recentClicks,
    };
  }

  async getLinkAnalytics(userId: string, linkId: string) {
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

    if (link.userId !== userId) {
      throw new ForbiddenException(
        'Bu linkin analytics verisine erişim yetkin yok.',
      );
    }

    const last14DaysStart = this.getDaysAgo(13);

    const [allClicks, last14DaysClicks, recentClicks, uniqueVisitorGroups] =
      await Promise.all([
        this.prisma.clickEvent.findMany({
          where: {
            linkId,
          },
          select: {
            deviceType: true,
            browser: true,
            os: true,
            referrer: true,
            utmSource: true,
            utmMedium: true,
            utmCampaign: true,
            isBot: true,
            clickedAt: true,
            country: true,
            city: true,
          },
        }),

        this.prisma.clickEvent.findMany({
          where: {
            linkId,
            clickedAt: {
              gte: last14DaysStart,
            },
          },
          select: {
            clickedAt: true,
          },
          orderBy: {
            clickedAt: 'asc',
          },
        }),

        this.prisma.clickEvent.findMany({
          where: {
            linkId,
          },
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
            linkId,
            visitorId: {
              not: null,
            },
            isBot: false,
          },
        }),
      ]);

    return {
      link: {
        id: link.id,
        title: link.title,
        originalUrl: link.originalUrl,
        shortCode: link.shortCode,
        shortUrl: this.appConfig.buildShortUrl(link.shortCode),
        status: link.status,
        expiresAt: link.expiresAt,
        totalClicks: link._count.clickEvents,
        createdAt: link.createdAt,
      },
      uniqueVisitors: uniqueVisitorGroups.length,
      dailyClicks: this.buildDailyClicks(last14DaysClicks, 14),
      deviceStats: this.groupByValue(
        allClicks.map((click) => click.deviceType),
      ),
      browserStats: this.groupByValue(allClicks.map((click) => click.browser)),
      osStats: this.groupByValue(allClicks.map((click) => click.os)),
      referrerStats: this.groupByValue(
        allClicks.map((click) => this.normalizeReferrer(click.referrer)),
      ),
      utmSourceStats: this.groupByValue(
        allClicks.map((click) => click.utmSource),
      ),
      botStats: {
        botClicks: allClicks.filter((click) => click.isBot).length,
        humanClicks: allClicks.filter((click) => !click.isBot).length,
      },
      recentClicks,
    };
  }

  private groupByValue(values: Array<string | null>): GroupedItem[] {
    const result = new Map<string, number>();

    for (const value of values) {
      const key = value && value.trim().length > 0 ? value : 'Unknown';
      result.set(key, (result.get(key) ?? 0) + 1);
    }

    return Array.from(result.entries())
      .map(([name, count]) => ({
        name,
        count,
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
      const date = this.getDaysAgo(i);
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
}
