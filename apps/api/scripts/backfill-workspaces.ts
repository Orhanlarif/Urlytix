import { PrismaClient } from '@prisma/client';
import { backfillUserWorkspaces } from '../src/workspaces/workspace-backfill';

const prisma = new PrismaClient();

async function main() {
  const result = await backfillUserWorkspaces(prisma);
  console.log(
    `Workspace backfill complete: ${result.usersProcessed} users processed, ` +
      `${result.workspacesCreated} workspaces created, ` +
      `${result.linksAssigned} links assigned.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
