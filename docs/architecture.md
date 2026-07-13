# Architecture

Status: target architecture, reviewed 2026-07-11. Current-versus-planned product scope
is tracked in `ROADMAP.md`; the API contract marks planned operations with
`x-urlytix-status`.

## System context

- `apps/web`: Next.js App Router user interface. It calls the REST API through the
  web service layer and never accesses the database.
- `apps/api`: NestJS modular monolith. Controllers own HTTP concerns, services own
  application rules, and Prisma is the only database adapter.
- PostgreSQL: transactional source of truth for identity, links, clicks, and future
  tenant/billing metadata.
- Redis/queue: a planned ephemeral coordination and job transport dependency, not a
  source of truth.
- Worker: planned deployment extracted from the API codebase only after durable job
  contracts and an executable entrypoint exist.

The browser, API, and worker are separate trust zones. Only the API and worker may
hold database credentials. The web image receives only public build-time settings.

## Target modular monolith

The API remains one deployable while boundaries mature:

- **Auth**: credentials, token issuance, session lifecycle.
- **Users/settings**: profile, password and account lifecycle.
- **Workspaces**: tenant, membership, invitation and role authorization.
- **Links**: link lifecycle, alias uniqueness, redirect policy.
- **Analytics**: event ingestion, aggregation and reporting.
- **API keys**: workspace-scoped machine identity and authorization.
- **Webhooks**: subscriptions, signing and delivery state.
- **Billing**: plans, subscriptions, entitlements and provider reconciliation.
- **Platform**: configuration, health, logging, metrics, database and queue adapters.

Modules may call another module's exported application service or consume a domain
event. They must not reach into another module's controller, private service, or
Prisma query. Workspace, membership, subscription, API-key, and webhook persistence
now exists. Links retain required user ownership plus optional workspace ownership
during transition; the target is workspace-primary ownership with membership
authorization and an explicit backfill/constraint migration.

One PostgreSQL database and one Prisma schema remain the default. Service-specific
databases would add distributed transactions without a demonstrated scaling need.

## Queue and worker extraction boundary

Keep work synchronous when the response requires its result: authorization, alias
reservation, link state evaluation, and redirect lookup. Move work behind a durable
job boundary when it can be retried and completed after the response:

- click enrichment and rollups
- webhook delivery
- billing-provider reconciliation
- retention cleanup and exports

The redirect path should eventually write the minimum click/outbox record in the same
transaction and return the redirect. A relay publishes committed outbox records to
the queue. Workers process versioned payloads idempotently. Each job has an immutable
event ID, schema version, retry policy, timeout, dead-letter policy, and trace context.
Database unique constraints or an inbox table enforce idempotency.

Do not create a worker container that runs `dist/main`: that would start a second HTTP
API. Extraction is allowed only when a dedicated worker bootstrap exists, gracefully
stops queue consumption, exposes operational health, and has independent scaling and
rollback instructions.

## Data flows

### Authenticated management

1. Browser sends credentials or bearer token to `/api`.
2. API validates the DTO, authenticates identity, and resolves ownership/tenant.
3. Application service applies policy and writes through Prisma.
4. API returns a schema-defined response; secrets and password hashes are excluded.

### Redirect and click

Current flow:

1. Client requests `/{shortCode}` (pretty public URL). Legacy `/api/r/{shortCode}`
   remains supported.
2. API rate-limits, loads the link, checks status/expiry, records click metadata, and
   sets an opaque visitor cookie when needed.
3. API returns an HTTP redirect or a safe error page.

Target flow:

1. API performs lookup and policy checks.
2. API transaction stores a minimal click plus outbox event.
3. API redirects without waiting for enrichment.
4. Relay/worker enriches and aggregates the event idempotently.

### Analytics read

The API authorizes ownership first, queries operational data/aggregates, and returns
only tenant-scoped results. Date ranges and pagination must be bounded. Precomputed
rollups may be introduced after profiling without changing the public contract.

### Billing and webhooks

Provider callbacks are authenticated from the raw body, deduplicated by provider
event ID, persisted, and acknowledged quickly. Reconciliation runs asynchronously.
Outgoing webhooks use per-subscription secrets, timestamped signatures, bounded
retries, and delivery logs with redacted payloads.

## Security model

- TLS terminates at the trusted ingress; forwarded headers are accepted only from that
  proxy. HSTS is enabled at ingress.
- Production config fails closed: strong JWT/database/provider secrets come from the
  deployment secret store and are never built into images or committed.
- DTO allow-list validation, response shaping, parameterized Prisma queries, CORS
  allowlists, security headers, and endpoint-specific rate limits are mandatory.
- Authorization is resource- and workspace-scoped; knowing an ID is never sufficient.
- Passwords use an adaptive password hash. API keys and webhook secrets are displayed
  once and stored hashed/encrypted according to lookup needs.
- Logs exclude tokens, cookies, passwords, API keys, full IP addresses, payment data,
  and webhook secrets. Visitor/IP identifiers are pseudonymous and retention-bound.
- Billing callbacks require signature verification and replay protection. Redirect
  destinations allow only supported schemes and are validated against abuse policy.
- Backups are encrypted, access-controlled, retention-limited, and restore-tested.
- Dependency/image scanning and least-privilege, non-root containers are release gates.

### Auth cookies and split web/API hosts

Browser sessions use httpOnly `access_token` (15 minutes) and rotating
`refresh_token` (30 days) cookies set by the API (`apps/api/src/auth/auth.controller.ts`).
Defaults today: `httpOnly`, `sameSite=lax`, `secure` in production, and optional
`COOKIE_DOMAIN` when explicitly configured for split hosts.

| Deployment shape | What works |
| --- | --- |
| Same registrable host via reverse proxy (e.g. `app.example.com` → web, `app.example.com/api` → API) | Host-only cookies work. Prefer this for production. |
| Localhost with different ports (`:3000` web, `:4000` API) | Browsers treat localhost as one site across ports; cookies work in development. |
| Distinct web and API hostnames (`app.example.com` + `api.example.com`) | Host-only cookies set by the API **are not sent** to the web origin. Next.js proxy auth gates that read `access_token` on the web host will redirect to login in a loop. |

**Production recommendation:** terminate TLS at one public host and path-route `/api` to
the Nest service so cookies stay host-only. If you must use separate API and web
hostnames, set `COOKIE_DOMAIN` to the shared parent (e.g. `.example.com`) with HTTPS,
CSRF-aware `SameSite`/`Secure` settings, and a matching CORS allowlist — do not enable a
parent domain on localhost.

## Availability and change safety

The API exposes liveness/readiness semantics through `/api/health`; orchestration must
not route traffic until database readiness succeeds. Migrations run as a one-off
release step, never concurrently in every API replica. Expand/contract migrations keep
the previous image compatible through rollback. See `docs/runbook.md` and
`docs/observability-slo.md`.

## Architecture decision records

### ADR-001 — Modular monolith first

**Decision:** use one NestJS deployable and PostgreSQL database with enforced module
boundaries. **Reason:** current scale and team size benefit from atomic changes and
transactions. **Revisit when:** a measured scaling, ownership, or isolation constraint
cannot be solved by module-level tuning or independent workers.

### ADR-002 — PostgreSQL is the source of truth

**Decision:** durable business state is committed to PostgreSQL through Prisma; Redis
and queues are disposable transports/caches. **Consequence:** queue loss can be
recovered from the outbox and no entitlement depends only on cache state.

### ADR-003 — Transactional outbox before async extraction

**Decision:** do not dual-write database and queue from request handlers. Persist an
outbox event with the state change, then publish asynchronously. **Consequence:** jobs
are at-least-once and consumers must be idempotent.

### ADR-004 — Worker is a separate entrypoint, not a copied API

**Decision:** publish a worker image only after a dedicated bootstrap and job contracts
exist. **Consequence:** current infrastructure deliberately builds API and web only.

### ADR-005 — Contract-first public surface

**Decision:** `docs/openapi.yaml` is the dependency-free source contract for current
and planned REST endpoints. Implemented operations are distinguished from planned
ones with `x-urlytix-status`; CI must keep the YAML parseable.

### ADR-006 — Backward-compatible database delivery

**Decision:** production schema changes use expand/migrate/contract. Destructive
contract steps ship only after old code no longer reads the field. **Consequence:**
application rollback remains possible after most migration releases.