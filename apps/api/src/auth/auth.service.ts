import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { authenticator } from 'otplib';
import type { Prisma } from '@prisma/client';
import * as QRCode from 'qrcode';
import { AppConfigService } from '../config/app-config.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { provisionOwnerWorkspace } from '../workspaces/workspace-provisioning';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto';
import { EnableTwoFactorDto } from './dto/enable-two-factor.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';
import { decryptSecret, encryptSecret } from './totp-crypto';

type SessionContext = {
  userAgent?: string;
  ip?: string;
};

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const TWO_FACTOR_TOKEN_TTL = '5m';
const BACKUP_CODE_COUNT = 8;

type TwoFactorPendingPayload = {
  purpose: 'two_factor';
  sub: string;
  email: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly appConfig: AppConfigService,
  ) {}

  async register(registerDto: RegisterDto, context: SessionContext = {}) {
    const email = registerDto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
      },
    });

    if (existingUser) {
      throw new ConflictException('Bu email adresi zaten kullanılıyor.');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    const { user, tokens } = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: registerDto.name,
          email,
          passwordHash,
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });
      await provisionOwnerWorkspace(tx, createdUser);
      const sessionTokens = await this.issueSession(
        createdUser.id,
        createdUser.email,
        context,
        tx,
      );

      return { user: createdUser, tokens: sessionTokens };
    });

    return {
      message: 'Kayıt başarılı.',
      ...tokens,
      user,
    };
  }

  async login(loginDto: LoginDto, context: SessionContext = {}) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: loginDto.email.trim(), mode: 'insensitive' },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email veya şifre hatalı.');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email veya şifre hatalı.');
    }

    if (user.disabledAt) {
      throw new UnauthorizedException('Bu hesap askıya alınmış.');
    }

    if (user.totpEnabledAt && user.totpSecret) {
      const twoFactorToken = await this.jwtService.signAsync(
        {
          purpose: 'two_factor',
          sub: user.id,
          email: user.email,
        } satisfies TwoFactorPendingPayload,
        { expiresIn: TWO_FACTOR_TOKEN_TTL },
      );

      return {
        message: 'İki adımlı doğrulama gerekli.',
        requiresTwoFactor: true as const,
        twoFactorToken,
      };
    }

    const tokens = await this.issueSession(user.id, user.email, context);

    return {
      message: 'Giriş başarılı.',
      requiresTwoFactor: false as const,
      ...tokens,
      user: this.toUserSummary(user),
    };
  }

  async verifyTwoFactor(dto: VerifyTwoFactorDto, context: SessionContext = {}) {
    let payload: TwoFactorPendingPayload;
    try {
      payload = await this.jwtService.verifyAsync<TwoFactorPendingPayload>(
        dto.twoFactorToken,
      );
    } catch {
      throw new UnauthorizedException(
        'Doğrulama oturumu geçersiz veya süresi dolmuş.',
      );
    }

    if (payload.purpose !== 'two_factor') {
      throw new UnauthorizedException('Doğrulama oturumu geçersiz.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user?.totpEnabledAt || !user.totpSecret) {
      throw new BadRequestException('İki adımlı doğrulama etkin değil.');
    }

    if (user.disabledAt) {
      throw new UnauthorizedException('Bu hesap askıya alınmış.');
    }

    const valid = await this.verifyTotpOrBackupCode(
      user.id,
      user.totpSecret,
      dto.code,
    );
    if (!valid) {
      throw new UnauthorizedException('Doğrulama kodu hatalı.');
    }

    const tokens = await this.issueSession(user.id, user.email, context);
    return {
      message: 'Giriş başarılı.',
      ...tokens,
      user: this.toUserSummary(user),
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        timezone: true,
        locale: true,
        platformRole: true,
        disabledAt: true,
        createdAt: true,
        totpEnabledAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    if (user.disabledAt) {
      throw new UnauthorizedException('Bu hesap askıya alınmış.');
    }

    let platformRole = user.platformRole;
    if (
      platformRole !== 'SUPER_ADMIN' &&
      this.appConfig.platformAdminEmails.includes(user.email.toLowerCase())
    ) {
      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: { platformRole: 'SUPER_ADMIN' },
        select: { platformRole: true },
      });
      platformRole = updated.platformRole;
    }

    const { totpEnabledAt, disabledAt: _disabledAt, platformRole: _role, ...rest } =
      user;
    return {
      ...rest,
      platformRole,
      totpEnabled: Boolean(totpEnabledAt),
    };
  }

  async refresh(
    refreshToken: string | undefined,
    context: SessionContext = {},
  ) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token bulunamadı.');
    }

    const tokenHash = this.hashToken(refreshToken);
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException(
        'Refresh token geçersiz veya süresi dolmuş.',
      );
    }

    if (session.user.disabledAt) {
      throw new UnauthorizedException('Bu hesap askıya alınmış.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      return this.issueSession(
        session.user.id,
        session.user.email,
        context,
        tx,
      );
    });
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshSession.updateMany({
        where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { message: 'Çıkış başarılı.' };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email.toLowerCase(), id: { not: userId } },
      });
      if (existing) {
        throw new ConflictException('Bu email adresi zaten kullanılıyor.');
      }
    }

    if (dto.timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: dto.timezone });
      } catch {
        throw new BadRequestException('Geçersiz saat dilimi.');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        email: dto.email?.trim().toLowerCase(),
        timezone: dto.timezone,
        locale: dto.locale,
      },
      select: {
        id: true,
        name: true,
        email: true,
        timezone: true,
        locale: true,
        platformRole: true,
        createdAt: true,
        updatedAt: true,
        totpEnabledAt: true,
      },
    });

    const { totpEnabledAt, ...rest } = user;
    return {
      ...rest,
      totpEnabled: Boolean(totpEnabledAt),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const genericMessage =
      'Eğer bu e-posta ile bir hesap varsa, şifre sıfırlama bağlantısı gönderildi.';

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      return { message: genericMessage };
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    const resetUrl = `${this.appConfig.appWebUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    await this.mailService.sendPasswordReset({
      to: user.email,
      locale: user.locale,
      resetUrl,
      expiresMinutes: Math.floor(PASSWORD_RESET_TTL_MS / 60_000),
      userName: user.name,
    });

    return { message: genericMessage };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        'Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: resetToken.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.refreshSession.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return {
      message: 'Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.',
    };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    currentRefreshToken?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('Mevcut şifre hatalı.');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'Yeni şifre mevcut şifreden farklı olmalı.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    const keepHash = currentRefreshToken
      ? this.hashToken(currentRefreshToken)
      : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
      await tx.refreshSession.updateMany({
        where: {
          userId,
          revokedAt: null,
          ...(keepHash ? { tokenHash: { not: keepHash } } : {}),
        },
        data: { revokedAt: new Date() },
      });
    });

    return { message: 'Şifreniz güncellendi.' };
  }

  async listSessions(userId: string, currentRefreshToken?: string) {
    const currentHash = currentRefreshToken
      ? this.hashToken(currentRefreshToken)
      : null;
    const sessions = await this.prisma.refreshSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
        tokenHash: true,
      },
    });

    return sessions.map(({ tokenHash, ...session }) => ({
      ...session,
      current: Boolean(currentHash && tokenHash === currentHash),
    }));
  }

  async revokeSession(
    userId: string,
    sessionId: string,
    currentRefreshToken?: string,
  ) {
    const session = await this.prisma.refreshSession.findFirst({
      where: { id: sessionId, userId, revokedAt: null },
    });
    if (!session) {
      throw new NotFoundException('Oturum bulunamadı.');
    }

    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const currentHash = currentRefreshToken
      ? this.hashToken(currentRefreshToken)
      : null;
    return {
      message: 'Oturum kapatıldı.',
      revokedCurrent: Boolean(currentHash && session.tokenHash === currentHash),
    };
  }

  async revokeOtherSessions(userId: string, currentRefreshToken?: string) {
    if (!currentRefreshToken) {
      throw new BadRequestException('Mevcut oturum belirlenemedi.');
    }

    const result = await this.prisma.refreshSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        tokenHash: { not: this.hashToken(currentRefreshToken) },
      },
      data: { revokedAt: new Date() },
    });

    return {
      message: 'Diğer oturumlar kapatıldı.',
      revokedCount: result.count,
    };
  }

  async setupTwoFactor(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }
    if (user.totpEnabledAt) {
      throw new BadRequestException('İki adımlı doğrulama zaten etkin.');
    }

    const secret = authenticator.generateSecret();
    const encrypted = encryptSecret(secret, this.appConfig.totpEncryptionKey);
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: encrypted, totpEnabledAt: null },
    });

    const otpauthUrl = authenticator.keyuri(user.email, 'Urlytix', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
    };
  }

  async enableTwoFactor(userId: string, dto: EnableTwoFactorDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret) {
      throw new BadRequestException('Önce iki adımlı doğrulamayı başlatın.');
    }
    if (user.totpEnabledAt) {
      throw new BadRequestException('İki adımlı doğrulama zaten etkin.');
    }

    const secret = decryptSecret(
      user.totpSecret,
      this.appConfig.totpEncryptionKey,
    );
    if (!authenticator.check(dto.code, secret)) {
      throw new BadRequestException('Doğrulama kodu hatalı.');
    }

    const backupCodes = Array.from({ length: BACKUP_CODE_COUNT }, () =>
      randomBytes(4).toString('hex'),
    );
    const hashedCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10)),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { totpEnabledAt: new Date() },
      });
      await tx.totpBackupCode.deleteMany({ where: { userId } });
      await tx.totpBackupCode.createMany({
        data: hashedCodes.map((codeHash) => ({ userId, codeHash })),
      });
    });

    return {
      message: 'İki adımlı doğrulama etkinleştirildi.',
      backupCodes,
    };
  }

  async disableTwoFactor(userId: string, dto: DisableTwoFactorDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }
    if (!user.totpEnabledAt || !user.totpSecret) {
      throw new BadRequestException('İki adımlı doğrulama etkin değil.');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new BadRequestException('Şifre hatalı.');
    }

    const codeValid = await this.verifyTotpOrBackupCode(
      userId,
      user.totpSecret,
      dto.code,
    );
    if (!codeValid) {
      throw new BadRequestException('Doğrulama kodu hatalı.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { totpSecret: null, totpEnabledAt: null },
      });
      await tx.totpBackupCode.deleteMany({ where: { userId } });
    });

    return { message: 'İki adımlı doğrulama kapatıldı.' };
  }

  private async verifyTotpOrBackupCode(
    userId: string,
    encryptedSecret: string,
    code: string,
  ) {
    const secret = decryptSecret(
      encryptedSecret,
      this.appConfig.totpEncryptionKey,
    );
    if (authenticator.check(code.replace(/\s+/g, ''), secret)) {
      return true;
    }

    const normalized = code.replace(/\s+/g, '').toLowerCase();
    const backupCodes = await this.prisma.totpBackupCode.findMany({
      where: { userId, usedAt: null },
    });

    for (const backup of backupCodes) {
      if (await bcrypt.compare(normalized, backup.codeHash)) {
        await this.prisma.totpBackupCode.update({
          where: { id: backup.id },
          data: { usedAt: new Date() },
        });
        return true;
      }
    }

    return false;
  }

  private toUserSummary(user: {
    id: string;
    name: string | null;
    email: string;
    timezone: string;
    locale: string;
    platformRole?: 'USER' | 'SUPER_ADMIN';
    createdAt: Date;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      timezone: user.timezone,
      locale: user.locale,
      platformRole: user.platformRole ?? 'USER',
      createdAt: user.createdAt,
    };
  }

  private async signToken(userId: string, email: string) {
    return this.jwtService.signAsync({
      sub: userId,
      email,
    });
  }

  private async issueSession(
    userId: string,
    email: string,
    context: SessionContext,
    database: Pick<Prisma.TransactionClient, 'refreshSession'> = this.prisma,
  ) {
    const refreshToken = randomBytes(48).toString('base64url');
    await database.refreshSession.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        userAgent: context.userAgent?.slice(0, 500),
        ipHash: context.ip ? this.hashToken(context.ip) : null,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return {
      accessToken: await this.signToken(userId, email),
      refreshToken,
      expiresIn: 15 * 60,
    };
  }

  private hashToken(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
