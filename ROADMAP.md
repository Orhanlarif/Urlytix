# Urlytics Product Quality Plan

Last reviewed: 2026-07-12

This is the canonical product-status and product-quality document.
`PROJECT_STATUS.md` only points here so status and priorities cannot drift between
two lists.

Urlytics will not move forward by blindly adding the next roadmap feature. The
current priority is to turn the working product into a polished, reliable,
professional SaaS experience. New feature work should wait until the core flows,
production readiness, and user experience are strong enough to support them.

## Product goal

Urlytics is a multi-tenant SaaS for creating short links, managing their lifecycle,
and understanding traffic. The first product phase should feel complete and
trustworthy without relying on paid plans, advanced automation, or extra modules.

The product standard is:

- Core link, auth, analytics, workspace, and settings flows must be dependable.
- The UI must be clean, modern, responsive, and easy for non-technical users.
- Empty states, loading states, errors, and confirmations must feel intentional.
- Production concerns such as security, observability, backups, rollback, and test
  coverage are part of the product, not afterthoughts.
- Billing, quotas, webhook delivery, invitations, and other expansion features are
  deferred until the base product quality is high.

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
- Transactional default owner-workspace provisioning and legacy-user backfill
- Workspace API-key creation/list/revocation with hashed credentials
- Webhook subscription management; dormant billing plan/subscription foundations
- DNS TXT verified custom-domain management and daily click rollups
- Redis/BullMQ click ingestion with synchronous development fallback
- PostgreSQL/Prisma persistence, validation, rate limiting, security headers, CORS,
  health check, backend tests, and GitHub CI

Known constraints:

- Redis-backed click ingestion runs in-process; the worker should be deployed
  independently once measured traffic requires isolated scaling.
- Link rows retain required user ownership and nullable workspace ownership for
  backward-compatible deployment, but link and analytics APIs authorize strictly
  through workspace membership. Deploy verification rejects remaining orphan links.
- Billing endpoints are hidden with 404 by default (`BILLING_ENABLED=false`).
  Payment, subscription, and quota behavior is outside the free first phase.
- Webhook delivery and granular API-key scopes are not implemented.
- Analytics aggregation performs operational queries and needs profiling/index review
  before materially higher traffic.
- Error tracing, metrics, production alerts, backups, and automated deployment are
  documented in this milestone but require environment provisioning and secret setup.

## Delivery priorities

### P0 — core product excellence

- [x] Audit all existing user flows end to end: registration, login, dashboard,
  link creation, link management, redirect, analytics, settings, and workspace
  switching
- [ ] Fix broken, confusing, or inconsistent behavior before adding any new feature
- [ ] Standardize validation, error messages, success messages, and loading states
  across the API and web app
- [ ] Improve empty states and first-run guidance so a new user understands what to
  do immediately
- [ ] Review responsive behavior for dashboard, link tables, analytics, settings,
  and navigation
- [ ] Make destructive actions clear and safe with confirmations and predictable
  recovery paths
- [ ] Remove or hide unfinished surfaces that create a less professional impression

#### Current stabilization backlog

- [x] Remove visible unfinished settings surfaces from the product UI
- [x] Centralize analytics page copy in the shared i18n system
- [x] Prevent webhook secret hashes from being returned by management APIs
- [x] Fix the mobile first-workspace creation dead end
- [x] Finish workspace tenancy migration and remove user-only analytics fallbacks
- [x] Add two-user cross-tenant E2E coverage for links, analytics, workspaces,
  domains, API keys, and webhooks
- [x] Harden runtime config so weak/default secrets cannot be used accidentally
- [x] Make scoped mutations fail loudly when records do not belong to the workspace
- [x] Add retry-capable error states for dashboard, analytics, workspace loading,
  and settings tabs
- [x] Sweep locale/date/copy consistency across auth, metadata, modals, API errors,
  and analytics displays
- [x] Improve dashboard/analytics data presentation with in-shell loading,
  empty-chart guidance, and richer analytics breakdowns
- [x] Clean generated `apps/api/dist` artifacts from the working tree and protect
  source control from build output noise
- [x] Stop treating failed login/2FA 401s as session expiry force-logout
- [x] Sanitize post-login/register `redirect` query to same-origin paths only
- [x] Normalize auth emails case-insensitively; keep `totpEnabled` on profile update
- [x] Reactivate links when expiration is cleared; sync expired status on list/unlock
- [x] Avoid infinite shell-less loading when the user has no workspace
- [x] Confirm before deactivating links; copy short URL after create; invalidate
  caches after detail delete; open expiry edit via `?tab=settings`
- [x] Hide domain Verify for non-admin roles; show reset-password missing-token state
- [x] Localize API error messages to the active UI language (EN/TR)
- [x] Align analytics breakdowns (device/referrer/geo/top links) with the selected
  date range instead of recent-click samples
- [x] Improve public redirect error/password pages (locale + web app home CTA)
- [ ] Finish 2FA backup-code save/copy UX and password-rule hints on reset/change forms
- [ ] Document or configure cookie Domain for split web/API production hosts

### P1 — UX and visual polish

- [ ] Establish a consistent SaaS visual system for spacing, typography, colors,
  cards, tables, forms, buttons, badges, modals, and navigation
- [ ] Polish dashboard information hierarchy so the most important metrics and
  actions are obvious
- [ ] Improve link list usability with clearer search, filters, row actions, status
  indicators, and mobile behavior
- [ ] Improve analytics screens with readable charts, date ranges, explanations,
  and graceful no-data states
- [ ] Polish settings and workspace screens so account, workspace, and API-key areas
  feel coherent
- [ ] Review English and Turkish copy for clarity, consistency, and professional tone

### P2 — production readiness

- [x] Define production API/web container images and staging/production Compose sample
- [x] Add migration validation to CI and provide a guarded CD workflow
- [x] Document backup, restore, rollback, incident runbook, observability, and SLOs
- [x] Publish a dependency-free OpenAPI contract for current API surfaces
- [ ] Provision staging and execute restore plus rollback drills
- [ ] Connect metrics, centralized logs, tracing/error tracking, and SLO alerts
- [ ] Run load tests for redirects and analytics reads; establish capacity limits
- [ ] Review API security, CORS, cookies, rate limits, headers, and tenant isolation
  before production launch
- [ ] Ensure CI lint, tests, migrations, builds, and E2E coverage represent the real
  release standard

### P3 — technical quality and maintainability

- [ ] Review API/service boundaries so controllers stay thin and business logic
  remains testable
- [ ] Strengthen tests around auth, links, analytics, workspace isolation, API keys,
  and critical UI flows
- [ ] Profile redirect and analytics queries; add indexes or query changes only when
  evidence shows they are needed
- [ ] Keep generated build artifacts out of source control unless intentionally
  required by deployment
- [ ] Simplify unfinished or over-complicated code paths that are not needed for the
  first polished release

### Later — expansion features

These items are valuable, but should not distract from the current goal:

- Password-protected links with rate-limited password verification
- Password change, account deletion, and active-session management
- Workspace invitations and complete role-management endpoints
- Full workspace-scoped link ownership migration
- Granular API-key scopes and last-used auditing
- Signed, retryable webhook delivery with delivery history
- Transactional outbox and independently deployable analytics worker
- Retention policies based on measured load
- Billing, subscriptions, quotas, and paid-plan enforcement

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