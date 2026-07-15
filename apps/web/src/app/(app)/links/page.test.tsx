import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/i18n/en';

const createMock = vi.hoisted(() => vi.fn());
const showToastMock = vi.hoisted(() => vi.fn());

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/confirm-dialog', () => ({
  useConfirm: () => ({ confirm: vi.fn() }),
}));
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));
vi.mock('@/contexts/workspace-context', () => ({
  useWorkspace: () => ({
    currentWorkspace: { id: 'workspace-1', name: 'Release', slug: 'release' },
    isLoading: false,
  }),
}));
vi.mock('@/hooks/use-workspace-data', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/use-workspace-data')>(
      '@/hooks/use-workspace-data',
    );
  return {
    ...actual,
    useWorkspaceLinks: () => ({
      data: {
        data: [],
        meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }),
    useWorkspaceOverview: () => ({
      data: { totalLinks: 0, totalClicks: 0, clicksToday: 0 },
    }),
  };
});
vi.mock('@/i18n/language-provider', () => ({
  useLanguage: () => ({ t: en, locale: 'en' }),
}));
vi.mock('@/services/links', async () => {
  const actual =
    await vi.importActual<typeof import('@/services/links')>('@/services/links');
  return { ...actual, linksService: { ...actual.linksService, create: createMock } };
});

import LinksPage from './page';

describe('LinksPage integration', () => {
  beforeEach(() => {
    createMock.mockReset();
    showToastMock.mockReset();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('creates a link in the active workspace and refreshes workspace data', async () => {
    createMock.mockResolvedValue({
      message: 'created',
      link: {
        id: 'link-1',
        originalUrl: 'https://example.com/release',
        shortCode: 'release-smoke',
        shortUrl: 'http://localhost:4000/release-smoke',
        title: 'Release link',
        status: 'ACTIVE',
        expiresAt: null,
        hasPassword: true,
        totalClicks: 0,
        createdAt: '2026-07-12T00:00:00.000Z',
      },
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    render(
      <QueryClientProvider client={client}>
        <LinksPage />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Target URL'), {
      target: { value: 'https://example.com/release' },
    });
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: '  Release link  ' },
    });
    fireEvent.change(screen.getByLabelText('Password (optional)'), {
      target: { value: 'smoke-secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Short Link' }));

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith('workspace-1', {
        originalUrl: 'https://example.com/release',
        title: 'Release link',
        customAlias: undefined,
        expiresAt: undefined,
        password: 'smoke-secret',
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['workspace-data', 'workspace-1'],
    });
    expect(
      await screen.findByText('http://localhost:4000/release-smoke'),
    ).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(en.links.linkCopied);
  });
});
