import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  const prisma = {
    link: {
      findUnique: jest.fn(),
    },
  };
  const workspaces = {
    assertMember: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: AppConfigService,
          useValue: {
            buildShortUrl: (code: string) =>
              `http://localhost:4000/api/r/${code}`,
          },
        },
        {
          provide: WorkspacesService,
          useValue: workspaces,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('does not fall back to legacy user ownership for orphan links', async () => {
    prisma.link.findUnique.mockResolvedValue({
      id: 'link-1',
      userId: 'user-1',
      workspaceId: null,
      _count: { clickEvents: 0 },
    });

    await expect(
      service.getLinkAnalytics('user-1', 'link-1', { days: 30 }),
    ).rejects.toThrow('Bu link bir workspace’e bağlı değil.');
    expect(workspaces.assertMember).not.toHaveBeenCalled();
  });
});
