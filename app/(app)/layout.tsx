import { AppShellProvider } from '@/components/app-shell-provider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShellProvider>{children}</AppShellProvider>;
}
