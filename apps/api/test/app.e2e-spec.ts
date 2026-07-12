import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './create-test-app';

describe('Urlytics API (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken: string;
  let userId: string;
  let workspaceId: string;
  let linkId: string;
  let shortCode: string;
  let secondAccessToken: string;
  let secondWorkspaceId: string;
  let protectedShortCode: string;

  const testEmail = `e2e-${Date.now()}@urlytics.test`;
  const secondTestEmail = `e2e-second-${Date.now()}@urlytics.test`;
  const testPassword = 'Testpass123!';

  beforeAll(async () => {
    process.env.BILLING_ENABLED = 'false';
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
        userId = response.body.user.id;
        accessToken = response.body.accessToken;
      });
  });

  it('register provisions an OWNER workspace', async () => {
    const prisma = app.get(PrismaService);
    const membership = await prisma.membership.findFirst({
      where: { userId, role: 'OWNER' },
      include: { workspace: true },
    });

    expect(membership).not.toBeNull();
    expect(membership?.workspace.name).toBe("E2E User's Workspace");
    workspaceId = membership!.workspaceId;
  });

  it('all billing controller endpoints return 404 while disabled', async () => {
    await Promise.all([
      request(app.getHttpServer()).get('/api/billing/plans').expect(404),
      request(app.getHttpServer())
        .get(`/api/billing/workspaces/${workspaceId}/subscription`)
        .expect(404),
      request(app.getHttpServer())
        .patch(`/api/billing/workspaces/${workspaceId}/subscription`)
        .send({ planCode: 'free' })
        .expect(404),
    ]);
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
        workspaceId,
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

  it('new link keeps user ownership and receives the owner workspace', async () => {
    const prisma = app.get(PrismaService);
    const link = await prisma.link.findUniqueOrThrow({ where: { id: linkId } });

    expect(link.userId).toBe(userId);
    expect(link.workspaceId).toBe(workspaceId);
  });

  it('GET /api/links returns workspace links', () => {
    return request(app.getHttpServer())
      .get(`/api/links?workspaceId=${workspaceId}`)
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

  it('provisions a fully isolated second tenant', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Second E2E User',
        email: secondTestEmail,
        password: testPassword,
      })
      .expect(201);

    secondAccessToken = response.body.accessToken;
    const prisma = app.get(PrismaService);
    const membership = await prisma.membership.findFirstOrThrow({
      where: { userId: response.body.user.id, role: 'OWNER' },
    });
    secondWorkspaceId = membership.workspaceId;
    expect(secondWorkspaceId).not.toBe(workspaceId);
  });

  it('rejects cross-tenant reads across secure workspace surfaces', async () => {
    const auth = { Authorization: `Bearer ${secondAccessToken}` };

    await Promise.all([
      request(app.getHttpServer())
        .get(`/api/links?workspaceId=${workspaceId}`)
        .set(auth)
        .expect(403),
      request(app.getHttpServer())
        .get(`/api/links/${linkId}`)
        .set(auth)
        .expect(403),
      request(app.getHttpServer())
        .get(`/api/analytics/overview?workspaceId=${workspaceId}`)
        .set(auth)
        .expect(403),
      request(app.getHttpServer())
        .get(`/api/analytics/links/${linkId}`)
        .set(auth)
        .expect(403),
      request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceId}`)
        .set(auth)
        .expect(403),
      request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceId}/domains`)
        .set(auth)
        .expect(403),
      request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceId}/api-keys`)
        .set(auth)
        .expect(403),
      request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceId}/webhooks`)
        .set(auth)
        .expect(403),
    ]);
  });

  it('rejects cross-tenant link mutations', async () => {
    const auth = { Authorization: `Bearer ${secondAccessToken}` };

    await request(app.getHttpServer())
      .patch(`/api/links/${linkId}`)
      .set(auth)
      .send({ title: 'Cross-tenant update' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/links/${linkId}/status`)
      .set(auth)
      .send({ status: 'DISABLED' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/api/links/${linkId}`)
      .set(auth)
      .expect(403);
  });

  it('returns not found for scoped API-key and webhook mutations', async () => {
    const firstAuth = { Authorization: `Bearer ${accessToken}` };
    const secondAuth = { Authorization: `Bearer ${secondAccessToken}` };

    const apiKeyResponse = await request(app.getHttpServer())
      .post(`/api/workspaces/${secondWorkspaceId}/api-keys`)
      .set(secondAuth)
      .send({ name: 'Second tenant key' })
      .expect(201);
    await request(app.getHttpServer())
      .delete(
        `/api/workspaces/${workspaceId}/api-keys/${apiKeyResponse.body.apiKey.id}`,
      )
      .set(firstAuth)
      .expect(404);

    const webhookResponse = await request(app.getHttpServer())
      .post(`/api/workspaces/${secondWorkspaceId}/webhooks`)
      .set(secondAuth)
      .send({
        url: 'https://example.com/second-tenant-webhook',
        events: ['link.created'],
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(
        `/api/workspaces/${workspaceId}/webhooks/${webhookResponse.body.webhook.id}`,
      )
      .set(firstAuth)
      .send({ active: false })
      .expect(404);
  });

  it('covers active, disabled, expired, and password redirect states', async () => {
    const auth = { Authorization: `Bearer ${accessToken}` };
    const unique = Date.now();

    const disabled = await request(app.getHttpServer())
      .post('/api/links')
      .set(auth)
      .send({
        workspaceId,
        originalUrl: 'https://example.com/disabled',
        customAlias: `disabled-${unique}`,
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/links/${disabled.body.link.id}/status`)
      .set(auth)
      .send({ status: 'DISABLED' })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/r/${disabled.body.link.shortCode}`)
      .expect(403)
      .expect('Content-Type', /html/);

    const expired = await request(app.getHttpServer())
      .post('/api/links')
      .set(auth)
      .send({
        workspaceId,
        originalUrl: 'https://example.com/expired',
        customAlias: `expired-${unique}`,
      })
      .expect(201);
    const prisma = app.get(PrismaService);
    await prisma.link.update({
      where: { id: expired.body.link.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    await request(app.getHttpServer())
      .get(`/api/r/${expired.body.link.shortCode}`)
      .expect(410)
      .expect('Content-Type', /html/);

    const protectedLink = await request(app.getHttpServer())
      .post('/api/links')
      .set(auth)
      .send({
        workspaceId,
        originalUrl: 'https://example.com/protected',
        customAlias: `protected-${unique}`,
        password: 'e2e-secret',
      })
      .expect(201);
    protectedShortCode = protectedLink.body.link.shortCode;

    await request(app.getHttpServer())
      .get(`/api/r/${protectedShortCode}`)
      .expect(401)
      .expect('Content-Type', /html/)
      .expect((response) => {
        expect(response.text).toContain('Şifre Gerekli');
      });
    await request(app.getHttpServer())
      .post(`/api/r/${protectedShortCode}`)
      .send({ password: 'wrong-password' })
      .expect(401)
      .expect('Content-Type', /html/);

    const unlocked = await request(app.getHttpServer())
      .post(`/api/r/${protectedShortCode}`)
      .send({ password: 'e2e-secret' })
      .expect(302)
      .expect('Location', 'https://example.com/protected');
    const passwordCookie = unlocked.headers['set-cookie'];
    expect(passwordCookie).toBeDefined();
    await request(app.getHttpServer())
      .get(`/api/r/${protectedShortCode}`)
      .set('Cookie', passwordCookie)
      .expect(302)
      .expect('Location', 'https://example.com/protected');
  });

  it('rate limits repeated password unlock attempts', async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(app.getHttpServer())
        .post(`/api/r/${protectedShortCode}`)
        .send({ password: 'wrong-password' })
        .expect(401);
    }

    await request(app.getHttpServer())
      .post(`/api/r/${protectedShortCode}`)
      .send({ password: 'wrong-password' })
      .expect(429);
  });
});
