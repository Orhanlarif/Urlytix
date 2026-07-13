/**
 * Lightweight load harness for redirect and authenticated-read capacity baselining.
 *
 * Usage:
 *   LOAD_API_URL=http://localhost:4000/api \
 *   LOAD_REDIRECT_URL=http://localhost:4000/api/r/<code> \
 *   LOAD_TOKEN=<optional bearer> \
 *   pnpm load:test
 */

const apiBase = (process.env.LOAD_API_URL ?? 'http://localhost:4000/api').replace(
  /\/+$/,
  '',
);
const redirectUrl = process.env.LOAD_REDIRECT_URL;
const token = process.env.LOAD_TOKEN;
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? '20');
const requests = Number(process.env.LOAD_REQUESTS ?? '200');
const workspaceId = process.env.LOAD_WORKSPACE_ID;

if (!Number.isInteger(concurrency) || concurrency < 1) {
  fail('LOAD_CONCURRENCY must be a positive integer.');
}
if (!Number.isInteger(requests) || requests < 1) {
  fail('LOAD_REQUESTS must be a positive integer.');
}

function fail(message) {
  console.error(`LOAD TEST FAILED: ${message}`);
  process.exit(1);
}

async function timed(fn) {
  const started = performance.now();
  try {
    const result = await fn();
    return { ok: true, ms: performance.now() - started, ...result };
  } catch (error) {
    return {
      ok: false,
      ms: performance.now() - started,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function hitHealth() {
  const response = await fetch(`${apiBase}/health`);
  return { status: response.status, ok: response.ok };
}

async function hitRedirect() {
  if (!redirectUrl) {
    return hitHealth();
  }
  const response = await fetch(redirectUrl, { redirect: 'manual' });
  const ok = response.status === 302 || response.status === 301;
  return { status: response.status, ok };
}

async function hitAnalytics() {
  if (!token || !workspaceId) {
    return hitHealth();
  }
  const response = await fetch(
    `${apiBase}/analytics/overview?workspaceId=${encodeURIComponent(workspaceId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return { status: response.status, ok: response.ok };
}

async function runPool(label, worker) {
  const results = [];
  let next = 0;

  async function runOne() {
    while (next < requests) {
      const index = next;
      next += 1;
      results[index] = await timed(worker);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, requests) }, () => runOne()),
  );

  const ok = results.filter((r) => r.ok);
  const durations = ok.map((r) => r.ms).sort((a, b) => a - b);
  const percentile = (p) =>
    durations.length === 0
      ? null
      : durations[Math.min(durations.length - 1, Math.floor((p / 100) * durations.length))];

  const summary = {
    label,
    requests,
    concurrency,
    success: ok.length,
    failure: results.length - ok.length,
    p50_ms: percentile(50),
    p95_ms: percentile(95),
    p99_ms: percentile(99),
  };

  console.log(JSON.stringify(summary));
  return summary;
}

console.log(
  JSON.stringify({
    message: 'Starting load harness',
    apiBase,
    redirectUrl: redirectUrl ?? null,
    analytics: Boolean(token && workspaceId),
    concurrency,
    requests,
  }),
);

const health = await runPool('health', hitHealth);
const redirect = await runPool('redirect_or_health', hitRedirect);
const analytics = await runPool('analytics_or_health', hitAnalytics);

const failed =
  health.failure > 0 || redirect.failure > 0 || analytics.failure > 0;

if (failed) {
  fail('One or more request pools reported failures. Inspect summaries above.');
}

console.log(
  JSON.stringify({
    message: 'LOAD TEST PASSED',
    guidance:
      'Use these p95/p99 numbers as a local baseline. Re-run against staging under production-like hardware before publishing capacity limits in docs/observability-slo.md.',
  }),
);
