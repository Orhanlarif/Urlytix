import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
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
    clickEvent: {
      create: jest.fn(),
    },
  };

  const appConfig = {
    buildShortUrl: jest.fn(
      (code: string) => `http://localhost:4000/api/r/${code}`,
    ),
  };

  const clickIngestion = {
    enqueue: jest.fn(async (payload: Record<string, unknown>) => {
      await prisma.clickEvent.create({ data: payload });
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.link.findUnique.mockReset();
    prisma.link.create.mockReset();
    prisma.link.update.mockReset();
    prisma.link.findMany.mockReset();
    prisma.link.count.mockReset();
    prisma.link.delete.mockReset();
    prisma.clickEvent.create.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinksService,
        { provide: ClickIngestionService, useValue: clickIngestion },
        { provide: PrismaService, useValue: prisma },
        { provide: AppConfigService, useValue: appConfig },
      ],
    }).compile();

    service = module.get<LinksService>(LinksService);
  });

  describe('createLink', () => {
    it('creates a link with generated short code', async () => {
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
        originalUrl: 'https://example.com',
        title: 'Example',
      });

      expect(result.link.shortUrl).toBe('http://localhost:4000/api/r/abc1234');
      expect(result.message).toBe('Link oluşturuldu.');
    });

    it('throws when custom alias already exists', async () => {
      prisma.link.findUnique.mockResolvedValue({ id: 'existing-link' });

      await expect(
        service.createLink('user-1', {
          originalUrl: 'https://example.com',
          customAlias: 'taken-alias',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects expiration dates in the past', async () => {
      await expect(
        service.createLink('user-1', {
          originalUrl: 'https://example.com',
          expiresAt: new Date(Date.now() - 60_000).toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserLinks', () => {
    it('returns the shared pagination response shape', async () => {
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
        page: 1,
        limit: 20,
      });

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
      } as Request);

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
  });

  describe('updateLinkStatus', () => {
    it('prevents activating an expired link', async () => {
      prisma.link.findUnique.mockResolvedValue({
        id: 'link-1',
        userId: 'user-1',
        status: 'EXPIRED',
        expiresAt: new Date(Date.now() - 60_000),
      });

      await expect(
        service.updateLinkStatus('user-1', 'link-1', 'ACTIVE'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
