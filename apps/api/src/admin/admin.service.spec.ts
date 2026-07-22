import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';
import { PlatformAdminGuard } from './platform-admin.guard';

describe('AdminService', () => {
  let service: AdminService;
  const prisma = {
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    workspace: { count: jest.fn() },
    link: { count: jest.fn() },
    clickEvent: { count: jest.fn() },
    refreshSession: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AdminService);
  });

  it('lists users with pagination meta', async () => {
    prisma.user.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'u1',
        name: 'Ada',
        email: 'ada@example.com',
        platformRole: 'USER',
        disabledAt: null,
        createdAt: new Date('2026-01-01'),
        totpEnabledAt: null,
        _count: { memberships: 1, links: 2, refreshSessions: 0 },
      },
    ]);

    const result = await service.listUsers({
      page: 1,
      pageSize: 20,
      status: 'all',
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].email).toBe('ada@example.com');
    expect(result.data[0].linkCount).toBe(2);
    expect(result.meta.total).toBe(1);
  });

  it('prevents disabling your own account', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      platformRole: 'SUPER_ADMIN',
      disabledAt: null,
    });

    await expect(
      service.updateUser('u1', 'u1', { disabled: true }),
    ).rejects.toThrow('Kendi hesabını askıya alamazsın.');
  });
});

describe('PlatformAdminGuard', () => {
  it('allows SUPER_ADMIN users', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          platformRole: 'SUPER_ADMIN',
          disabledAt: null,
        }),
      },
    };
    const guard = new PlatformAdminGuard(prisma as never);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { sub: 'admin-1', email: 'a@x.com' } }),
      }),
    };

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
  });

  it('rejects non-admin users', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          platformRole: 'USER',
          disabledAt: null,
        }),
      },
    };
    const guard = new PlatformAdminGuard(prisma as never);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { sub: 'user-1', email: 'u@x.com' } }),
      }),
    };

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
