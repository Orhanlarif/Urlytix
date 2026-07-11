# Deployment, Backup, Rollback, and Incident Runbook

## Ownership and prerequisites

Assign a release operator and incident commander before production changes. The target
must have encrypted storage, registry access, TLS ingress, environment-scoped secrets,
working alerts, enough free disk for a backup, and an immutable previous image tag.
Commands below assume `infra/.env` exists only on the host.

Never paste secret values into tickets, chat, command history, logs, or workflow
inputs. Database credentials come from the host secret store.

## Standard release

1. Confirm CI passed for the exact 40-character commit SHA.
2. Review migrations. They must use expand/contract and remain compatible with the
   currently running image.
3. Record current image tags and deployment status.
4. Create and verify a pre-deploy backup.
5. Pull API, migration, and web images by commit SHA.
6. Run migrations once.
7. Start API/web and wait for health checks.
8. Verify `/api/health`, login, link list, and one controlled redirect.
9. Watch errors, redirect latency, saturation, and database health for at least
   15 minutes. Mark the release complete only after the observation window.

```sh
docker compose --env-file infra/.env -f infra/compose.yaml pull
docker compose --env-file infra/.env -f infra/compose.yaml --profile release run --rm migrate
docker compose --env-file infra/.env -f infra/compose.yaml up -d --remove-orphans api web
docker compose --env-file infra/.env -f infra/compose.yaml ps
```

The generic CD workflow calls an environment-protected deployment hook. That hook must
implement these steps and return failure unless backup, migration, rollout, and smoke
checks succeed. Configure `NEXT_PUBLIC_API_URL` as a GitHub environment variable and
`DEPLOY_TOKEN` as an environment secret. Configure `DEPLOY_HOOK_URL` as a protected
environment variable; do not encode credentials in it.

## PostgreSQL backup

Use provider-native snapshots/PITR when available. For the Compose deployment, create
a compressed logical backup in the mounted `/backups` volume:

```sh
backup="urlytics-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose --env-file infra/.env -f infra/compose.yaml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "infra/$backup"
test -s "infra/$backup"
```

Move the dump immediately to encrypted, access-controlled object storage; do not
commit it or leave it on an operator laptop. Record timestamp, database, application
SHA, size, and checksum. Retain daily backups for 7 days, weekly for 5 weeks, and
monthly for 12 months unless legal/privacy policy requires less. Alert on missed
backups and test a restore quarterly.

## Restore drill or disaster recovery

Restore into a new empty database first; do not overwrite production during a test.
Stop application writes, create a final backup if possible, then:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml exec -T postgres \
  sh -c 'dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose --env-file infra/.env -f infra/compose.yaml exec -T postgres \
  sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
  < infra/replace-with-approved-backup.dump
```

Run `prisma migrate status` using the migration image, start the matching application
SHA, and execute smoke and tenant-isolation checks. Document achieved RPO/RTO and
delete drill data securely.

## Application rollback

Rollback is image-first. Set `IMAGE_TAG` in the host environment to the previous known
good SHA and redeploy API/web. Do not automatically reverse database migrations.

```sh
docker compose --env-file infra/.env -f infra/compose.yaml up -d --no-build api web
```

If an additive migration was applied, leave it in place. If the old image is not
schema-compatible, roll forward with a corrective migration. Restore a backup only
for confirmed destructive/corrupting changes and accept that writes after the backup
time may be lost. The incident commander must approve a production restore.

## Incident response

1. Acknowledge the alert, assign incident commander and communications owner, and
   timestamp the incident.
2. Assess user impact using SLO signals, not only host health.
3. Stop risky deployment work. Preserve logs and deployment/database timelines.
4. Mitigate: rollback image, disable a failing dependency/feature, reduce traffic, or
   scale within known limits. Avoid ad-hoc production data edits.
5. Verify recovery using external health, redirect, auth, and tenant-scoped checks.
6. Communicate impact and next update time without exposing sensitive details.
7. After recovery, create a blameless review with root cause, detection gap, timeline,
   customer impact, and owned corrective actions.

### Common triage

- **API unhealthy:** inspect API logs and database readiness; check migration status,
  connection limits, disk, and recent deployment SHA.
- **Redirect latency/errors:** compare API/database latency, hot short codes, rate
  limiting, connection pool, and click-write pressure. Protect redirect availability
  before analytics freshness.
- **Database saturation:** stop nonessential analytics jobs/queries, inspect locks and
  slow queries, then scale only with an explicit capacity plan.
- **Suspected credential exposure:** revoke/rotate the credential, invalidate affected
  sessions or keys, inspect access logs, and notify security ownership. Never paste the
  exposed value into the incident record.
- **Bad migration:** stop rollout; prefer a forward-compatible corrective migration.
  Restore only when data integrity requires it.
