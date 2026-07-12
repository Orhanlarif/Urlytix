import type { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';

type ProvisioningDatabase = Pick<
  Prisma.TransactionClient,
  'workspace' | 'membership'
>;

type WorkspaceOwner = {
  id: string;
  name: string | null;
  email: string;
};

const MAX_SLUG_ATTEMPTS = 10;

export function defaultWorkspaceName(user: WorkspaceOwner) {
  const displayName = user.name?.trim();
  return displayName ? `${displayName}'s Workspace` : 'My Workspace';
}

export function workspaceSlugBase(user: WorkspaceOwner) {
  const source = user.name?.trim() || user.email.split('@')[0] || 'workspace';
  const normalized = source
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 38);

  return normalized || 'workspace';
}

export async function provisionOwnerWorkspace(
  database: ProvisioningDatabase,
  user: WorkspaceOwner,
  tokenFactory = () => randomBytes(5).toString('hex'),
) {
  const existingMembership = await database.membership.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });

  if (existingMembership) {
    return existingMembership.workspace;
  }

  const base = workspaceSlugBase(user);
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const slug = `${base}-${tokenFactory()}`.slice(0, 50);
    const existingWorkspace = await database.workspace.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existingWorkspace) {
      return database.workspace.create({
        data: {
          name: defaultWorkspaceName(user),
          slug,
          memberships: { create: { userId: user.id, role: 'OWNER' } },
        },
      });
    }
  }

  throw new Error('Unique workspace slug could not be generated.');
}
