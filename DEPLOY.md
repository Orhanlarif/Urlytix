# Deployment Guide

Bu doküman Urlytix'i production ortamına deploy etmek için adım adım rehberdir.

## Mimari

| Bileşen | Önerilen Platform | Port |
|---------|-------------------|------|
| Frontend (Next.js) | Vercel | 443 |
| Backend (NestJS) | Railway / Fly.io / VPS | 4000 |
| PostgreSQL | Neon / Supabase / Railway | 5432 |

## 1. Veritabanı

1. Managed PostgreSQL oluştur (Neon, Supabase veya Railway).
2. Connection string'i kopyala.
3. Production'da migration, workspace backfill ve doğrulamayı tek gate olarak çalıştır:

```bash
DATABASE_URL="postgresql://..." pnpm --filter api deploy:database
```

## 2. Backend (API)

### Environment Variables

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:pass@host:5432/urlytix_db
JWT_SECRET=<en-az-32-karakter-rastgele-secret>
REDIS_URL=rediss://cache-host:6379
CORS_ORIGINS=https://yourdomain.com
SHORT_URL_BASE=https://api.yourdomain.com
BILLING_ENABLED=false
PLATFORM_ADMIN_EMAILS=you@example.com
```

`PLATFORM_ADMIN_EMAILS` içindeki hesaplar API boot / `/auth/me` sırasında
`SUPER_ADMIN` yapılır; production admin paneli (`/admin`) için gereklidir.

Kısa linkler `https://api.yourdomain.com/abc1234` biçiminde üretilir (`/api/r` yolu public URL'de görünmez).

### Deploy adımları

```bash
cd apps/api
pnpm install
pnpm exec prisma generate
pnpm deploy:database
pnpm build
pnpm start:prod
```

`deploy:database` migrationları uygular, legacy workspace backfill'ini idempotent
şekilde çalıştırır ve workspace'e bağlı olmayan link kalmışsa deploy'u durdurur.
Yeni kayıtlar aynı transaction içinde kullanıcıya OWNER rolüyle varsayılan
workspace oluşturur.

### Health check

Deploy sonrası kontrol et:

```bash
curl https://api.yourdomain.com/api/health
```

Beklenen yanıt:

```json
{
  "status": "ok",
  "app": "Urlytix API",
  "database": "connected",
  "timestamp": "..."
}
```

## 3. Frontend (Web)

### Environment Variables

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

Web oturumu API'nin yönettiği httpOnly `access_token` ve `refresh_token`
cookie'lerine dayanır. Web ve API hostlarını aynı site altında tut; API
`CORS_ORIGINS` değeri web origin'ini birebir içermeli ve credential'lı istekleri
kabul etmelidir.

`NEXT_PUBLIC_SITE_URL` sitemap, robots.txt, Open Graph ve JSON-LD için kanonik
site origin'idir (trailing slash olmadan).

### Vercel deploy

1. Repo'yu Vercel'e bağla.
2. Root directory: `apps/web`
3. Build command: `pnpm build` (monorepo root'tan) veya Vercel'de `cd ../.. && pnpm --filter web build`
4. `NEXT_PUBLIC_API_URL` ve `NEXT_PUBLIC_SITE_URL` env variable'larını ekle.

## 4. DNS & Domain

| Kayıt | Tip | Hedef |
|-------|-----|-------|
| `yourdomain.com` | CNAME/A | Vercel |
| `api.yourdomain.com` | CNAME/A | API sunucusu |

Deploy sonrası `SHORT_URL_BASE` ve `CORS_ORIGINS` değerlerini production domain'lerine güncelle.

## 5. Pre-deploy Checklist

- [ ] `JWT_SECRET` güçlü ve benzersiz
- [ ] `DATABASE_URL` production DB'ye işaret ediyor
- [ ] `SHORT_URL_BASE` production API URL'si
- [ ] `CORS_ORIGINS` production frontend URL'si
- [ ] `pnpm --filter api deploy:database` başarılı (migrate → backfill → verify)
- [ ] `/api/health` → `database: connected`
- [ ] HTTPS aktif (hem API hem web)
- [ ] Kısa link redirect test edildi
- [ ] Login / register / dashboard akışı test edildi
- [ ] `pnpm release:staging:gate` kontrollü staging URL/secret'larıyla başarılı
- [ ] `pnpm ops:restore-drill` veya staging restore çıktısı kaydedildi
- [ ] `SENTRY_DSN` / `METRICS_TOKEN` (veya eşdeğer platform telemetry) ayarlandı
- [ ] `docs/security-review.md` launch checklist gözden geçirildi

## 6. CI/CD

Repo'da GitHub Actions CI pipeline mevcut (`.github/workflows/ci.yml`):

- Lint (API + Web)
- Unit tests
- E2E tests (PostgreSQL service container ile)
- Build
- Playwright web E2E release gate (Chromium)

Her push ve PR'da otomatik çalışır.

### Lokal CI simülasyonu

```bash
pnpm db:up
pnpm db:migrate:deploy
pnpm run ci
```

## 7. Monitoring

Production telemetry hooks shipped in the API:

- **Structured JSON logs** when `NODE_ENV=production` (ship stdout to your platform)
- **Error tracking** — set `SENTRY_DSN` (and ideally `APP_VERSION`/`GIT_SHA`)
- **Metrics** — scrape `GET /api/metrics` with `Authorization: Bearer $METRICS_TOKEN`
- **Uptime** — probe `/api/health` every minute (UptimeRobot, Better Stack, etc.)

See `docs/observability-slo.md` for SLOs and alert policy.

## 8. Backup

Managed PostgreSQL sağlayıcılar genelde otomatik backup sunar. Ek olarak:

- Günlük otomatik backup aktif et
- Migration öncesi manuel snapshot al
- Restore prosedürünü test et

## 9. Güvenlik Notları

- API rate limiting aktif (auth: 10/dk, redirect: 200/dk)
- Helmet HTTP security headers aktif
- IP adresleri hash'lenerek saklanır
- JWT 7 gün geçerli — production'da gerekirse süreyi kısalt

## 10. Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| CORS hatası | `CORS_ORIGINS` frontend URL'sini içermeli |
| Kısa link localhost'a gidiyor | `SHORT_URL_BASE` production URL olmalı |
| Health check DB disconnected | `DATABASE_URL` ve firewall kurallarını kontrol et |
| 401 oturum hatası | JWT secret deploy'lar arası tutarlı olmalı |
| Migration hatası | `pnpm db:migrate:deploy` ile schema güncelle |
