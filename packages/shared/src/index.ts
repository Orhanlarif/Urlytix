export type LinkStatus = 'ACTIVE' | 'DISABLED' | 'EXPIRED';
export type DeviceType =
  | 'DESKTOP'
  | 'MOBILE'
  | 'TABLET'
  | 'BOT'
  | 'UNKNOWN';

export interface UserSummary {
  id: string;
  name: string | null;
  email: string;
  timezone?: string;
  locale?: string;
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  accessToken?: string;
  user: UserSummary;
}

export interface LinkSummary {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  title: string | null;
  status: LinkStatus;
  expiresAt: string | null;
  hasPassword?: boolean;
  totalClicks: number;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface DailyClicks {
  date: string;
  clicks: number;
}

export interface GroupedStat {
  name: string;
  count: number;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  path: string;
  timestamp: string;
  requestId?: string;
}

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSummary extends Workspace {
  _count: {
    links: number;
    memberships: number;
  };
}

export interface WorkspaceMembership {
  id: string;
  role: WorkspaceRole;
  userId: string;
  workspaceId: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface WorkspaceDetail extends Workspace {
  memberships: WorkspaceMembership[];
}

export interface ApiKeySummary {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyResponse {
  apiKey: Omit<ApiKeySummary, 'lastUsedAt'>;
  secret: string;
}

export interface DomainSummary {
  id: string;
  workspaceId: string;
  hostname: string;
  verificationToken: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DomainVerifyResponse {
  verified: boolean;
  record?: string;
  expectedValue?: string;
  domain?: DomainSummary;
}
