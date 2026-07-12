import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { BillingEnabledGuard } from './billing-enabled.guard';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [PrismaModule, AuthModule, WorkspacesModule],
  controllers: [BillingController],
  providers: [BillingService, BillingEnabledGuard],
})
export class BillingModule {}
