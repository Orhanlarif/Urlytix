import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { WorkspaceAnalyticsQueryDto } from './dto/workspace-analytics-query.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('overview')
  getDashboardOverview(
    @Req() req: Request,
    @Query() query: WorkspaceAnalyticsQueryDto,
  ) {
    return this.analyticsService.getDashboardOverview(
      req.user.sub,
      query.workspaceId,
      query,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('links/:id')
  getLinkAnalytics(
    @Req() req: Request,
    @Param('id') linkId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getLinkAnalytics(req.user.sub, linkId, query);
  }
}
