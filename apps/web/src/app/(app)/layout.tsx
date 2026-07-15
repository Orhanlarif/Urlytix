'use client';

import { ReactNode } from 'react';
import { AppProviders } from '@/components/providers';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
