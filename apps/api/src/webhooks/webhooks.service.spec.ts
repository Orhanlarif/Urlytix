import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  let service: WebhooksService;

  const prisma = {
    webhook: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const workspaces = {
    assertMember: jest.fn(),
    assertRole: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    workspaces.assertMember.mockResolvedValue({ role: 'MEMBER' });
    workspaces.assertRole.mockResolvedValue({ role: 'OWNER' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PrismaService, useValue: prisma },
        { provide: WorkspacesService, useValue: workspaces },
      ],
    }).compile();

    service = module.get(WebhooksService);
  });

  it('does not expose webhook secret hashes when listing webhooks', async () => {
    prisma.webhook.findMany.mockResolvedValue([
      {
        id: 'webhook-1',
        workspaceId: 'workspace-1',
        url: 'https://example.com/webhook',
        events: ['link.created'],
        active: true,
        lastSentAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);

    const result = await service.list('user-1', 'workspace-1');

    expect(result[0]).not.toHaveProperty('secretHash');
    expect(prisma.webhook.findMany).toHaveBeenCalledWith({
      where: { workspaceId: 'workspace-1' },
      select: expect.not.objectContaining({ secretHash: true }),
    });
  });

  it('returns the raw signing secret only once on create', async () => {
    prisma.webhook.create.mockResolvedValue({
      id: 'webhook-1',
      workspaceId: 'workspace-1',
      url: 'https://example.com/webhook',
      events: ['link.created'],
      active: true,
      lastSentAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.create('user-1', 'workspace-1', {
      url: 'https://example.com/webhook',
      events: ['link.created'],
    });

    expect(result.secret).toEqual(expect.any(String));
    expect(result.webhook).not.toHaveProperty('secretHash');
    expect(prisma.webhook.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          secretHash: expect.any(String),
        }),
        select: expect.not.objectContaining({ secretHash: true }),
      }),
    );
  });

  it('fails loudly when a scoped webhook mutation matches no record', async () => {
    prisma.webhook.updateMany.mockResolvedValue({ count: 0 });
    prisma.webhook.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      service.update('user-1', 'workspace-1', 'foreign-webhook', {
        active: false,
      }),
    ).rejects.toThrow('Webhook bulunamadı.');
    await expect(
      service.remove('user-1', 'workspace-1', 'foreign-webhook'),
    ).rejects.toThrow('Webhook bulunamadı.');
  });
});
