import type { Prisma } from '@prisma/client';
import {
  defaultWorkspaceName,
  provisionOwnerWorkspace,
  workspaceSlugBase,
} from './workspace-provisioning';

describe('workspace provisioning', () => {
  const user = {
    id: 'user-1',
    name: 'Şule Example',
    email: 'sule@example.com',
  };

  it('builds safe workspace defaults', () => {
    expect(defaultWorkspaceName(user)).toBe("Şule Example's Workspace");
    expect(workspaceSlugBase(user)).toBe('sule-example');
  });

  it('retries slug collisions and creates an OWNER membership', async () => {
    const workspaceCreate = jest.fn().mockResolvedValue({ id: 'workspace-1' });
    const database = {
      membership: { findFirst: jest.fn().mockResolvedValue(null) },
      workspace: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'collision' })
          .mockResolvedValueOnce(null),
        create: workspaceCreate,
      },
    } as unknown as Pick<Prisma.TransactionClient, 'workspace' | 'membership'>;
    const tokens = ['aaaaaaaaaa', 'bbbbbbbbbb'];

    await provisionOwnerWorkspace(database, user, () => tokens.shift()!);

    expect(workspaceCreate).toHaveBeenCalledWith({
      data: {
        name: "Şule Example's Workspace",
        slug: 'sule-example-bbbbbbbbbb',
        memberships: { create: { userId: 'user-1', role: 'OWNER' } },
      },
    });
  });
});
