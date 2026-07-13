# Staging provisioning checklist

External staging is an operator action. The repository provides images, Compose,
release gate, restore drill, and runbooks — it cannot create your cloud account.

## Provision once

1. Create a dedicated host or Compose project (`COMPOSE_PROJECT_NAME=urlytix-staging`).
2. Copy `infra/.env.example` → `infra/.env` on the host; inject secrets from the host
   secret store (never commit them).
3. Point staging DNS at the TLS terminator for web + API (prefer same-host `/api`
   routing; see `docs/architecture.md`).
4. Authenticate the host to GHCR (or your registry) and set `IMAGE_TAG` to a CI-passed
   40-character SHA.
5. Configure GitHub Environment `staging` with `NEXT_PUBLIC_API_URL`, `DEPLOY_HOOK_URL`,
   and `DEPLOY_TOKEN` if using `.github/workflows/cd.yml`.
6. Optional observability: set `SENTRY_DSN`, `METRICS_TOKEN`, `APP_VERSION`/`GIT_SHA`.

## Validate before promoting to production

```sh
docker compose --env-file infra/.env -f infra/compose.yaml config --quiet
# deploy candidate SHA using the runbook
STAGING_CONFIRM=urlytix-staging \
STAGING_API_URL=https://staging-api.example.invalid/api \
DATABASE_URL=postgresql://from-secret-store \
pnpm release:staging:gate
```

## Quarterly drills

| Drill | Command / procedure |
| --- | --- |
| Local restore path | `pnpm ops:restore-drill` (Docker Postgres) |
| Staging restore | Follow `docs/runbook.md` restore into a new database |
| Application rollback | Set previous `IMAGE_TAG`, redeploy API/web only |

Mark staging “ready” only when the release gate and at least one restore drill have
operator-recorded output (no secrets in the record).
