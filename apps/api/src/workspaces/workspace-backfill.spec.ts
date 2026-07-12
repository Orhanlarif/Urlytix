import type { PrismaClient } from '@prisma/client';
import { backfillUserWorkspaces } from './workspace-backfill';

describe('workspace backfill', () => {
  it('creates missing ownership once and idempotently assigns null links', async () => {
    const transaction = {
      membership: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValue({ workspaceId: 'workspace-1' }),
      },
      workspace: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'workspace-1' }),
      },
      link: {
        updateMany: jest
          .fn()
          .mockResolvedValueOnce({ count: 2 })
          .mockResolvedValueOnce({ count: 0 }),
      },
    };
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'user-1',
            name: 'Existing User',
            email: 'existing@example.com',
          },
        ]),
      },
      link: {
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn(
        async (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    } as unknown as PrismaClient;

    const first = await backfillUserWorkspaces(prisma);
    const second = await backfillUserWorkspaces(prisma);

    expect(first).toEqual({
      usersProcessed: 1,
      workspacesCreated: 1,
      linksAssigned: 2,
    });
    expect(second).toEqual({
      usersProcessed: 1,
      workspacesCreated: 0,
      linksAssigned: 0,
    });
    expect(transaction.workspace.create).toHaveBeenCalledTimes(1);
    expect(transaction.link.updateMany).toHaveBeenLastCalledWith({
      where: { userId: 'user-1', workspaceId: null },
      data: { workspaceId: 'workspace-1' },
    });
    expect(prisma.link.count.mock.calls).toContainEqual([
      { where: { workspaceId: null } },
    ]);
  });

  it('fails deployment verification while orphan links remain', async () => {
    const prisma = {
      user: { findMany: jest.fn().mockResolvedValue([]) },
      link: { count: jest.fn().mockResolvedValue(2) },
    } as unknown as PrismaClient;

    await expect(backfillUserWorkspaces(prisma)).rejects.toThrow(
      'Workspace tenancy verification failed: 2 link(s)',
    );
  });
});
