import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PlatformAdminBootstrapService } from './platform-admin-bootstrap.service';
import { PlatformAdminGuard } from './platform-admin.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    PlatformAdminGuard,
    PlatformAdminBootstrapService,
  ],
})
export class AdminModule {}
