import type {
  DailyClicks,
  GroupedStat as SharedGroupedStat,
} from '@urlytics/shared';

export type DailyClick = DailyClicks;

export type TopLink = {
  id: string;
  title: string | null;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  totalClicks: number;
  createdAt: string;
};

export type RecentClick = {
  id: string;
  clickedAt: string;
  country: string | null;
  city: string | null;
  deviceType: string;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  isBot: boolean;
  link: {
    id: string;
    title: string | null;
    shortCode: string;
    originalUrl: string;
  };
};

export type DashboardOverview = {
  totalLinks: number;
  totalClicks: number;
  clicksToday: number;
  dailyClicks: DailyClick[];
  topLinks: TopLink[];
  recentClicks: RecentClick[];
  deviceStats?: GroupedStat[];
  referrerStats?: GroupedStat[];
};

export type GroupedStat = SharedGroupedStat;

export type LinkAnalyticsClick = {
  id: string;
  clickedAt: string;
  country: string | null;
  city: string | null;
  deviceType: string;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  isBot: boolean;
};

export type LinkAnalytics = {
  link: {
    id: string;
    title: string | null;
    originalUrl: string;
    shortCode: string;
    shortUrl: string;
    status: 'ACTIVE' | 'DISABLED' | 'EXPIRED';
    expiresAt: string | null;
    hasPassword?: boolean;
    totalClicks: number;
    createdAt: string;
  };
  uniqueVisitors: number;
  dailyClicks: DailyClick[];
  deviceStats: GroupedStat[];
  browserStats: GroupedStat[];
  osStats: GroupedStat[];
  referrerStats: GroupedStat[];
  geoStats?: {
    countries: GroupedStat[];
    cities: GroupedStat[];
  };
  utmSourceStats: GroupedStat[];
  botStats: {
    botClicks: number;
    humanClicks: number;
  };
  recentClicks: LinkAnalyticsClick[];
};

