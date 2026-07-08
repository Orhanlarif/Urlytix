# Urlytics SaaS

Urlytics, kullanıcıların kısa link oluşturup bu linkler üzerinden detaylı analytics (tıklama, cihaz, lokasyon vb.) almasını sağlayan modern bir SaaS uygulamasıdır.

## Tech Stack

- Frontend: Next.js (App Router)
- Backend: NestJS
- Database: PostgreSQL
- ORM: Prisma
- Package Manager: pnpm
- Container: Docker

## Features

- Authentication (JWT)
- Link shortening
- Analytics tracking
- QR code generation
- Dashboard

## Local Development

### 1. Clone repo

```bash
git clone <repo-url>
cd urlytics-saas
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Start database

```bash
pnpm db:up
```

### 4. Configure environment

**API** — copy and edit:

```bash
cp apps/api/.env.example apps/api/.env
```

**Web** — copy and edit:

```bash
cp apps/web/.env.example apps/web/.env.local
```

| Variable | App | Description |
|----------|-----|-------------|
| `DATABASE_URL` | API | PostgreSQL connection string |
| `JWT_SECRET` | API | Secret for signing JWT tokens |
| `CORS_ORIGINS` | API | Comma-separated frontend URLs |
| `SHORT_URL_BASE` | API | Public base URL for short links |
| `NEXT_PUBLIC_API_URL` | Web | API base URL (e.g. `http://localhost:4000/api`) |

### 5. Run migrations

```bash
cd apps/api
pnpm exec prisma migrate dev
```

### 6. Start development servers

```bash
# From project root
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000
- Health check: http://localhost:4000/api/health

## Production Deployment

### Recommended setup

| Service | Platform |
|---------|----------|
| Frontend (Next.js) | Vercel |
| Backend (NestJS) | Railway / Fly.io / VPS |
| Database | Neon / Supabase / Railway PostgreSQL |

### API environment (production)

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
JWT_SECRET=<long-random-secret>
CORS_ORIGINS=https://yourdomain.com
SHORT_URL_BASE=https://api.yourdomain.com/api/r
```

### Web environment (production)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### Pre-deploy checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Set `SHORT_URL_BASE` to production API URL
- [ ] Set `CORS_ORIGINS` to production frontend URL
- [ ] Run `pnpm exec prisma migrate deploy` on API
- [ ] Verify `/api/health` returns `database: connected`

## Scripts

```bash
pnpm dev          # Start web + api in parallel
pnpm dev:web      # Start frontend only
pnpm dev:api      # Start backend only
pnpm db:up        # Start PostgreSQL via Docker
pnpm db:down      # Stop Docker services
```

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned features.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for production deployment guide.

## CI

GitHub Actions runs lint, test, e2e, and build on every push/PR. Locally:

```bash
pnpm ci
```
