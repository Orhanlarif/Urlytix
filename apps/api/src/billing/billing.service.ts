import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { ChangePlanDto } from './dto/change-plan.dto';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
  ) {}

  listPlans() {
    return this.prisma.plan.findMany({
      where: { active: true },
      orderBy: { monthlyPrice: 'asc' },
    });
  }

  async getSubscription(userId: string, workspaceId: string) {
    await this.workspaces.assertMember(userId, workspaceId);
    const [subscription, usage] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: { workspaceId },
        include: { plan: true },
      }),
      this.prisma.usageRecord.findMany({
        where: { workspaceId, periodEnd: { gte: new Date() } },
      }),
    ]);
    return { subscription, usage };
  }

  async changePlan(userId: string, workspaceId: string, dto: ChangePlanDto) {
    await this.workspaces.assertRole(userId, workspaceId, ['OWNER']);
    const plan = await this.prisma.plan.findUnique({
      where: { code: dto.planCode },
    });
    if (!plan || !plan.active) {
      throw new NotFoundException('Plan bulunamadı.');
    }
    return this.prisma.subscription.upsert({
      where: { workspaceId },
      create: { workspaceId, planId: plan.id, status: 'ACTIVE' },
      update: { planId: plan.id },
      include: { plan: true },
    });
  }
}
