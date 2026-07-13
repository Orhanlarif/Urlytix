import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction) {
    const incoming = request.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && incoming.length <= 128
        ? incoming
        : randomUUID();
    const startedAt = Date.now();
    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);
    response.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      // Avoid logging raw query strings that may contain tokens.
      const pathOnly = request.originalUrl.split('?')[0] ?? request.originalUrl;
      this.logger.log(
        `${request.method} ${pathOnly} ${response.statusCode} ${durationMs}ms requestId=${requestId}`,
      );
    });
    next();
  }
}
