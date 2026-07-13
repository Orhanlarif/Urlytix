# CI release standard

GitHub Actions workflow `.github/workflows/ci.yml` is the canonical release gate for
every push/PR to `main`/`master`. A commit SHA is production-eligible only when this
workflow is green for that exact SHA.

## Required checks (must all pass)

1. Dependency install with frozen lockfile
2. Prisma generate + validate
3. Migration deploy onto an empty PostgreSQL 16 service + migrate status
4. OpenAPI YAML parse (`docs/openapi.yaml`)
5. Lint (shared, API, web)
6. Unit tests (API + web)
7. API E2E tests
8. Production build
9. Playwright web E2E (Chromium)
10. Production Docker image builds (API runtime, migration, web)

## Local equivalent

```sh
pnpm db:up
pnpm db:migrate:deploy
pnpm run ci
```

`pnpm run ci` covers lint/tests/build/e2e. Docker image builds and the empty-DB
migration service container remain CI-runner concerns; run image builds locally when
changing Dockerfiles:

```sh
docker build --file infra/docker/api.Dockerfile --target runtime --tag urlytix-api:local .
docker build --file infra/docker/api.Dockerfile --target migration --tag urlytix-migrate:local .
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:4000/api --file infra/docker/web.Dockerfile --target runtime --tag urlytix-web:local .
```

## CD relationship

`.github/workflows/cd.yml` builds immutable SHA-tagged images and calls a guarded
deploy hook. It must not replace CI. Deploy operators still follow `docs/runbook.md`
(backup → migrate → rollout → smoke).
