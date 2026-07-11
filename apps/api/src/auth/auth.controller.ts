import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(
      registerDto,
      this.sessionContext(req),
    );
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return this.withoutRefreshToken(result);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      loginDto,
      this.sessionContext(req),
    );
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return this.withoutRefreshToken(result);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refresh(
      this.readCookie(req, 'refresh_token'),
      this.sessionContext(req),
    );
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return this.withoutRefreshToken(result);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logout(
      this.readCookie(req, 'refresh_token'),
    );
    res.clearCookie('access_token', this.cookieOptions());
    res.clearCookie('refresh_token', {
      ...this.cookieOptions(),
      path: '/api/auth',
    });
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    return this.authService.getMe(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.sub, dto);
  }

  private setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    response.cookie('access_token', accessToken, {
      ...this.cookieOptions(),
      maxAge: 15 * 60 * 1000,
    });
    response.cookie('refresh_token', refreshToken, {
      ...this.cookieOptions(),
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });
  }

  private withoutRefreshToken<T extends { refreshToken: string }>(result: T) {
    const { refreshToken, ...response } = result;
    void refreshToken;
    return response;
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    };
  }

  private readCookie(request: Request, name: string) {
    const cookies = request.cookies as
      Record<string, string | undefined> | undefined;
    return cookies?.[name];
  }

  private sessionContext(request: Request) {
    return {
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    };
  }
}
