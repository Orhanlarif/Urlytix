import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    if (this.isProduction) {
      const required = [
        'JWT_SECRET',
        'DATABASE_URL',
        'SHORT_URL_BASE',
        'REDIS_URL',
      ] as const;

      for (const key of required) {
        if (!this.configService.get<string>(key)) {
          throw new Error(
            `${key} environment variable is required in production.`,
          );
        }
      }
    }
  }

  get isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  get port(): number {
    return Number(this.configService.get<string>('PORT') ?? 4000);
  }

  get corsOrigins(): string[] {
    const raw =
      this.configService.get<string>('CORS_ORIGINS') ?? 'http://localhost:3000';

    return raw
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  get shortUrlBase(): string {
    const base =
      this.configService.get<string>('SHORT_URL_BASE') ??
      'http://localhost:4000/api/r';

    return base.replace(/\/+$/, '');
  }

  buildShortUrl(shortCode: string): string {
    return `${this.shortUrlBase}/${shortCode}`;
  }

  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET') ?? 'dev_secret';
  }

  get redisUrl(): string | undefined {
    return this.configService.get<string>('REDIS_URL') || undefined;
  }
}
