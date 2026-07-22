import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';
import {
  ListAdminUsersQueryDto,
  UpdateAdminUserDto,
} from './dto/admin.dto';
import { PlatformAdminGuard } from './platform-admin.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  overview() {
    return this.adminService.getOverview();
  }

  @Get('users')
  listUsers(@Query() query: ListAdminUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id')
  updateUser(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.adminService.updateUser(req.user.sub, id, dto);
  }

  @Post('users/:id/revoke-sessions')
  revokeSessions(@Req() req: Request, @Param('id') id: string) {
    return this.adminService.revokeSessions(req.user.sub, id);
  }
}
