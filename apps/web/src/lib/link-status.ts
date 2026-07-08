import type { LinkStatus } from '@/types/links';

export function getLinkStatusLabel(status: LinkStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'Aktif';
    case 'DISABLED':
      return 'Pasif';
    case 'EXPIRED':
      return 'Süresi Doldu';
    default:
      return status;
  }
}

export function getLinkStatusBadgeClass(status: LinkStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200';
    case 'DISABLED':
      return 'rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-200';
    case 'EXPIRED':
      return 'rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs text-red-200';
    default:
      return 'rounded-full border border-slate-500/20 bg-slate-500/10 px-2 py-1 text-xs text-slate-300';
  }
}

export function canToggleLinkStatus(status: LinkStatus) {
  return status !== 'EXPIRED';
}

export function isLinkOperational(status: LinkStatus) {
  return status === 'ACTIVE';
}
