import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';
import { WebhooksService } from './webhooks.service';

@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/webhooks')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Post()
  create(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateWebhookDto,
  ) {
    return this.service.create(req.user.sub, workspaceId, dto);
  }

  @Get()
  list(@Req() req: Request, @Param('workspaceId') workspaceId: string) {
    return this.service.list(req.user.sub, workspaceId);
  }

  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.service.update(req.user.sub, workspaceId, id, dto);
  }

  @Delete(':id')
  remove(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(req.user.sub, workspaceId, id);
  }
}
