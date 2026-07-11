import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BillingService } from './billing.service';
import { ChangePlanDto } from './dto/change-plan.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Get('plans')
  plans() {
    return this.service.listPlans();
  }

  @UseGuards(JwtAuthGuard)
  @Get('workspaces/:workspaceId/subscription')
  subscription(@Req() req: Request, @Param('workspaceId') workspaceId: string) {
    return this.service.getSubscription(req.user.sub, workspaceId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('workspaces/:workspaceId/subscription')
  changePlan(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ChangePlanDto,
  ) {
    return this.service.changePlan(req.user.sub, workspaceId, dto);
  }
}
