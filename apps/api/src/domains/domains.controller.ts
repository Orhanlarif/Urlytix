import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDomainDto } from './dto/create-domain.dto';
import { DomainsService } from './domains.service';

@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/domains')
export class DomainsController {
  constructor(private readonly domains: DomainsService) {}

  @Post()
  create(
    @Req() request: Request,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateDomainDto,
  ) {
    return this.domains.create(request.user.sub, workspaceId, dto);
  }

  @Get()
  list(@Req() request: Request, @Param('workspaceId') workspaceId: string) {
    return this.domains.list(request.user.sub, workspaceId);
  }

  @Post(':id/verify')
  verify(
    @Req() request: Request,
    @Param('workspaceId') workspaceId: string,
    @Param('id') domainId: string,
  ) {
    return this.domains.verify(request.user.sub, workspaceId, domainId);
  }

  @Delete(':id')
  remove(
    @Req() request: Request,
    @Param('workspaceId') workspaceId: string,
    @Param('id') domainId: string,
  ) {
    return this.domains.remove(request.user.sub, workspaceId, domainId);
  }
}
