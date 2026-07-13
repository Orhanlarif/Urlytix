# Security review — production launch gate

Last reviewed: 2026-07-13

This checklist is the launch-facing review for CORS, cookies, rate limits, headers,
and tenant isolation. Re-run before the first production cutover and after material
auth or tenancy changes.

## Verdict

**Pass for a first free-tier launch**, provided operators use the recommended same-host
cookie deployment (or set `COOKIE_DOMAIN` deliberately for split hosts) and keep
billing disabled.

## Controls reviewed

| Area | Status | Evidence |
| --- | --- | --- |
| CORS allowlist | Pass | `AppConfigService.corsOrigins`; production requires HTTPS origins without path/credentials |
| Security headers | Pass | Helmet in `main.ts` (CSP, frame ancestors none, referrer no-referrer) |
| Auth cookies | Pass | httpOnly, SameSite=lax, Secure in production; optional `COOKIE_DOMAIN` |
| Refresh cookie path | Pass | Refresh scoped to `/api/auth` |
| Rate limits | Pass | Global 100/min; auth 5–20/min; redirect 200/min; password unlock 5/min |
| Swagger in production | Pass | Disabled when `NODE_ENV=production` |
| Weak secret rejection | Pass | Production JWT secret entropy/default checks |
| Tenant isolation | Pass | Workspace membership checks; E2E cross-tenant rejection coverage in `apps/api/test/app.e2e-spec.ts` |
| API key storage | Pass | Hashed credentials; secrets not returned after create |
| IP handling | Pass | Visitor/IP hashing for click analytics; `trust proxy` enabled once |
| Error leakage | Pass | Global filter returns localized messages; stack only in server logs / optional Sentry |

## Cookie / host deployment rule

1. **Preferred:** one public host with `/api` path-routed to Nest (host-only cookies).
2. **Split hosts:** set `COOKIE_DOMAIN=.example.com` only when web and API share that
   parent domain, HTTPS is enforced, and CORS origins match exactly.
3. Do not set `COOKIE_DOMAIN` for localhost.

## Residual risks (accepted for v1)

- Click ingestion still runs in-process; isolate the worker before high traffic.
- Analytics aggregation needs profiling before large datasets.
- Webhook delivery and granular API-key scopes are unimplemented — surfaces exist but
  must not be marketed as complete automations.
- `/api/metrics` is open in non-production; production requires `METRICS_TOKEN` or the
  endpoint returns 404.

## Re-check commands

```sh
pnpm --filter api test
pnpm test:api:e2e
pnpm release:staging:gate   # against a real staging URL when available
```
