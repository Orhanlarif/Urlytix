import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LinksController],
  providers: [LinksService],
})
export class LinksModule {}
