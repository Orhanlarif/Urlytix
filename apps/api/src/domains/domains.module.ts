import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { DomainsController } from './domains.controller';
import { DomainsService } from './domains.service';

@Module({
  imports: [AuthModule, PrismaModule, WorkspacesModule],
  controllers: [DomainsController],
  providers: [DomainsService],
})
export class DomainsModule {}
