import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('Platform admin yetkin yok.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        platformRole: true,
        disabledAt: true,
      },
    });

    if (!user || user.disabledAt || user.platformRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Platform admin yetkin yok.');
    }

    return true;
  }
}
