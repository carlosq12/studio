'use client';

import { AppShell } from '@/components/app-shell';

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
