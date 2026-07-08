import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('overview')
  getDashboardOverview(@Req() req: Request) {
    return this.analyticsService.getDashboardOverview(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('links/:id')
  getLinkAnalytics(@Req() req: Request, @Param('id') linkId: string) {
    return this.analyticsService.getLinkAnalytics(req.user.sub, linkId);
  }
}
