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
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/api-keys')
export class ApiKeysController {
  constructor(private readonly service: ApiKeysService) {}

  @Post()
  create(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.service.create(req.user.sub, workspaceId, dto);
  }

  @Get()
  list(@Req() req: Request, @Param('workspaceId') workspaceId: string) {
    return this.service.list(req.user.sub, workspaceId);
  }

  @Delete(':id')
  revoke(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.service.revoke(req.user.sub, workspaceId, id);
  }
}
