import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ClickIngestionService } from './click-ingestion.service';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LinksController],
  providers: [LinksService, ClickIngestionService],
  exports: [ClickIngestionService],
})
export class LinksModule {}
