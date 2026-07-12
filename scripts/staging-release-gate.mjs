import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const smokeOnly = process.argv.includes('--smoke-only');
const apiBase = requiredUrl('STAGING_API_URL').replace(/\/+$/, '');

if (process.env.STAGING_CONFIRM !== 'urlytics-staging') {
  fail('Set STAGING_CONFIRM=urlytics-staging to confirm the target environment.');
}
if (
  new URL(apiBase).protocol !== 'https:' &&
  process.env.ALLOW_INSECURE_STAGING !== 'true'
) {
  fail('STAGING_API_URL must use HTTPS (or explicitly set ALLOW_INSECURE_STAGING=true).');
}

if (!smokeOnly) {
  if (!process.env.DATABASE_URL) {
    fail('DATABASE_URL is required for migration, backfill, and tenancy verification.');
  }
  run('pnpm', ['--filter', 'api', 'deploy:database']);
}

const suffix = `${Date.now()}-${randomBytes(3).toString('hex')}`;
const email = process.env.STAGING_SMOKE_EMAIL ?? `release-${suffix}@urlytics.test`;
const password = process.env.STAGING_SMOKE_PASSWORD ?? `Release-${suffix}-Aa1!`;
const destination =
  process.env.STAGING_SMOKE_DESTINATION ??
  'https://example.com/urlytics-release-smoke';
let accessToken;
let linkId;

try {
  const health = await jsonRequest(`${apiBase}/health`);
  if (health.status !== 'ok' || health.database !== 'connected') {
    fail(`Health check is not ready: ${JSON.stringify(health)}`);
  }

  if (process.env.STAGING_SMOKE_EMAIL) {
    const login = await jsonRequest(`${apiBase}/auth/login`, {
      method: 'POST',
      body: { email, password },
      expectedStatus: 201,
    });
    accessToken = login.accessToken;
  } else {
    const registration = await jsonRequest(`${apiBase}/auth/register`, {
      method: 'POST',
      body: { name: 'Release Gate', email, password },
      expectedStatus: 201,
    });
    accessToken = registration.accessToken;
  }

  const workspaces = await jsonRequest(`${apiBase}/workspaces`, {
    token: accessToken,
  });
  if (!Array.isArray(workspaces) || !workspaces[0]?.id) {
    fail('Default workspace provisioning smoke failed.');
  }

  const created = await jsonRequest(`${apiBase}/links`, {
    method: 'POST',
    token: accessToken,
    expectedStatus: 201,
    body: {
      workspaceId: workspaces[0].id,
      originalUrl: destination,
      title: `Staging release gate ${suffix}`,
      customAlias: `release-${suffix}`.slice(0, 32),
    },
  });
  linkId = created.link?.id;
  if (!linkId || !created.link?.shortUrl) fail('Link creation smoke failed.');

  const redirect = await fetch(created.link.shortUrl, { redirect: 'manual' });
  if (redirect.status !== 302 || redirect.headers.get('location') !== destination) {
    fail(
      `Redirect smoke failed: status=${redirect.status} location=${redirect.headers.get('location')}`,
    );
  }

  const analytics = await jsonRequest(
    `${apiBase}/analytics/links/${encodeURIComponent(linkId)}`,
    { token: accessToken },
  );
  if (analytics.link?.id !== linkId || analytics.link.totalClicks < 1) {
    fail('Analytics smoke did not observe the controlled redirect.');
  }

  console.log(
    `Staging release gate passed for ${apiBase}: health, workspace, link, redirect, analytics.`,
  );
} finally {
  if (accessToken && linkId) {
    await fetch(`${apiBase}/links/${encodeURIComponent(linkId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => undefined);
  }
}

function requiredUrl(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is required.`);
  try {
    return new URL(value).toString();
  } catch {
    fail(`${name} must be a valid absolute URL.`);
  }
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const expectedStatus = options.expectedStatus ?? 200;
  const data = await response.json().catch(() => null);
  if (response.status !== expectedStatus) {
    fail(
      `${options.method ?? 'GET'} ${url} returned ${response.status}: ${JSON.stringify(data)}`,
    );
  }
  return data;
}

function run(command, args) {
  const executable = process.platform === 'win32' ? `${command}.cmd` : command;
  const result = spawnSync(executable, args, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} failed with exit code ${result.status}.`);
  }
}

function fail(message) {
  console.error(`Release gate failed: ${message}`);
  process.exit(1);
}
