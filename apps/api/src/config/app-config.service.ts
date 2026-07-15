import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    // Validate cookie domain whenever set (including non-production).
    void this.cookieDomain;

    if (this.isProduction) {
      const required = [
        'JWT_SECRET',
        'DATABASE_URL',
        'SHORT_URL_BASE',
        'REDIS_URL',
        'CORS_ORIGINS',
        'APP_WEB_URL',
        'SMTP_HOST',
        'SMTP_FROM',
      ] as const;

      for (const key of required) {
        if (!this.getTrimmed(key)) {
          throw new Error(
            `${key} environment variable is required in production.`,
          );
        }
      }

      this.validateProductionJwtSecret();
      this.validateUrl('DATABASE_URL', ['postgres:', 'postgresql:']);
      this.validateUrl('SHORT_URL_BASE', ['https:']);
      this.validateUrl('REDIS_URL', ['redis:', 'rediss:']);
      this.validateUrl('APP_WEB_URL', ['https:']);
      this.validateSmtpPort();

      for (const origin of this.corsOrigins) {
        this.validateAbsoluteUrl('CORS_ORIGINS', origin, ['https:']);
        const url = new URL(origin);
        if (url.origin !== origin || url.username || url.password) {
          throw new Error(
            'CORS_ORIGINS entries must be HTTPS origins without paths, credentials, query strings, or fragments.',
          );
        }
      }

      if (this.corsOrigins.length === 0) {
        throw new Error(
          'CORS_ORIGINS must contain at least one HTTPS origin in production.',
        );
      }

      const billingEnabled = this.getTrimmed('BILLING_ENABLED');
      if (
        billingEnabled &&
        !['true', 'false'].includes(billingEnabled.toLowerCase())
      ) {
        throw new Error('BILLING_ENABLED must be either true or false.');
      }

      const configuredPort = this.getTrimmed('PORT');
      if (configuredPort) {
        const port = Number(configuredPort);
        if (!Number.isInteger(port) || port < 1 || port > 65_535) {
          throw new Error('PORT must be an integer between 1 and 65535.');
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
      'http://localhost:4000';

    // Strip legacy `/api/r` suffix so public links stay path-clean.
    return base.replace(/\/+$/, '').replace(/\/api\/r$/i, '');
  }

  buildShortUrl(shortCode: string, hostname?: string | null): string {
    if (!hostname) {
      return `${this.shortUrlBase}/${shortCode}`;
    }

    try {
      const baseUrl = new URL(this.shortUrlBase);
      const path = baseUrl.pathname.replace(/\/+$/, '');
      const protocol = this.isProduction ? 'https:' : baseUrl.protocol;
      return `${protocol}//${hostname.toLowerCase()}${path}/${shortCode}`;
    } catch {
      return `https://${hostname.toLowerCase()}/${shortCode}`;
    }
  }

  getPlatformHostnames(): string[] {
    const hosts = new Set<string>(['localhost', '127.0.0.1']);

    try {
      hosts.add(new URL(this.shortUrlBase).hostname.toLowerCase());
    } catch {
      // Ignore invalid SHORT_URL_BASE and keep local defaults.
    }

    for (const origin of this.corsOrigins) {
      try {
        hosts.add(new URL(origin).hostname.toLowerCase());
      } catch {
        // Ignore invalid CORS origins.
      }
    }

    return [...hosts];
  }

  isPlatformHostname(hostname: string): boolean {
    const normalized = hostname.toLowerCase().replace(/\.$/, '');
    return this.getPlatformHostnames().includes(normalized);
  }

  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET') ?? 'dev_secret';
  }

  get redisUrl(): string | undefined {
    return this.configService.get<string>('REDIS_URL') || undefined;
  }

  get billingEnabled(): boolean {
    return (
      this.configService.get<string>('BILLING_ENABLED')?.toLowerCase() ===
      'true'
    );
  }

  /**
   * Optional parent Domain for auth/visitor cookies when web and API share a
   * registrable domain but use distinct hostnames (e.g. `.example.com`).
   * Prefer host-only cookies via a reverse-proxied same host when possible.
   */
  get cookieDomain(): string | undefined {
    const domain = this.getTrimmed('COOKIE_DOMAIN');
    if (!domain) return undefined;

    if (domain.includes('/') || domain.includes(':') || domain.includes(' ')) {
      throw new Error(
        'COOKIE_DOMAIN must be a bare hostname suffix such as .example.com.',
      );
    }

    if (this.isProduction && !domain.startsWith('.')) {
      throw new Error(
        'COOKIE_DOMAIN must start with a leading dot in production (e.g. .example.com).',
      );
    }

    return domain;
  }

  get cookieBaseOptions(): {
    httpOnly: true;
    secure: boolean;
    sameSite: 'lax';
    domain?: string;
  } {
    return {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      ...(this.cookieDomain ? { domain: this.cookieDomain } : {}),
    };
  }

  get appVersion(): string {
    return (
      this.getTrimmed('APP_VERSION') || this.getTrimmed('GIT_SHA') || 'unknown'
    );
  }

  get metricsToken(): string | undefined {
    const token = this.getTrimmed('METRICS_TOKEN');
    return token || undefined;
  }

  get sentryDsn(): string | undefined {
    const dsn = this.getTrimmed('SENTRY_DSN');
    return dsn || undefined;
  }

  get appWebUrl(): string {
    const base =
      this.configService.get<string>('APP_WEB_URL') ?? 'http://localhost:3000';
    return base.replace(/\/+$/, '');
  }

  get smtpHost(): string {
    return this.getTrimmed('SMTP_HOST');
  }

  get smtpPort(): number {
    return Number(this.getTrimmed('SMTP_PORT') || '587');
  }

  get smtpUser(): string {
    return this.getTrimmed('SMTP_USER');
  }

  get smtpPass(): string {
    // Google App Passwords are often pasted with spaces for readability.
    return (this.configService.get<string>('SMTP_PASS') ?? '').replace(
      /\s+/g,
      '',
    );
  }

  get smtpFrom(): string {
    return this.getTrimmed('SMTP_FROM') || 'Urlytix <noreply@localhost>';
  }

  get smtpSecure(): boolean {
    const raw = this.getTrimmed('SMTP_SECURE').toLowerCase();
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return this.smtpPort === 465;
  }

  get smtpConfigured(): boolean {
    return Boolean(this.smtpHost);
  }

  get totpEncryptionKey(): string {
    return this.getTrimmed('TOTP_ENCRYPTION_KEY') || this.jwtSecret;
  }

  private getTrimmed(key: string): string {
    return this.configService.get<string>(key)?.trim() ?? '';
  }

  private validateSmtpPort() {
    const port = this.smtpPort;
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
      throw new Error('SMTP_PORT must be an integer between 1 and 65535.');
    }
  }

  private validateProductionJwtSecret() {
    const secret = this.getTrimmed('JWT_SECRET');
    const normalized = secret.toLowerCase();
    const knownWeakValues = [
      'secret',
      'jwt_secret',
      'dev_secret',
      'changeme',
      'change_me',
      'change-me',
      'change_me_to_a_long_random_secret',
    ];

    if (
      secret.length < 32 ||
      new Set(secret).size < 12 ||
      knownWeakValues.some(
        (value) => normalized === value || normalized.includes(value),
      )
    ) {
      throw new Error(
        'JWT_SECRET must be a strong, non-default secret of at least 32 characters in production.',
      );
    }
  }

  private validateUrl(key: string, protocols: string[]) {
    this.validateAbsoluteUrl(key, this.getTrimmed(key), protocols);
  }

  private validateAbsoluteUrl(key: string, value: string, protocols: string[]) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`${key} must be a valid absolute URL.`);
    }

    if (!protocols.includes(url.protocol)) {
      throw new Error(
        `${key} must use one of these protocols: ${protocols.join(', ')}`,
      );
    }

    if (!url.hostname) {
      throw new Error(`${key} must include a hostname.`);
    }
  }
}
