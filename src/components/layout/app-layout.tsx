/**
 * AppLayout — Header + Content + BottomNav
 * Учитывает safe-area и MainButton Telegram
 */
import type { ReactNode } from 'react';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { useAppStore } from '@/stores/app-store';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isTg = useAppStore((s) => s.isTelegramApp);

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
          'flex-1 w-full max-w-5xl mx-auto px-3 sm:px-4',
          'pt-3 sm:pt-6 outline-none',
          /* место под bottom nav + safe area + MainButton */
          'pb-[calc(5.5rem+env(safe-area-inset-bottom,0px)+var(--tg-main-button-space,0px))]',
          'md:pb-6',
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
