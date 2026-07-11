# Observability and Service Levels

Status: initial production targets. Recalibrate after 30 days of representative
staging/production traffic; do not weaken a target only to silence alerts.

## Service-level indicators and objectives

Rolling window: 30 days. Planned maintenance is not excluded unless users are
explicitly prevented from sending traffic before the window and the policy is
communicated.

- **Redirect availability:** successful redirect responses divided by valid redirect
  requests, excluding client-caused not-found/disabled/expired outcomes. Target
  99.95%.
- **Redirect latency:** 95% of successful redirects complete within 250 ms and 99%
  within 750 ms at the service edge.
- **Authenticated API availability:** non-5xx responses divided by valid authenticated
  requests. Target 99.9%.
- **Authenticated API latency:** 95% of successful reads/writes complete within
  500 ms and 99% within 1.5 s.
- **Analytics freshness (after worker extraction):** 99% of accepted click events are
  visible in aggregates within 5 minutes. Until then, track click-write and query
  delay as operational indicators, not a guaranteed SLO.
- **Backup recoverability:** 100% of scheduled backups complete; at least one
  representative restore succeeds per quarter. Target production RPO 24 hours until
  PITR is enabled, then 15 minutes; target RTO 4 hours.

Do not count health checks, monitoring probes, or known synthetic traffic in request
SLIs. Measure at ingress and application layers so proxy and application failures are
both visible.

## Error-budget policy

At 99.95%, the redirect monthly error budget is about 21.6 minutes; at 99.9%, the
authenticated API budget is about 43.2 minutes in a 30-day month.

- Under 50% budget consumed: normal delivery.
- 50–80% consumed: review reliability risks and require rollback plans for changes.
- Over 80% consumed or multi-window burn alert active: pause nonessential releases and
  prioritize recovery/reliability work.
- Exhausted: incident review and engineering-owner approval are required before
  feature releases resume.

## Telemetry contract

### Structured logs

Emit JSON to stdout with timestamp, level, service, environment, version/commit,
request ID, trace ID, route template, method, status, duration, and stable error code.
Log deployment and migration events. Never log authorization headers, cookies,
passwords, JWTs, API keys, webhook secrets/signatures, full request bodies, raw IPs,
or payment data. Apply retention and access controls.

### Metrics

Collect:

- request count, status class, and duration by low-cardinality route template
- redirect outcomes (success, not found, disabled, expired, rejected)
- database pool use, query duration/errors, locks, storage and connection saturation
- process CPU, memory, restarts, event-loop lag and open handles
- rate-limit rejections
- queue depth, oldest job age, retries, dead letters, and worker duration when added
- webhook delivery outcomes and billing reconciliation lag when added
- backup age, duration, size, and restore-drill result

Never label metrics with user ID, workspace ID, link ID, short code, URL, email, IP,
request ID, or other unbounded/customer data.

### Traces and errors

Propagate W3C trace context from ingress through API, database spans, outbox, queue,
worker, and outbound providers. Sample routine success traffic and retain all errors
subject to privacy policy. Error tracking groups by stable code/release and redacts
request data before export.

## Dashboards

Maintain four operator views:

1. SLO: availability, latency, budget remaining, and burn rate.
2. Redirect: traffic, outcomes, latency, database time, and click-write pressure.
3. API/product: auth failures, endpoint latency/errors, rate limits, and top stable
   error codes.
4. Platform: replicas/restarts, CPU/memory, PostgreSQL saturation, backup age, and
   future queue/provider health.

## Alerts

Page on symptoms requiring immediate action:

- redirect or API multi-window burn: fast burn over 5 minutes/1 hour and slow burn
  over 6 hours/3 days
- sustained redirect p99 above target with user impact
- health/readiness failure across all replicas
- database storage, connection, lock, or replication/PITR risk
- backup older than 26 hours or failed scheduled backup
- future queue oldest-job age above 5 minutes or growing dead-letter count

Create tickets, not pages, for single-instance restarts without impact, gradual
capacity trends, restore-drill work, and noisy non-user-facing errors. Every alert has
an owner, dashboard link, runbook link, severity, and tested notification route.

## Synthetic checks

From outside the deployment network, run:

- `/api/health` every minute
- a controlled redirect that is excluded from product analytics
- periodic registration/login only in a dedicated synthetic tenant
- tenant-isolation probes in staging after each release

Synthetic credentials live only in the monitoring secret store. Their links and data
are labeled for retention/cleanup without placing secret values in labels.
