import type { PrismaClient } from '@prisma/client';
import { provisionOwnerWorkspace } from './workspace-provisioning';

export type WorkspaceBackfillResult = {
  usersProcessed: number;
  workspacesCreated: number;
  linksAssigned: number;
};

export async function assertNoOrphanLinks(prisma: PrismaClient): Promise<void> {
  const orphanLinks = await prisma.link.count({
    where: { workspaceId: null },
  });

  if (orphanLinks > 0) {
    throw new Error(
      `Workspace tenancy verification failed: ${orphanLinks} link(s) are not assigned to a workspace.`,
    );
  }
}

export async function backfillUserWorkspaces(
  prisma: PrismaClient,
): Promise<WorkspaceBackfillResult> {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: 'asc' },
  });
  const result: WorkspaceBackfillResult = {
    usersProcessed: 0,
    workspacesCreated: 0,
    linksAssigned: 0,
  };

  for (const user of users) {
    const userResult = await prisma.$transaction(async (tx) => {
      const membership = await tx.membership.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
        select: { workspaceId: true },
      });
      const workspace = membership
        ? { id: membership.workspaceId, created: false }
        : {
            id: (await provisionOwnerWorkspace(tx, user)).id,
            created: true,
          };
      const links = await tx.link.updateMany({
        where: { userId: user.id, workspaceId: null },
        data: { workspaceId: workspace.id },
      });

      return {
        workspaceCreated: workspace.created,
        linksAssigned: links.count,
      };
    });

    result.usersProcessed += 1;
    result.workspacesCreated += userResult.workspaceCreated ? 1 : 0;
    result.linksAssigned += userResult.linksAssigned;
  }

  await assertNoOrphanLinks(prisma);
  return result;
}
