import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AppConfigService } from '../config/app-config.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    membership: {
      findFirst: jest.fn(),
    },
    workspace: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    totpBackupCode: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed-jwt-token'),
    verifyAsync: jest.fn(),
  };

  const mailService = {
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  };

  const appConfig = {
    appWebUrl: 'http://localhost:3000',
    totpEncryptionKey: 'test-encryption-key-at-least-32-chars',
    platformAdminEmails: [] as string[],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jwtService.signAsync.mockResolvedValue('signed-jwt-token');
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: MailService, useValue: mailService },
        { provide: AppConfigService, useValue: appConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('creates a user, owner workspace, and refresh session atomically', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.membership.findFirst.mockResolvedValue(null);
      prisma.workspace.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
      });
      prisma.workspace.create.mockResolvedValue({
        id: 'workspace-1',
        name: "Test User's Workspace",
        slug: 'test-user-1234567890',
      });

      const result = await service.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'secret123',
      });

      expect(result.accessToken).toBe('signed-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.workspace.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Test User's Workspace",
          memberships: { create: { userId: 'user-1', role: 'OWNER' } },
        }),
      });
      expect(prisma.refreshSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'user-1' }),
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'test@example.com',
      });
    });

    it('throws when email already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'secret123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns token for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);

      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash,
        timezone: 'UTC',
        locale: 'en',
        totpEnabledAt: null,
        totpSecret: null,
        createdAt: new Date(),
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'secret123',
      });

      expect(result.requiresTwoFactor).toBe(false);
      if (!result.requiresTwoFactor) {
        expect(result.accessToken).toBe('signed-jwt-token');
        expect(result.user.email).toBe('test@example.com');
      }
    });

    it('returns two-factor challenge when TOTP is enabled', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
        totpEnabledAt: new Date(),
        totpSecret: 'encrypted',
      });
      jwtService.signAsync.mockResolvedValueOnce('two-factor-pending');

      const result = await service.login({
        email: 'test@example.com',
        password: 'secret123',
      });

      expect(result.requiresTwoFactor).toBe(true);
      if (result.requiresTwoFactor) {
        expect(result.twoFactorToken).toBe('two-factor-pending');
      }
    });

    it('throws when user is not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'missing@example.com',
          password: 'secret123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when password is invalid', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);

      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
        totpEnabledAt: null,
        totpSecret: null,
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMe', () => {
    it('returns user profile', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        timezone: 'UTC',
        locale: 'en',
        platformRole: 'USER',
        disabledAt: null,
        totpEnabledAt: null,
        createdAt: new Date(),
      });

      const result = await service.getMe('user-1');

      expect(result.email).toBe('test@example.com');
      expect(result.totpEnabled).toBe(false);
      expect(result.platformRole).toBe('USER');
    });

    it('throws when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('refresh', () => {
    it('revokes the previous session and rotates both tokens', async () => {
      prisma.refreshSession.findUnique.mockResolvedValue({
        id: 'session-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        user: { id: 'user-1', email: 'test@example.com' },
      });

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('signed-jwt-token');
      expect(result.refreshToken).toBeDefined();
      expect(prisma.refreshSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.refreshSession.create).toHaveBeenCalled();
    });

    it('rejects revoked sessions', async () => {
      prisma.refreshSession.findUnique.mockResolvedValue({
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(service.refresh('revoked-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    it('always returns a generic message and emails existing users', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        locale: 'en',
      });

      const result = await service.forgotPassword({
        email: 'test@example.com',
      });

      expect(result.message).toContain('şifre sıfırlama');
      expect(mailService.sendPasswordReset).toHaveBeenCalled();
      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
    });

    it('does not reveal missing accounts', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'missing@example.com',
      });

      expect(result.message).toContain('şifre sıfırlama');
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });
  });
});
