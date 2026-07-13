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
import {
  AddMemberDto,
  CreateWorkspaceDto,
  UpdateMemberRoleDto,
  UpdateWorkspaceDto,
} from './dto/workspace.dto';
import { DeleteWorkspaceDto } from './dto/delete-workspace.dto';
import { WorkspacesService } from './workspaces.service';

@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly service: WorkspacesService) {}

  @Post()
  create(@Req() req: Request, @Body() dto: CreateWorkspaceDto) {
    return this.service.create(req.user.sub, dto);
  }

  @Get()
  list(@Req() req: Request) {
    return this.service.list(req.user.sub);
  }

  @Get(':id')
  get(@Req() req: Request, @Param('id') id: string) {
    return this.service.get(req.user.sub, id);
  }

  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.service.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  remove(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: DeleteWorkspaceDto,
  ) {
    return this.service.remove(req.user.sub, id, dto);
  }

  @Post(':id/members')
  addMember(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.service.addMember(req.user.sub, id, dto);
  }

  @Patch(':id/members/:userId')
  updateMemberRole(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.service.updateMemberRole(req.user.sub, id, userId, dto);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.service.removeMember(req.user.sub, id, userId);
  }
}
