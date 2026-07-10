/**
 * Header — компактная шапка, удобная в Telegram Mini App
 */
import { Link, useLocation } from 'react-router-dom';
import { Plus, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { AccountSettings } from '@/components/layout/account-settings';
import { ShareDialog } from '@/components/share/share-dialog';
import { useAppStore } from '@/stores/app-store';
import { cn } from '@/lib/utils';

const navLinks = [
  { path: '/', label: 'Дашборд' },
  { path: '/contests', label: 'Задачи' },
  { path: '/kanban', label: 'Канбан' },
  { path: '/calendar', label: 'Календарь' },
];

export function Header() {
  const location = useLocation();
  const isTg = useAppStore((s) => s.isTelegramApp);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full',
        isTg && 'pt-[var(--tg-content-safe-top,0px)]'
      )}
    >
      <div
        className={cn(
          'border-b border-[rgb(var(--border-default))]',
          isTg ? 'bg-[rgb(var(--bg-card))]/90 backdrop-blur-xl' : 'glass'
        )}
      >
        <div
          className={cn(
            'max-w-5xl mx-auto flex items-center justify-between gap-2',
            'h-12 sm:h-14',
            'px-3 sm:px-4',
            isTg && 'px-[max(0.75rem,var(--tg-safe-left,0px))] pr-[max(0.75rem,var(--tg-safe-right,0px))]'
          )}
        >
          <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0">
            <div className="h-8 w-8 shrink-0 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center shadow-md">
              <CheckSquare className="h-4 w-4 text-white" />
            </div>
            <span
              className={cn(
                'text-base sm:text-lg font-bold tracking-tight text-gradient truncate',
                isTg && 'text-sm max-w-[7rem] sm:max-w-none'
              )}
            >
              Concurio
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ path, label }) => {
              const isActive =
                location.pathname === path ||
                (path === '/contests' &&
                  (location.pathname.startsWith('/contest') ||
                    location.pathname === '/'));
              return (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300'
                      : 'text-[rgb(var(--fg-secondary))] hover:text-[rgb(var(--fg-primary))] hover:bg-[rgb(var(--bg-secondary))]'
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {!isTg && <ThemeToggle />}
            <ShareDialog />
            <AccountSettings />
            {/* На мобиле / TG создание — через bottom nav */}
            <Link to="/create" className="hidden md:block">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                <span>Создать</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
