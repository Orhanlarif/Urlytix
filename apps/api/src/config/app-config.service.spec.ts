import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
  const productionConfig = (overrides: Record<string, string> = {}) =>
    new AppConfigService(
      new ConfigService({
        NODE_ENV: 'production',
        JWT_SECRET: 'R7fZ8pL2xQ9nV4mK6cB3jH5wT1sY0uA!',
        DATABASE_URL: 'postgresql://user:password@db.example.com:5432/app',
        SHORT_URL_BASE: 'https://go.example.com',
        REDIS_URL: 'rediss://cache.example.com:6379',
        CORS_ORIGINS: 'https://app.example.com',
        APP_WEB_URL: 'https://app.example.com',
        SMTP_HOST: 'smtp.example.com',
        SMTP_FROM: 'Urlytix <noreply@example.com>',
        BILLING_ENABLED: 'false',
        PORT: '4000',
        ...overrides,
      }),
    );

  it('keeps billing disabled unless explicitly set to true', () => {
    const disabled = new AppConfigService(
      new ConfigService({ BILLING_ENABLED: 'false' }),
    );
    const defaulted = new AppConfigService(new ConfigService({}));
    const enabled = new AppConfigService(
      new ConfigService({ BILLING_ENABLED: 'TRUE' }),
    );

    expect(disabled.billingEnabled).toBe(false);
    expect(defaulted.billingEnabled).toBe(false);
    expect(enabled.billingEnabled).toBe(true);
  });

  it('builds branded short urls from verified hostnames', () => {
    const config = new AppConfigService(
      new ConfigService({
        SHORT_URL_BASE: 'http://localhost:4000',
        NODE_ENV: 'production',
      }),
    );

    expect(config.buildShortUrl('abc1234')).toBe(
      'http://localhost:4000/abc1234',
    );
    expect(config.buildShortUrl('abc1234', 'go.brand.com')).toBe(
      'https://go.brand.com/abc1234',
    );
    expect(config.isPlatformHostname('localhost')).toBe(true);
    expect(config.isPlatformHostname('go.brand.com')).toBe(false);
  });

  it('strips legacy /api/r from SHORT_URL_BASE', () => {
    const config = new AppConfigService(
      new ConfigService({
        SHORT_URL_BASE: 'https://go.example.com/api/r',
      }),
    );

    expect(config.shortUrlBase).toBe('https://go.example.com');
    expect(config.buildShortUrl('abc1234')).toBe(
      'https://go.example.com/abc1234',
    );
  });

  it('accepts a complete, secure production configuration', () => {
    expect(() => productionConfig().onModuleInit()).not.toThrow();
  });

  it.each([
    'secret',
    'dev_secret',
    'change_me_to_a_long_random_secret',
    'short-but-not-a-known-default',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  ])('rejects weak or default production JWT secret %s', (JWT_SECRET) => {
    expect(() => productionConfig({ JWT_SECRET }).onModuleInit()).toThrow(
      /JWT_SECRET must be a strong, non-default secret/,
    );
  });

  it.each([
    ['DATABASE_URL', 'https://db.example.com'],
    ['SHORT_URL_BASE', 'http://go.example.com'],
    ['REDIS_URL', 'https://cache.example.com'],
    ['CORS_ORIGINS', 'http://app.example.com'],
  ])('rejects an unsafe production %s', (key, value) => {
    expect(() => productionConfig({ [key]: value }).onModuleInit()).toThrow(
      key,
    );
  });

  it('validates production boolean and port values strictly', () => {
    expect(() =>
      productionConfig({ BILLING_ENABLED: 'yes' }).onModuleInit(),
    ).toThrow('BILLING_ENABLED must be either true or false.');
    expect(() => productionConfig({ PORT: '0' }).onModuleInit()).toThrow(
      'PORT must be an integer between 1 and 65535.',
    );
  });

  it('requires exact HTTPS origins for production CORS', () => {
    expect(() =>
      productionConfig({
        CORS_ORIGINS: 'https://app.example.com/callback',
      }).onModuleInit(),
    ).toThrow('CORS_ORIGINS entries must be HTTPS origins');
  });

  it('supports optional parent cookie domains for split hosts', () => {
    const config = productionConfig({ COOKIE_DOMAIN: '.example.com' });
    expect(() => config.onModuleInit()).not.toThrow();
    expect(config.cookieDomain).toBe('.example.com');
    expect(config.cookieBaseOptions.domain).toBe('.example.com');
    expect(config.cookieBaseOptions.secure).toBe(true);
  });

  it('rejects production cookie domains without a leading dot', () => {
    expect(() =>
      productionConfig({ COOKIE_DOMAIN: 'example.com' }).onModuleInit(),
    ).toThrow(/COOKIE_DOMAIN must start with a leading dot/);
  });
});
