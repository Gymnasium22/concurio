/**
 * Header — логотип, навигация, действия
 */
import { Link, useLocation } from 'react-router-dom';
import {
  Plus,
  CheckSquare,
  MoreHorizontal,
  BarChart3,
  Users,
  FolderOpen,
  Trash2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { AccountSettings } from '@/components/layout/account-settings';
import { ShareDialog } from '@/components/share/share-dialog';
import { useAppStore } from '@/stores/app-store';
import { useWorkspaces } from '@/hooks/use-platform';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const primaryLinks = [
  { path: '/', label: 'Задачи' },
  { path: '/kanban', label: 'Канбан' },
  { path: '/calendar', label: 'Календарь' },
];

const moreLinks = [
  { path: '/analytics', label: 'Аналитика', icon: BarChart3 },
  { path: '/workspace', label: 'Команда', icon: Users },
  { path: '/gallery', label: 'Файлы', icon: FolderOpen },
  { path: '/automations', label: 'Автоправила', icon: Zap },
  { path: '/trash', label: 'Корзина', icon: Trash2 },
];

export function Header() {
  const location = useLocation();
  const isTg = useAppStore((s) => s.isTelegramApp);
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const setActiveWorkspaceId = useAppStore((s) => s.setActiveWorkspaceId);
  const { data: workspaces } = useWorkspaces();
  const activeWs = workspaces?.find((w) => w.id === activeWorkspaceId);

  const isActive = (path: string) => {
    if (path === '/') {
      return (
        location.pathname === '/' ||
        location.pathname === '/contests' ||
        location.pathname.startsWith('/contest')
      );
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const moreActive = moreLinks.some((l) => isActive(l.path));

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
            isTg &&
              'px-[max(0.75rem,var(--tg-safe-left,0px))] pr-[max(0.75rem,var(--tg-safe-right,0px))]'
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0">
              <div className="h-8 w-8 shrink-0 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center shadow-md">
                <CheckSquare className="h-4 w-4 text-white" />
              </div>
              <span
                className={cn(
                  'text-base sm:text-lg font-bold tracking-tight text-gradient truncate',
                  isTg && 'text-sm max-w-[5.5rem] sm:max-w-none'
                )}
              >
                Concurio
              </span>
            </Link>

            {/* Контекст workspace */}
            {(workspaces?.length ?? 0) > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'hidden sm:inline-flex max-w-[9rem] truncate items-center rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors',
                      activeWorkspaceId
                        ? 'border-accent-300 bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300'
                        : 'border-[rgb(var(--border-default))] text-[rgb(var(--fg-muted))]'
                    )}
                  >
                    {activeWs?.name ?? 'Личное'}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => setActiveWorkspaceId(null)}>
                    Личное
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {(workspaces ?? []).map((w) => (
                    <DropdownMenuItem
                      key={w.id}
                      onClick={() => setActiveWorkspaceId(w.id)}
                    >
                      {w.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <nav className="hidden md:flex items-center gap-0.5" aria-label="Основное меню">
            {primaryLinks.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(path)
                    ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300'
                    : 'text-[rgb(var(--fg-secondary))] hover:text-[rgb(var(--fg-primary))] hover:bg-[rgb(var(--bg-secondary))]'
                )}
              >
                {label}
              </Link>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    moreActive
                      ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300'
                      : 'text-[rgb(var(--fg-secondary))] hover:bg-[rgb(var(--bg-secondary))]'
                  )}
                >
                  Ещё
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {moreLinks.map(({ path, label, icon: Icon }) => (
                  <DropdownMenuItem key={path} asChild>
                    <Link to={path} className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-accent-500" />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {!isTg && <ThemeToggle />}
            <ShareDialog />
            <AccountSettings />
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
