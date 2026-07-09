/**
 * AppLayout — основной layout приложения
 *
 * Header + Content + BottomNav (mobile)
 */
import type { ReactNode } from 'react';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-dvh flex flex-col">
      {/* Шапка */}
      <Header />

      {/* Основной контент */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Мобильная навигация */}
      <BottomNav />
    </div>
  );
}
