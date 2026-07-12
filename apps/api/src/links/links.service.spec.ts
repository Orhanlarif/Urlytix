import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import type { Request } from 'express';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { ClickIngestionService } from './click-ingestion.service';
import { LinkRedirectException } from './redirect-error.page';
import { LinksService } from './links.service';

describe('LinksService', () => {
  let service: LinksService;

  const prisma = {
    link: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    domain: {
      findFirst: jest.fn(),
    },
    clickEvent: {
      create: jest.fn(),
      count: jest.fn(),
    },
  };

  const appConfig = {
    buildShortUrl: jest.fn((code: string, hostname?: string | null) =>
      hostname
        ? `https://${hostname}/api/r/${code}`
        : `http://localhost:4000/api/r/${code}`,
    ),
    isPlatformHostname: jest.fn((hostname: string) =>
      ['localhost', '127.0.0.1'].includes(hostname),
    ),
    jwtSecret: 'test-secret',
  };

  const clickIngestion = {
    enqueue: jest.fn(async (payload: Record<string, unknown>) => {
      await prisma.clickEvent.create({ data: payload });
    }),
  };

  const workspaces = {
    assertMember: jest.fn(),
    assertRole: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.link.findUnique.mockReset();
    prisma.link.create.mockReset();
    prisma.link.update.mockReset();
    prisma.link.findMany.mockReset();
    prisma.link.count.mockReset();
    prisma.link.delete.mockReset();
    prisma.domain.findFirst.mockReset();
    prisma.clickEvent.create.mockReset();
    prisma.clickEvent.count.mockReset();
    workspaces.assertMember.mockReset();
    workspaces.assertRole.mockReset();
    workspaces.assertMember.mockResolvedValue({ role: 'OWNER' });
    workspaces.assertRole.mockResolvedValue({ role: 'OWNER' });
    prisma.domain.findFirst.mockResolvedValue(null);
    appConfig.isPlatformHostname.mockReset();
    appConfig.isPlatformHostname.mockImplementation((hostname: string) =>
      ['localhost', '127.0.0.1'].includes(hostname),
    );
    appConfig.buildShortUrl.mockClear();
    appConfig.buildShortUrl.mockImplementation(
      (code: string, hostname?: string | null) =>
        hostname
          ? `https://${hostname}/api/r/${code}`
          : `http://localhost:4000/api/r/${code}`,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinksService,
        { provide: ClickIngestionService, useValue: clickIngestion },
        { provide: PrismaService, useValue: prisma },
        { provide: AppConfigService, useValue: appConfig },
        { provide: WorkspacesService, useValue: workspaces },
      ],
    }).compile();

    service = module.get<LinksService>(LinksService);
  });

  describe('createLink', () => {
    it('creates a link in the selected workspace', async () => {
      prisma.link.findUnique.mockResolvedValue(null);
      prisma.link.create.mockResolvedValue({
        id: 'link-1',
        originalUrl: 'https://example.com',
        shortCode: 'abc1234',
        title: 'Example',
        status: 'ACTIVE',
        expiresAt: null,
        createdAt: new Date(),
      });

      const result = await service.createLink('user-1', {
        workspaceId: 'workspace-1',
        originalUrl: 'https://example.com',
        title: 'Example',
      });

      expect(workspaces.assertRole).toHaveBeenCalledWith(
        'user-1',
        'workspace-1',
        ['OWNER', 'ADMIN', 'MEMBER'],
      );
      expect(result.link.shortUrl).toBe('http://localhost:4000/api/r/abc1234');
      expect(result.message).toBe('Link oluşturuldu.');
      expect(prisma.link.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            workspaceId: 'workspace-1',
          }),
        }),
      );
    });

    it('throws when custom alias already exists', async () => {
      prisma.link.findUnique.mockResolvedValue({ id: 'existing-link' });

      await expect(
        service.createLink('user-1', {
          workspaceId: 'workspace-1',
          originalUrl: 'https://example.com',
          customAlias: 'taken-alias',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects expiration dates in the past', async () => {
      await expect(
        service.createLink('user-1', {
          workspaceId: 'workspace-1',
          originalUrl: 'https://example.com',
          expiresAt: new Date(Date.now() - 60_000).toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects localhost and private network destinations', async () => {
      await expect(
        service.createLink('user-1', {
          workspaceId: 'workspace-1',
          originalUrl: 'http://127.0.0.1:8080/admin',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createLink('user-1', {
          workspaceId: 'workspace-1',
          originalUrl: 'http://192.168.1.10/internal',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserLinks', () => {
    it('returns workspace-scoped pagination response', async () => {
      prisma.link.findMany.mockResolvedValue([
        {
          id: 'link-1',
          originalUrl: 'https://example.com',
          shortCode: 'abc1234',
          title: 'Example',
          status: 'ACTIVE',
          expiresAt: null,
          createdAt: new Date('2026-07-11T12:00:00.000Z'),
          _count: { clickEvents: 3 },
        },
      ]);
      prisma.link.count.mockResolvedValue(1);

      const result = await service.getUserLinks('user-1', {
        workspaceId: 'workspace-1',
        page: 1,
        limit: 20,
      });

      expect(workspaces.assertMember).toHaveBeenCalledWith(
        'user-1',
        'workspace-1',
      );
      expect(prisma.link.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ workspaceId: 'workspace-1' }),
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      });
      expect(result).not.toHaveProperty('items');
    });
  });

  describe('handleRedirect', () => {
    const mockRequest = {
      headers: {},
      query: {},
      cookies: {},
      ip: '127.0.0.1',
    } as Request;

    it('throws when short code is not found', async () => {
      prisma.link.findUnique.mockResolvedValue(null);

      await expect(
        service.handleRedirect('missing', mockRequest),
      ).rejects.toThrow(LinkRedirectException);
    });

    it('throws and marks link expired when expiration date passed', async () => {
      prisma.link.findUnique.mockResolvedValue({
        id: 'link-1',
        originalUrl: 'https://example.com',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() - 60_000),
      });
      prisma.link.update.mockResolvedValue({});

      await expect(
        service.handleRedirect('expired-code', mockRequest),
      ).rejects.toMatchObject({ code: 'expired' });

      expect(prisma.link.update).toHaveBeenCalledWith({
        where: { id: 'link-1' },
        data: { status: 'EXPIRED' },
      });
    });

    it('throws when link is disabled', async () => {
      prisma.link.findUnique.mockResolvedValue({
        id: 'link-1',
        originalUrl: 'https://example.com',
        status: 'DISABLED',
        expiresAt: null,
      });

      await expect(
        service.handleRedirect('disabled-code', mockRequest),
      ).rejects.toMatchObject({ code: 'inactive' });
    });

    it('redirects even when click tracking fails', async () => {
      prisma.link.findUnique.mockResolvedValue({
        id: 'link-1',
        originalUrl: 'https://example.com',
        status: 'ACTIVE',
        expiresAt: null,
      });
      prisma.clickEvent.create.mockRejectedValue(new Error('db down'));

      const result = await service.handleRedirect('active-code', mockRequest);

      expect(result.originalUrl).toBe('https://example.com');
      expect(result.visitorId).toBeDefined();
    });

    it('tracks click with visitor id for active links', async () => {
      prisma.link.findUnique.mockResolvedValue({
        id: 'link-1',
        originalUrl: 'https://example.com',
        status: 'ACTIVE',
        expiresAt: null,
      });
      prisma.clickEvent.create.mockResolvedValue({ id: 'click-1' });

      const result = await service.handleRedirect('active-code', {
        ...mockRequest,
        cookies: { urlytics_vid: 'visitor-123' },
      } as unknown as Request);

      expect(result.originalUrl).toBe('https://example.com');
      expect(prisma.clickEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            linkId: 'link-1',
            visitorId: 'visitor-123',
          }),
        }),
      );
    });

    it('rejects unknown custom hosts', async () => {
      prisma.domain.findFirst.mockResolvedValue(null);
      appConfig.isPlatformHostname.mockReturnValue(false);

      await expect(
        service.handleRedirect('active-code', {
          ...mockRequest,
          headers: { host: 'go.brand.com' },
          hostname: 'go.brand.com',
        } as unknown as Request),
      ).rejects.toMatchObject({ code: 'not_found' });
    });

    it('rejects links that do not belong to the custom domain workspace', async () => {
      appConfig.isPlatformHostname.mockReturnValue(false);
      prisma.domain.findFirst.mockResolvedValue({
        id: 'domain-1',
        workspaceId: 'workspace-1',
        hostname: 'go.brand.com',
      });
      prisma.link.findUnique.mockResolvedValue({
        id: 'link-1',
        workspaceId: 'workspace-2',
        originalUrl: 'https://example.com',
        status: 'ACTIVE',
        expiresAt: null,
      });

      await expect(
        service.handleRedirect('active-code', {
          ...mockRequest,
          headers: { host: 'go.brand.com' },
          hostname: 'go.brand.com',
        } as unknown as Request),
      ).rejects.toMatchObject({ code: 'not_found' });
    });

    it('redirects custom-domain traffic for matching workspace links', async () => {
      appConfig.isPlatformHostname.mockReturnValue(false);
      prisma.domain.findFirst.mockResolvedValue({
        id: 'domain-1',
        workspaceId: 'workspace-1',
        hostname: 'go.brand.com',
      });
      prisma.link.findUnique.mockResolvedValue({
        id: 'link-1',
        workspaceId: 'workspace-1',
        originalUrl: 'https://example.com',
        status: 'ACTIVE',
        expiresAt: null,
        passwordHash: null,
      });
      prisma.clickEvent.create.mockResolvedValue({ id: 'click-1' });

      const result = await service.handleRedirect('active-code', {
        ...mockRequest,
        headers: { host: 'go.brand.com' },
        hostname: 'go.brand.com',
      } as unknown as Request);

      expect(result.originalUrl).toBe('https://example.com');
    });

    it('requires a password for protected links', async () => {
      prisma.link.findUnique.mockResolvedValue({
        id: 'link-1',
        workspaceId: 'workspace-1',
        originalUrl: 'https://example.com',
        status: 'ACTIVE',
        expiresAt: null,
        passwordHash: await bcrypt.hash('secret', 10),
      });

      await expect(
        service.handleRedirect('locked-code', mockRequest),
      ).rejects.toMatchObject({ code: 'password_required' });
    });

    it('unlocks a protected link with the correct password', async () => {
      const passwordHash = await bcrypt.hash('secret', 10);
      prisma.link.findUnique.mockResolvedValue({
        id: 'link-1',
        workspaceId: 'workspace-1',
        originalUrl: 'https://example.com',
        status: 'ACTIVE',
        expiresAt: null,
        passwordHash,
      });
      prisma.clickEvent.create.mockResolvedValue({ id: 'click-1' });

      const result = await service.unlockRedirect(
        'locked-code',
        'secret',
        mockRequest,
      );

      expect(result.originalUrl).toBe('https://example.com');
      expect(result.passwordUnlockToken).toBeTruthy();
      expect(result.passwordCookieName).toBe('urlytics_lp_link-1');
    });
  });

  describe('updateLinkStatus', () => {
    it('prevents activating an expired link', async () => {
      prisma.link.findUnique.mockResolvedValue({
        id: 'link-1',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        status: 'EXPIRED',
        expiresAt: new Date(Date.now() - 60_000),
      });

      await expect(
        service.updateLinkStatus('user-1', 'link-1', 'ACTIVE'),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires write role for status changes', async () => {
      prisma.link.findUnique.mockResolvedValue({
        id: 'link-1',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        status: 'ACTIVE',
        expiresAt: null,
      });
      workspaces.assertRole.mockRejectedValue(
        new ForbiddenException('Workspace erişim yetkin yok.'),
      );

      await expect(
        service.updateLinkStatus('viewer-1', 'link-1', 'DISABLED'),
      ).rejects.toThrow('Workspace erişim yetkin yok.');
      expect(workspaces.assertRole).toHaveBeenCalledWith(
        'viewer-1',
        'workspace-1',
        ['OWNER', 'ADMIN', 'MEMBER'],
      );
    });
  });

  describe('getUserLinkById', () => {
    it('rejects links without a workspace', async () => {
      prisma.link.findUnique.mockResolvedValue({
        id: 'link-1',
        userId: 'user-1',
        workspaceId: null,
        status: 'ACTIVE',
        expiresAt: null,
      });

      await expect(service.getUserLinkById('user-1', 'link-1')).rejects.toThrow(
        'Bu link bir workspace’e bağlı değil.',
      );
    });
  });
});
