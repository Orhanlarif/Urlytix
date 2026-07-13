import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { resolveLocale } from '../i18n/locale';
import { translateFallback, translateMessage } from '../i18n/messages';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const locale = resolveLocale(
      typeof request.headers['accept-language'] === 'string'
        ? request.headers['accept-language']
        : undefined,
    );

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = translateFallback(locale);

    if (typeof exceptionResponse === 'string') {
      message = translateMessage(exceptionResponse, locale);
    } else if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const rawMessage = (exceptionResponse as { message: string | string[] })
        .message;

      const joined = Array.isArray(rawMessage)
        ? rawMessage.join(', ')
        : rawMessage;
      message = translateMessage(joined, locale);
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
