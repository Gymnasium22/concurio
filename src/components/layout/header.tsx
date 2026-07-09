/**
 * Header — шапка приложения
 */
import { Link, useLocation } from 'react-router-dom';
import { Plus, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useAppStore } from '@/stores/app-store';
import { cn } from '@/lib/utils';

const navLinks = [
  { path: '/', label: 'Дашборд' },
  { path: '/contests', label: 'Конкурсы' },
];

export function Header() {
  const location = useLocation();
  const isTg = useAppStore(s => s.isTelegramApp);

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="glass border-b border-[rgb(var(--border-default))]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Логотип */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center shadow-md">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            {!isTg && (
              <span className="text-lg font-bold tracking-tight text-gradient">
                Concurio
              </span>
            )}
          </Link>

          {/* Навигация (desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ path, label }) => {
              const isActive = location.pathname === path ||
                (path === '/contests' && location.pathname.startsWith('/contest'));
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

          {/* Правая часть */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/create">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Создать</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
