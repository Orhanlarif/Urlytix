import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import type { Request } from 'express';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { LinkRedirectException } from './redirect-error.page';

type LinkStatus = 'ACTIVE' | 'DISABLED' | 'EXPIRED';

type LinkRecord = {
  id: string;
  originalUrl: string;
  shortCode: string;
  title: string | null;
  status: LinkStatus;
  expiresAt: Date | null;
  createdAt: Date;
};

const VISITOR_COOKIE = 'urlytics_vid';
const VISITOR_COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

@Injectable()
export class LinksService {
  private readonly logger = new Logger(LinksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
  ) {}

  async createLink(userId: string, createLinkDto: CreateLinkDto) {
    const shortCode = createLinkDto.customAlias
      ? createLinkDto.customAlias
      : await this.generateUniqueShortCode();

    const existingLink = await this.prisma.link.findUnique({
      where: {
        shortCode,
      },
    });

    if (existingLink) {
      throw new ConflictException('Bu kısa link zaten kullanılıyor.');
    }

    const expiresAt = this.parseFutureExpiration(createLinkDto.expiresAt);

    const link = await this.prisma.link.create({
      data: {
        userId,
        originalUrl: createLinkDto.originalUrl,
        title: createLinkDto.title,
        shortCode,
        expiresAt,
      },
      select: this.linkSelectFields(),
    });

    return {
      message: 'Link oluşturuldu.',
      link: this.formatLink(link, 0),
    };
  }

  async updateLink(
    userId: string,
    linkId: string,
    updateLinkDto: UpdateLinkDto,
  ) {
    const link = await this.findOwnedLink(linkId, userId);

    const data: {
      originalUrl?: string;
      title?: string;
      expiresAt?: Date | null;
      status?: LinkStatus;
    } = {};

    if (updateLinkDto.originalUrl !== undefined) {
      data.originalUrl = updateLinkDto.originalUrl;
    }

    if (updateLinkDto.title !== undefined) {
      data.title = updateLinkDto.title;
    }

    if (updateLinkDto.expiresAt !== undefined) {
      data.expiresAt =
        updateLinkDto.expiresAt === null
          ? null
          : this.parseFutureExpiration(updateLinkDto.expiresAt);

      if (
        data.expiresAt &&
        link.status === 'EXPIRED' &&
        data.expiresAt > new Date()
      ) {
        data.status = 'ACTIVE';
      }
    }

    const updatedLink = await this.prisma.link.update({
      where: {
        id: linkId,
      },
      data,
      select: {
        ...this.linkSelectFields(),
        _count: {
          select: {
            clickEvents: true,
          },
        },
      },
    });

    return {
      message: 'Link güncellendi.',
      link: this.formatLink(updatedLink, updatedLink._count.clickEvents),
    };
  }

  async getUserLinks(userId: string) {
    const links = await this.prisma.link.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        ...this.linkSelectFields(),
        _count: {
          select: {
            clickEvents: true,
          },
        },
      },
    });

    return links.map((link) => this.formatLink(link, link._count.clickEvents));
  }

  async getUserLinkById(userId: string, linkId: string) {
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
      throw new ForbiddenException('Bu linke erişim yetkin yok.');
    }

    return this.formatLink(link, link._count.clickEvents);
  }

  async updateLinkStatus(userId: string, linkId: string, status: LinkStatus) {
    const link = await this.findOwnedLink(linkId, userId);

    if (status === 'ACTIVE') {
      if (this.isExpired(link)) {
        throw new BadRequestException(
          'Süresi dolmuş bir linki aktif edemezsin. Önce bitiş tarihini güncelle.',
        );
      }
    }

    const updatedLink = await this.prisma.link.update({
      where: {
        id: linkId,
      },
      data: {
        status,
      },
      select: {
        ...this.linkSelectFields(),
        _count: {
          select: {
            clickEvents: true,
          },
        },
      },
    });

    return {
      message: 'Link durumu güncellendi.',
      link: this.formatLink(updatedLink, updatedLink._count.clickEvents),
    };
  }

  async deleteLink(userId: string, linkId: string) {
    await this.findOwnedLink(linkId, userId);

    await this.prisma.link.delete({
      where: {
        id: linkId,
      },
    });

    return {
      message: 'Link silindi.',
      deletedLinkId: linkId,
    };
  }

  async handleRedirect(shortCode: string, request: Request) {
    const link = await this.prisma.link.findUnique({
      where: {
        shortCode,
      },
    });

    if (!link) {
      throw new LinkRedirectException(
        'not_found',
        'Kısa link bulunamadı.',
        404,
      );
    }

    if (this.isExpired(link)) {
      if (link.status === 'ACTIVE') {
        await this.prisma.link.update({
          where: { id: link.id },
          data: { status: 'EXPIRED' },
        });
      }

      throw new LinkRedirectException(
        'expired',
        'Bu linkin süresi dolmuş.',
        410,
      );
    }

    if (link.status !== 'ACTIVE') {
      throw new LinkRedirectException('inactive', 'Bu link aktif değil.', 403);
    }

    const { visitorId, isNew } = this.resolveVisitorId(request);

    try {
      await this.trackClick(link.id, request, visitorId);
    } catch (error) {
      this.logger.error(
        `Click tracking failed for link ${link.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return {
      originalUrl: link.originalUrl,
      visitorId,
      isNewVisitor: isNew,
    };
  }

  getVisitorCookieOptions(isProduction: boolean) {
    return {
      maxAge: VISITOR_COOKIE_MAX_AGE_MS,
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: isProduction,
    };
  }

  getVisitorCookieName() {
    return VISITOR_COOKIE;
  }

  private async findOwnedLink(linkId: string, userId: string) {
    const link = await this.prisma.link.findUnique({
      where: {
        id: linkId,
      },
    });

    if (!link) {
      throw new NotFoundException('Link bulunamadı.');
    }

    if (link.userId !== userId) {
      throw new ForbiddenException('Bu linki güncelleme yetkin yok.');
    }

    return link;
  }

  private linkSelectFields() {
    return {
      id: true,
      originalUrl: true,
      shortCode: true,
      title: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    } as const;
  }

  private formatLink(link: LinkRecord, totalClicks: number) {
    return {
      id: link.id,
      originalUrl: link.originalUrl,
      shortCode: link.shortCode,
      shortUrl: this.appConfig.buildShortUrl(link.shortCode),
      title: link.title,
      status: link.status,
      expiresAt: link.expiresAt,
      totalClicks,
      createdAt: link.createdAt,
    };
  }

  private parseFutureExpiration(value?: string | null) {
    if (!value) {
      return null;
    }

    const expiresAt = new Date(value);

    if (Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('Geçerli bir bitiş tarihi gir.');
    }

    if (expiresAt <= new Date()) {
      throw new BadRequestException('Bitiş tarihi gelecekte olmalı.');
    }

    return expiresAt;
  }

  private isExpired(link: { expiresAt: Date | null }) {
    return Boolean(link.expiresAt && link.expiresAt <= new Date());
  }

  private resolveVisitorId(request: Request) {
    const cookies = request.cookies as
      Record<string, string | undefined> | undefined;
    const existing = cookies?.[VISITOR_COOKIE];

    if (typeof existing === 'string' && existing.trim().length > 0) {
      return {
        visitorId: existing,
        isNew: false,
      };
    }

    return {
      visitorId: randomUUID(),
      isNew: true,
    };
  }

  private async trackClick(
    linkId: string,
    request: Request,
    visitorId: string,
  ) {
    const ip = this.getClientIp(request);
    const userAgent = request.headers['user-agent'] ?? '';
    const referrer = request.headers.referer ?? request.headers.referrer;
    const query = request.query;

    const parsedDevice = this.parseUserAgent(String(userAgent));

    await this.prisma.clickEvent.create({
      data: {
        linkId,
        visitorId,
        ipHash: ip ? this.hashIp(ip) : null,
        referrer: typeof referrer === 'string' ? referrer : null,
        utmSource: this.getQueryValue(query.utm_source),
        utmMedium: this.getQueryValue(query.utm_medium),
        utmCampaign: this.getQueryValue(query.utm_campaign),
        deviceType: parsedDevice.deviceType,
        browser: parsedDevice.browser,
        os: parsedDevice.os,
        isBot: parsedDevice.isBot,
      },
    });
  }

  private async generateUniqueShortCode() {
    for (let i = 0; i < 10; i++) {
      const code = this.generateShortCode();

      const existingLink = await this.prisma.link.findUnique({
        where: {
          shortCode: code,
        },
      });

      if (!existingLink) {
        return code;
      }
    }

    throw new ConflictException('Kısa link üretilemedi. Tekrar dene.');
  }

  private generateShortCode(length = 7) {
    const alphabet =
      '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    const bytes = randomBytes(length);
    let code = '';

    for (let i = 0; i < length; i++) {
      code += alphabet[bytes[i] % alphabet.length];
    }

    return code;
  }

  private getClientIp(request: Request) {
    const forwardedFor = request.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0].trim();
    }

    return request.ip;
  }

  private hashIp(ip: string) {
    return createHash('sha256').update(ip).digest('hex');
  }

  private getQueryValue(value: unknown) {
    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0];
    }

    return null;
  }

  private parseUserAgent(userAgent: string) {
    const lowerUserAgent = userAgent.toLowerCase();

    const isBot =
      lowerUserAgent.includes('bot') ||
      lowerUserAgent.includes('crawler') ||
      lowerUserAgent.includes('spider') ||
      lowerUserAgent.includes('preview');

    let deviceType: 'DESKTOP' | 'MOBILE' | 'TABLET' | 'BOT' | 'UNKNOWN' =
      'UNKNOWN';

    if (isBot) {
      deviceType = 'BOT';
    } else if (
      lowerUserAgent.includes('tablet') ||
      lowerUserAgent.includes('ipad')
    ) {
      deviceType = 'TABLET';
    } else if (
      lowerUserAgent.includes('mobile') ||
      lowerUserAgent.includes('android') ||
      lowerUserAgent.includes('iphone')
    ) {
      deviceType = 'MOBILE';
    } else if (userAgent) {
      deviceType = 'DESKTOP';
    }

    let browser = 'Unknown';

    if (lowerUserAgent.includes('edg')) {
      browser = 'Edge';
    } else if (lowerUserAgent.includes('chrome')) {
      browser = 'Chrome';
    } else if (lowerUserAgent.includes('firefox')) {
      browser = 'Firefox';
    } else if (lowerUserAgent.includes('safari')) {
      browser = 'Safari';
    }

    let os = 'Unknown';

    if (lowerUserAgent.includes('windows')) {
      os = 'Windows';
    } else if (lowerUserAgent.includes('mac os')) {
      os = 'macOS';
    } else if (lowerUserAgent.includes('android')) {
      os = 'Android';
    } else if (
      lowerUserAgent.includes('iphone') ||
      lowerUserAgent.includes('ipad')
    ) {
      os = 'iOS';
    } else if (lowerUserAgent.includes('linux')) {
      os = 'Linux';
    }

    return {
      deviceType,
      browser,
      os,
      isBot,
    };
  }
}
