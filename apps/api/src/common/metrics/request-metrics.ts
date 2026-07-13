type MetricKey = string;

/**
 * Low-cardinality in-process HTTP metrics for scrape-based observability.
 * Labels never include user, workspace, link, IP, or other unbounded IDs.
 */
export class RequestMetricsRegistry {
  private readonly counts = new Map<MetricKey, number>();
  private readonly durationSumMs = new Map<MetricKey, number>();
  private readonly durationCount = new Map<MetricKey, number>();

  record(
    method: string,
    route: string,
    statusCode: number,
    durationMs: number,
  ) {
    const statusClass = `${Math.floor(statusCode / 100)}xx`;
    const safeMethod = sanitizeLabel(method.toUpperCase());
    const safeRoute = sanitizeRoute(route);
    const key = `${safeMethod}|${safeRoute}|${statusClass}`;

    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
    this.durationSumMs.set(
      key,
      (this.durationSumMs.get(key) ?? 0) + Math.max(0, durationMs),
    );
    this.durationCount.set(key, (this.durationCount.get(key) ?? 0) + 1);
  }

  toPrometheus(): string {
    const lines: string[] = [
      '# HELP http_requests_total Total HTTP requests by method, route template, and status class.',
      '# TYPE http_requests_total counter',
    ];

    for (const [key, value] of this.counts) {
      const [method, route, statusClass] = key.split('|');
      lines.push(
        `http_requests_total{method="${method}",route="${route}",status_class="${statusClass}"} ${value}`,
      );
    }

    lines.push(
      '# HELP http_request_duration_ms_sum Total HTTP request duration in milliseconds.',
      '# TYPE http_request_duration_ms_sum counter',
    );
    for (const [key, value] of this.durationSumMs) {
      const [method, route, statusClass] = key.split('|');
      lines.push(
        `http_request_duration_ms_sum{method="${method}",route="${route}",status_class="${statusClass}"} ${value}`,
      );
    }

    lines.push(
      '# HELP http_request_duration_ms_count HTTP request duration sample count.',
      '# TYPE http_request_duration_ms_count counter',
    );
    for (const [key, value] of this.durationCount) {
      const [method, route, statusClass] = key.split('|');
      lines.push(
        `http_request_duration_ms_count{method="${method}",route="${route}",status_class="${statusClass}"} ${value}`,
      );
    }

    return `${lines.join('\n')}\n`;
  }
}

function sanitizeLabel(value: string): string {
  return value.replace(/[^A-Za-z0-9_.:/-]/g, '_').slice(0, 64) || 'unknown';
}

function sanitizeRoute(route: string): string {
  const normalized = route.startsWith('/') ? route : `/${route}`;
  return sanitizeLabel(normalized).slice(0, 128);
}

export const requestMetrics = new RequestMetricsRegistry();
