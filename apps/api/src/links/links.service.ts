import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, createHmac, randomBytes, randomUUID } from 'crypto';
import { lookup } from 'dns/promises';
import type { Request } from 'express';
import { isIP } from 'net';
import * as bcrypt from 'bcryptjs';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { ListLinksQueryDto } from './dto/list-links-query.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { ClickIngestionService } from './click-ingestion.service';
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
  workspaceId?: string | null;
  passwordHash?: string | null;
};

const VISITOR_COOKIE = 'urlytics_vid';
const VISITOR_COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const LINK_PASSWORD_COOKIE_PREFIX = 'urlytics_lp_';
const LINK_PASSWORD_COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const LINK_WRITE_ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const;

@Injectable()
export class LinksService {
  private readonly logger = new Logger(LinksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    private readonly clickIngestion: ClickIngestionService,
    private readonly workspaces: WorkspacesService,
  ) {}

  async createLink(userId: string, createLinkDto: CreateLinkDto) {
    await this.workspaces.assertRole(userId, createLinkDto.workspaceId, [
      ...LINK_WRITE_ROLES,
    ]);
    await this.validateDestinationUrl(createLinkDto.originalUrl);
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
    const passwordHash = createLinkDto.password
      ? await bcrypt.hash(createLinkDto.password, 10)
      : null;

    const link = await this.prisma.link.create({
      data: {
        userId,
        workspaceId: createLinkDto.workspaceId,
        originalUrl: createLinkDto.originalUrl,
        title: createLinkDto.title,
        shortCode,
        expiresAt,
        passwordHash,
      },
      select: this.linkSelectFields(),
    });

    const brandHostname = await this.resolveBrandHostname(
      createLinkDto.workspaceId,
    );

    return {
      message: 'Link oluşturuldu.',
      link: this.formatLink(link, 0, brandHostname),
    };
  }

  async updateLink(
    userId: string,
    linkId: string,
    updateLinkDto: UpdateLinkDto,
  ) {
    const link = await this.findAccessibleLink(linkId, userId, true);

    const data: {
      originalUrl?: string;
      title?: string;
      expiresAt?: Date | null;
      status?: LinkStatus;
      passwordHash?: string | null;
    } = {};

    if (updateLinkDto.originalUrl !== undefined) {
      await this.validateDestinationUrl(updateLinkDto.originalUrl);
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

      if (link.status === 'EXPIRED') {
        if (data.expiresAt === null) {
          data.status = 'ACTIVE';
        } else if (data.expiresAt > new Date()) {
          data.status = 'ACTIVE';
        }
      }
    }

    if (updateLinkDto.password !== undefined) {
      data.passwordHash =
        updateLinkDto.password === null
          ? null
          : await bcrypt.hash(updateLinkDto.password, 10);
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

    const brandHostname = await this.resolveBrandHostname(
      updatedLink.workspaceId,
    );

    return {
      message: 'Link güncellendi.',
      link: this.formatLink(
        updatedLink,
        updatedLink._count.clickEvents,
        brandHostname,
      ),
    };
  }

  async getUserLinks(userId: string, query: ListLinksQueryDto) {
    await this.workspaces.assertMember(userId, query.workspaceId);

    const where = {
      workspaceId: query.workspaceId,
      status: query.status,
      ...(query.search
        ? {
            OR: [
              {
                title: { contains: query.search, mode: 'insensitive' as const },
              },
              {
                originalUrl: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                shortCode: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };
    const [links, total, brandHostname] = await Promise.all([
      this.prisma.link.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          ...this.linkSelectFields(),
          _count: {
            select: {
              clickEvents: true,
            },
          },
        },
      }),
      this.prisma.link.count({ where }),
      this.resolveBrandHostname(query.workspaceId),
    ]);

    const expiredIds = links
      .filter((link) => link.status === 'ACTIVE' && this.isExpired(link))
      .map((link) => link.id);
    if (expiredIds.length > 0) {
      await this.prisma.link.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: 'EXPIRED' },
      });
    }

    const items = links.map((link) =>
      this.formatLink(
        {
          ...link,
          status: expiredIds.includes(link.id) ? 'EXPIRED' : link.status,
        },
        link._count.clickEvents,
        brandHostname,
      ),
    );

    return {
      data: items,
      meta: {
        page: query.page,
        pageSize: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getUserLinkById(userId: string, linkId: string) {
    const link = await this.findAccessibleLink(linkId, userId);
    const [clickCount, brandHostname] = await Promise.all([
      this.prisma.clickEvent.count({
        where: { linkId },
      }),
      this.resolveBrandHostname(link.workspaceId),
    ]);

    return this.formatLink(link, clickCount, brandHostname);
  }

  async updateLinkStatus(userId: string, linkId: string, status: LinkStatus) {
    const link = await this.findAccessibleLink(linkId, userId, true);

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

    const brandHostname = await this.resolveBrandHostname(
      updatedLink.workspaceId,
    );

    return {
      message: 'Link durumu güncellendi.',
      link: this.formatLink(
        updatedLink,
        updatedLink._count.clickEvents,
        brandHostname,
      ),
    };
  }

  async deleteLink(userId: string, linkId: string) {
    await this.findAccessibleLink(linkId, userId, true);

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
    const hostname = this.getRequestHostname(request);
    const customDomain = await this.resolveVerifiedDomain(hostname);

    if (
      hostname &&
      !this.appConfig.isPlatformHostname(hostname) &&
      !customDomain
    ) {
      throw new LinkRedirectException(
        'not_found',
        'Kısa link bulunamadı.',
        404,
      );
    }

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

    if (
      customDomain &&
      (!link.workspaceId || link.workspaceId !== customDomain.workspaceId)
    ) {
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

    if (link.passwordHash) {
      const unlocked = this.hasValidPasswordUnlock(request, link);
      if (!unlocked) {
        throw new LinkRedirectException(
          'password_required',
          'Bu link şifre korumalı.',
          401,
        );
      }
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
      passwordUnlockToken: null as string | null,
      passwordCookieName: null as string | null,
    };
  }

  async unlockRedirect(shortCode: string, password: string, request: Request) {
    const hostname = this.getRequestHostname(request);
    const customDomain = await this.resolveVerifiedDomain(hostname);

    if (
      hostname &&
      !this.appConfig.isPlatformHostname(hostname) &&
      !customDomain
    ) {
      throw new LinkRedirectException(
        'not_found',
        'Kısa link bulunamadı.',
        404,
      );
    }

    const link = await this.prisma.link.findUnique({
      where: { shortCode },
    });

    if (!link) {
      throw new LinkRedirectException(
        'not_found',
        'Kısa link bulunamadı.',
        404,
      );
    }

    if (
      customDomain &&
      (!link.workspaceId || link.workspaceId !== customDomain.workspaceId)
    ) {
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

    if (!link.passwordHash) {
      return this.handleRedirect(shortCode, request);
    }

    const valid = await bcrypt.compare(password, link.passwordHash);
    if (!valid) {
      throw new LinkRedirectException('password_invalid', 'Şifre hatalı.', 401);
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
      passwordUnlockToken: this.createPasswordUnlockToken(link),
      passwordCookieName: this.getPasswordCookieName(link.id),
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

  getPasswordCookieOptions(isProduction: boolean) {
    return {
      maxAge: LINK_PASSWORD_COOKIE_MAX_AGE_MS,
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: isProduction,
    };
  }

  getVisitorCookieName() {
    return VISITOR_COOKIE;
  }

  getPasswordCookieName(linkId: string) {
    return `${LINK_PASSWORD_COOKIE_PREFIX}${linkId}`;
  }

  private async findAccessibleLink(
    linkId: string,
    userId: string,
    requireWriteAccess = false,
  ) {
    const link = await this.prisma.link.findUnique({
      where: {
        id: linkId,
      },
    });

    if (!link) {
      throw new NotFoundException('Link bulunamadı.');
    }

    if (!link.workspaceId) {
      throw new ForbiddenException('Bu link bir workspace’e bağlı değil.');
    }

    if (requireWriteAccess) {
      await this.workspaces.assertRole(userId, link.workspaceId, [
        ...LINK_WRITE_ROLES,
      ]);
    } else {
      await this.workspaces.assertMember(userId, link.workspaceId);
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
      workspaceId: true,
      passwordHash: true,
    } as const;
  }

  private formatLink(
    link: LinkRecord,
    totalClicks: number,
    brandHostname?: string | null,
  ) {
    return {
      id: link.id,
      originalUrl: link.originalUrl,
      shortCode: link.shortCode,
      shortUrl: this.appConfig.buildShortUrl(link.shortCode, brandHostname),
      title: link.title,
      status: link.status,
      expiresAt: link.expiresAt,
      hasPassword: Boolean(link.passwordHash),
      totalClicks,
      createdAt: link.createdAt,
    };
  }

  private hasValidPasswordUnlock(
    request: Request,
    link: { id: string; passwordHash: string | null },
  ) {
    if (!link.passwordHash) {
      return true;
    }

    const cookies = request.cookies as
      Record<string, string | undefined> | undefined;
    const token = cookies?.[this.getPasswordCookieName(link.id)];
    if (!token) {
      return false;
    }

    return token === this.createPasswordUnlockToken(link);
  }

  private createPasswordUnlockToken(link: {
    id: string;
    passwordHash: string | null;
  }) {
    return createHmac('sha256', this.appConfig.jwtSecret)
      .update(`${link.id}:${link.passwordHash ?? ''}`)
      .digest('hex');
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

  private async resolveVerifiedDomain(hostname: string | null) {
    if (!hostname || this.appConfig.isPlatformHostname(hostname)) {
      return null;
    }

    return this.prisma.domain.findFirst({
      where: {
        hostname,
        verifiedAt: { not: null },
      },
      select: {
        id: true,
        workspaceId: true,
        hostname: true,
      },
    });
  }

  private getRequestHostname(request: Request) {
    const forwardedHost = request.headers['x-forwarded-host'];
    const rawHost =
      typeof forwardedHost === 'string'
        ? forwardedHost.split(',')[0]?.trim()
        : typeof request.headers.host === 'string'
          ? request.headers.host
          : request.hostname;

    if (!rawHost) {
      return null;
    }

    return (
      rawHost.split(':')[0]?.trim().toLowerCase().replace(/\.$/, '') || null
    );
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

    await this.clickIngestion.enqueue({
      linkId,
      visitorId,
      ipHash: ip ? this.hashIp(ip) : null,
      country: this.getHeaderValue(request, [
        'x-vercel-ip-country',
        'cf-ipcountry',
        'x-country-code',
      ]),
      city: this.getHeaderValue(request, [
        'x-vercel-ip-city',
        'cf-ipcity',
        'x-city',
      ]),
      referrer: typeof referrer === 'string' ? referrer : null,
      utmSource: this.getQueryValue(query.utm_source),
      utmMedium: this.getQueryValue(query.utm_medium),
      utmCampaign: this.getQueryValue(query.utm_campaign),
      deviceType: parsedDevice.deviceType,
      browser: parsedDevice.browser,
      os: parsedDevice.os,
      isBot: parsedDevice.isBot,
    });
  }

  private async validateDestinationUrl(value: string) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException('Geçerli bir URL gir.');
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new BadRequestException('Yalnızca HTTP ve HTTPS URL kabul edilir.');
    }
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      this.isPrivateAddress(hostname)
    ) {
      throw new BadRequestException(
        'Yerel veya özel ağ hedefleri kabul edilmez.',
      );
    }
    try {
      const addresses = await lookup(hostname, { all: true, verbatim: true });
      if (
        addresses.length === 0 ||
        addresses.some((entry) => this.isPrivateAddress(entry.address))
      ) {
        throw new BadRequestException(
          'Yerel veya özel ağ hedefleri kabul edilmez.',
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('URL alan adı çözümlenemedi.');
    }
  }

  private isPrivateAddress(address: string) {
    if (!isIP(address)) {
      return false;
    }
    if (address.includes(':')) {
      const normalized = address.toLowerCase();
      return (
        normalized === '::1' ||
        normalized === '::' ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe8') ||
        normalized.startsWith('fe9') ||
        normalized.startsWith('fea') ||
        normalized.startsWith('feb') ||
        normalized.startsWith('::ffff:127.') ||
        normalized.startsWith('::ffff:10.') ||
        normalized.startsWith('::ffff:192.168.')
      );
    }
    const [a, b] = address.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
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

  private getHeaderValue(request: Request, names: string[]) {
    for (const name of names) {
      const value = request.headers[name];
      if (typeof value === 'string' && value.trim()) {
        try {
          return decodeURIComponent(value.trim()).slice(0, 100);
        } catch {
          return value.trim().slice(0, 100);
        }
      }
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
