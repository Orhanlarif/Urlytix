import type { LinkSummary } from '@urlytics/shared';

export type { LinkStatus } from '@urlytics/shared';
export type LinkItem = LinkSummary;

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
