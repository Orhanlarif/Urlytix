import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './create-test-app';

describe('Urlytics API (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken: string;
  let linkId: string;
  let shortCode: string;

  const testEmail = `e2e-${Date.now()}@urlytics.test`;
  const testPassword = 'Testpass123!';

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health returns ok', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('ok');
        expect(response.body.database).toBe('connected');
      });
  });

  it('POST /api/auth/register creates a user', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'E2E User',
        email: testEmail,
        password: testPassword,
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.accessToken).toBeDefined();
        expect(response.body.user.email).toBe(testEmail);
        accessToken = response.body.accessToken;
      });
  });

  it('POST /api/auth/login returns a token', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.accessToken).toBeDefined();
        accessToken = response.body.accessToken;
      });
  });

  it('GET /api/auth/me returns current user', () => {
    return request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.email).toBe(testEmail);
      });
  });

  it('POST /api/links creates a short link', () => {
    return request(app.getHttpServer())
      .post('/api/links')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        originalUrl: 'https://example.com/e2e-test',
        title: 'E2E Test Link',
        customAlias: `e2e-${Date.now()}`,
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.link.shortCode).toBeDefined();
        expect(response.body.link.shortUrl).toContain('/api/r/');
        linkId = response.body.link.id;
        shortCode = response.body.link.shortCode;
      });
  });

  it('GET /api/links returns user links', () => {
    return request(app.getHttpServer())
      .get('/api/links')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.meta.pageSize).toBe(20);
        expect(response.body.meta.total).toBeGreaterThan(0);
        expect(response.body.items).toBeUndefined();
      });
  });

  it('GET /api/r/:shortCode redirects to original URL', () => {
    return request(app.getHttpServer())
      .get(`/api/r/${shortCode}`)
      .expect(302)
      .expect('Location', 'https://example.com/e2e-test');
  });

  it('GET /api/r/unknown-code returns HTML error page', () => {
    return request(app.getHttpServer())
      .get('/api/r/does-not-exist-xyz')
      .expect(404)
      .expect('Content-Type', /html/)
      .expect((response) => {
        expect(response.text).toContain('Link Bulunamadı');
      });
  });

  it('PATCH /api/links/:id updates link title', () => {
    return request(app.getHttpServer())
      .patch(`/api/links/${linkId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Updated E2E Title',
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.link.title).toBe('Updated E2E Title');
      });
  });

  it('GET /api/analytics/links/:id returns analytics', () => {
    return request(app.getHttpServer())
      .get(`/api/analytics/links/${linkId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.link.id).toBe(linkId);
        expect(response.body.link.totalClicks).toBeGreaterThanOrEqual(1);
        expect(typeof response.body.uniqueVisitors).toBe('number');
      });
  });
});
