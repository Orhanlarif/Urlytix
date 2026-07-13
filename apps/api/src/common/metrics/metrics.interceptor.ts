import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { requestMetrics } from './request-metrics';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.record(request, response, startedAt),
        error: () => this.record(request, response, startedAt),
      }),
    );
  }

  private record(request: Request, response: Response, startedAt: number) {
    requestMetrics.record(
      request.method,
      this.resolveRoute(request),
      response.statusCode || 500,
      Date.now() - startedAt,
    );
  }

  private resolveRoute(request: Request): string {
    const candidate: unknown = Reflect.get(request, 'route');
    if (!candidate || typeof candidate !== 'object') {
      return 'unmatched';
    }

    const path: unknown = Reflect.get(candidate, 'path');
    if (typeof path !== 'string') {
      return 'unmatched';
    }

    return `${request.baseUrl || ''}${path}`;
  }
}
