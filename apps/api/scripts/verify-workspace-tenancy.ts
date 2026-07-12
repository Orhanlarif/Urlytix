import { PrismaClient } from '@prisma/client';
import { assertNoOrphanLinks } from '../src/workspaces/workspace-backfill';

const prisma = new PrismaClient();

async function main() {
  await assertNoOrphanLinks(prisma);
  console.log('Workspace tenancy verification passed: no orphan links found.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
