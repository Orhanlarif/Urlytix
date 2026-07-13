type SentryModule = typeof import('@sentry/node');

let sentry: SentryModule | null = null;

export async function initSentryIfConfigured(): Promise<void> {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) {
    return;
  }

  try {
    sentry = await import('@sentry/node');
    sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? 'development',
      release:
        process.env.APP_VERSION?.trim() ||
        process.env.GIT_SHA?.trim() ||
        undefined,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.05'),
      sendDefaultPii: false,
    });
  } catch (error) {
    // Keep boot resilient when the optional dependency is not installed.
    console.error(
      'SENTRY_DSN is set but @sentry/node could not be initialized:',
      error instanceof Error ? error.message : error,
    );
    sentry = null;
  }
}

export function captureException(error: unknown, requestId?: string): void {
  if (!sentry) return;
  sentry.withScope((scope) => {
    if (requestId) {
      scope.setTag('request_id', requestId);
    }
    scope.setLevel('error');
    sentry!.captureException(error);
  });
}
