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
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { provisionOwnerWorkspace } from '../workspaces/workspace-provisioning';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

type SessionContext = {
  userAgent?: string;
  ip?: string;
};

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto, context: SessionContext = {}) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: registerDto.email,
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
          email: registerDto.email,
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
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email,
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

    const tokens = await this.issueSession(user.id, user.email, context);

    return {
      message: 'Giriş başarılı.',
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        locale: user.locale,
        createdAt: user.createdAt,
      },
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
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    return user;
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

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        email: dto.email?.toLowerCase(),
        timezone: dto.timezone,
        locale: dto.locale,
      },
      select: {
        id: true,
        name: true,
        email: true,
        timezone: true,
        locale: true,
        createdAt: true,
        updatedAt: true,
      },
    });
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
