export type LinkStatus = 'ACTIVE' | 'DISABLED' | 'EXPIRED';

export type LinkItem = {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  title: string | null;
  status: LinkStatus;
  expiresAt: string | null;
  totalClicks: number;
  createdAt: string;
};

export type CreateLinkResponse = {
  message: string;
  link: LinkItem;
};

export type UpdateLinkResponse = {
  message: string;
  link: LinkItem;
};

export type UpdateLinkStatusResponse = {
  message: string;
  link: LinkItem;
};

export type DeleteLinkResponse = {
  message: string;
  deletedLinkId: string;
};
