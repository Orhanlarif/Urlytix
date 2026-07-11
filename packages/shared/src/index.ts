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
