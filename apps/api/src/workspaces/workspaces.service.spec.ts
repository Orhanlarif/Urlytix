import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from './workspaces.service';

describe('WorkspacesService', () => {
  let service: WorkspacesService;

  const prisma = {
    workspace: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    membership: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(WorkspacesService);
  });

  describe('addMember', () => {
    it('adds an existing user by email', async () => {
      prisma.membership.findUnique.mockResolvedValue({ role: 'OWNER' });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'member@example.com',
      });
      prisma.membership.upsert.mockResolvedValue({
        id: 'membership-1',
        role: 'MEMBER',
        userId: 'user-2',
        workspaceId: 'workspace-1',
        user: { id: 'user-2', name: 'Member', email: 'member@example.com' },
      });

      const result = await service.addMember('user-1', 'workspace-1', {
        email: 'member@example.com',
        role: 'MEMBER',
      });

      expect(result.role).toBe('MEMBER');
      expect(prisma.membership.upsert).toHaveBeenCalled();
    });

    it('rejects adding yourself', async () => {
      prisma.membership.findUnique.mockResolvedValue({ role: 'OWNER' });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'owner@example.com',
      });

      await expect(
        service.addMember('user-1', 'workspace-1', {
          email: 'owner@example.com',
          role: 'ADMIN',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateMemberRole', () => {
    it('updates a non-owner member role', async () => {
      prisma.membership.findUnique
        .mockResolvedValueOnce({ role: 'OWNER' })
        .mockResolvedValueOnce({ role: 'MEMBER', userId: 'user-2' })
        .mockResolvedValueOnce({ role: 'OWNER' });
      prisma.membership.update.mockResolvedValue({
        id: 'membership-1',
        role: 'VIEWER',
        userId: 'user-2',
        user: { id: 'user-2', name: null, email: 'member@example.com' },
      });

      const result = await service.updateMemberRole(
        'user-1',
        'workspace-1',
        'user-2',
        { role: 'VIEWER' },
      );

      expect(result.role).toBe('VIEWER');
    });

    it('blocks changing the owner role', async () => {
      prisma.membership.findUnique
        .mockResolvedValueOnce({ role: 'OWNER' })
        .mockResolvedValueOnce({ role: 'OWNER', userId: 'user-2' });

      await expect(
        service.updateMemberRole('user-1', 'workspace-1', 'user-2', {
          role: 'ADMIN',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeMember', () => {
    it('removes a non-owner member', async () => {
      prisma.membership.findUnique
        .mockResolvedValueOnce({ role: 'OWNER' })
        .mockResolvedValueOnce({ role: 'MEMBER', userId: 'user-2' })
        .mockResolvedValueOnce({ role: 'OWNER' });
      prisma.membership.delete.mockResolvedValue({});

      const result = await service.removeMember(
        'user-1',
        'workspace-1',
        'user-2',
      );

      expect(result.removedUserId).toBe('user-2');
      expect(prisma.membership.delete).toHaveBeenCalled();
    });

    it('rejects removing a missing member', async () => {
      prisma.membership.findUnique
        .mockResolvedValueOnce({ role: 'OWNER' })
        .mockResolvedValueOnce(null);

      await expect(
        service.removeMember('user-1', 'workspace-1', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
