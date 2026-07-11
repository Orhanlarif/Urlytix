# Urlytics Product Status and Roadmap

Last reviewed: 2026-07-11

This is the canonical product-status document. `PROJECT_STATUS.md` only points here so
status and priorities cannot drift between two lists.

## Product goal

Urlytics is a multi-tenant SaaS for creating short links, managing their lifecycle,
and understanding traffic. The repository now includes the first workspace, billing,
API-key, webhook, and session foundations; production hardening remains the release
boundary.

## Current release: MVP

Implemented and verified in the repository:

- JWT registration, login, and authenticated profile
- Cookie-based access/refresh sessions, refresh rotation, logout, and profile update
- Authenticated link create, list, detail, update, status change, and delete
- Paginated/searchable link lists and bounded analytics date-range inputs
- Public redirect with expiration/disabled handling
- Click capture, unique-visitor cookie logic, QR codes, and link analytics
- Dashboard overview and per-link analytics
- Workspace/member foundations with role checks
- Workspace API-key creation/list/revocation with hashed credentials
- Webhook subscription management and billing plan/subscription foundations
- DNS TXT verified custom-domain management and daily click rollups
- Redis/BullMQ click ingestion with synchronous development fallback
- PostgreSQL/Prisma persistence, validation, rate limiting, security headers, CORS,
  health check, backend tests, and GitHub CI

Known constraints:

- Redis-backed click ingestion runs in-process; the worker should be deployed
  independently once measured traffic requires isolated scaling.
- Link ownership remains user-first while nullable workspace ownership is introduced;
  tenant migration and workspace-scoped link APIs are not complete.
- Webhook delivery, external billing-provider checkout/reconciliation, and granular
  API-key scopes are not implemented.
- Analytics aggregation performs operational queries and needs profiling/index review
  before materially higher traffic.
- Error tracing, metrics, production alerts, backups, and automated deployment are
  documented in this milestone but require environment provisioning and secret setup.

## Delivery priorities

### P0 — production readiness

- [x] Define production API/web container images and staging/production Compose sample
- [x] Add migration validation to CI and provide a guarded CD workflow
- [x] Document backup, restore, rollback, incident runbook, observability, and SLOs
- [x] Publish a dependency-free OpenAPI contract for current and planned API surfaces
- [ ] Provision staging and execute restore plus rollback drills
- [ ] Connect metrics, centralized logs, tracing/error tracking, and SLO alerts
- [ ] Run load tests for redirects and analytics reads; establish capacity limits

### P1 — account and link completeness

- [ ] Add password-protected links with rate-limited password verification
- [x] Add profile settings and refresh-token rotation/revocation
- [x] Add pagination/filtering to link lists and analytics date-range controls
- [ ] Add password change, account deletion, and active-session management

### P2 — multi-tenant platform

- [x] Introduce workspace, membership, and role foundations
- [ ] Add invitation lifecycle and complete role-management endpoints
- [ ] Move link ownership from user to workspace with an explicit migration
- [x] Add workspace-scoped API-key creation/list/revocation with hashed secrets
- [ ] Add granular API-key scopes and last-used auditing
- [x] Add webhook subscription management
- [ ] Add signed, retryable webhook delivery with delivery history
- [x] Add local plan and subscription foundations
- [x] Add DNS TXT verified custom-domain management
- [ ] Add usage enforcement, invoices, checkout, and signed provider webhooks

### P3 — asynchronous analytics

- [ ] Introduce a transactional outbox and idempotent analytics jobs
- [x] Add a queue adapter behind a module interface
- [ ] Add an independently deployable worker entrypoint only after job contracts exist
- [x] Add daily pre-aggregated click counters
- [ ] Add retention policies based on measured load

## Release gates

A production release requires:

1. CI lint, migration validation/deploy on an empty database, unit tests, E2E tests,
   and builds all pass.
2. The image is immutable and identified by commit SHA.
3. Database backup is verified before migrations.
4. Migrations are backward compatible with the previously running application.
5. Health checks and a redirect smoke test pass after deployment.
6. Rollback ownership and the previous image reference are known.
7. OpenAPI and runbooks are updated when behavior or operations change.

## Success indicators

- Redirect availability and latency meet the SLOs in `docs/observability-slo.md`.
- No tenant can read or mutate another tenant's resources.
- Restore and application rollback drills pass at least quarterly.
- Product delivery can add workspace and billing modules without splitting the
  operational database prematurely.