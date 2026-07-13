/**
 * AppLayout — Header + Content + BottomNav
 * Учитывает safe-area и MainButton Telegram
 */
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { useAppStore } from '@/stores/app-store';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isTg = useAppStore((s) => s.isTelegramApp);
  const location = useLocation();
  const formRoute =
    location.pathname === '/create' || /\/contest\/[^/]+\/edit$/.test(location.pathname);

  return (
    <div
      className={cn(
        'flex flex-col w-full overflow-x-hidden',
        isTg ? 'min-h-[var(--tg-viewport-stable-height,100dvh)]' : 'min-h-dvh'
      )}
    >
      <Header />

      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          'flex-1 w-full max-w-6xl mx-auto px-3 sm:px-5 lg:px-6',
          'pt-3 sm:pt-5 lg:pt-6 outline-none',
          /* mobile: FAB bottom nav ~4rem + ring + safe; desktop без nav */
          formRoute
            ? 'pb-[calc(1.25rem+env(safe-area-inset-bottom,0px)+var(--tg-main-button-space,0px))] md:pb-8'
            : 'pb-[calc(6.5rem+env(safe-area-inset-bottom,0px)+var(--tg-main-button-space,0px))] md:pb-8',
          isTg &&
            'px-[max(0.75rem,var(--tg-safe-left,0px))] pr-[max(0.75rem,var(--tg-safe-right,0px))]'
        )}
      >
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
