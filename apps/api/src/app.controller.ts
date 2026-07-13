import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { requestMetrics } from './common/metrics/request-metrics';
import { AppConfigService } from './config/app-config.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
  ) {}

  @SkipThrottle()
  @Get('health')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        app: 'Urlytix API',
        database: 'connected',
        version: this.appConfig.appVersion,
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        app: 'Urlytix API',
        database: 'disconnected',
        version: this.appConfig.appVersion,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SkipThrottle()
  @Get('metrics')
  metrics(
    @Res() response: Response,
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.appConfig.metricsToken;
    if (!token) {
      if (this.appConfig.isProduction) {
        throw new NotFoundException();
      }
    } else if (authorization !== `Bearer ${token}`) {
      throw new UnauthorizedException();
    }

    response
      .type('text/plain; version=0.0.4; charset=utf-8')
      .send(requestMetrics.toPrometheus());
  }
}
