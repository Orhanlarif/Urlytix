import { LoggerService, LogLevel } from '@nestjs/common';

type LogFields = Record<string, string | number | boolean | undefined | null>;

/**
 * Emits one JSON object per line in production; delegates to console otherwise.
 */
export class JsonLogger implements LoggerService {
  private readonly service = 'urlytix-api';
  private readonly environment = process.env.NODE_ENV ?? 'development';
  private readonly version =
    process.env.APP_VERSION?.trim() || process.env.GIT_SHA?.trim() || 'unknown';

  log(message: unknown, ...optionalParams: unknown[]) {
    this.write('log', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    this.write('warn', message, optionalParams);
  }

  debug?(message: unknown, ...optionalParams: unknown[]) {
    this.write('debug', message, optionalParams);
  }

  verbose?(message: unknown, ...optionalParams: unknown[]) {
    this.write('verbose', message, optionalParams);
  }

  fatal?(message: unknown, ...optionalParams: unknown[]) {
    this.write('fatal', message, optionalParams);
  }

  setLogLevels?(_levels: LogLevel[]) {
    void _levels;
  }

  private write(level: string, message: unknown, optionalParams: unknown[]) {
    const context =
      typeof optionalParams[optionalParams.length - 1] === 'string'
        ? (optionalParams[optionalParams.length - 1] as string)
        : undefined;
    const stack =
      level === 'error' && typeof optionalParams[0] === 'string'
        ? optionalParams[0]
        : undefined;

    if (process.env.NODE_ENV !== 'production') {
      const prefix = context ? `[${context}] ` : '';
      const text = `${prefix}${this.stringifyMessage(message)}`;
      if (level === 'error') {
        console.error(text, stack ?? '');
      } else if (level === 'warn') {
        console.warn(text);
      } else {
        console.log(text);
      }
      return;
    }

    const payload: LogFields = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      environment: this.environment,
      version: this.version,
      context,
      message: this.stringifyMessage(message),
      stack: stack && stack.includes('\n') ? stack : undefined,
    };

    const line = `${JSON.stringify(payload)}\n`;
    if (level === 'error' || level === 'fatal') {
      process.stderr.write(line);
    } else {
      process.stdout.write(line);
    }
  }

  private stringifyMessage(message: unknown): string {
    if (typeof message === 'string') return message;
    if (message instanceof Error) return message.message;
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}
