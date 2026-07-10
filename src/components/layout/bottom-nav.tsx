/**
 * BottomNav — нижняя навигация (Telegram-friendly)
 */
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, LayoutGrid, Plus, User, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/telegram';
import { motion } from 'framer-motion';
import { useAppStore } from '@/stores/app-store';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Главная' },
  { path: '/kanban', icon: LayoutGrid, label: 'Канбан' },
  { path: '/create', icon: Plus, label: 'Создать', accent: true },
  { path: '/calendar', icon: CalendarDays, label: 'Календарь' },
  { path: '/profile', icon: User, label: 'Профиль' },
];

export function BottomNav() {
  const location = useLocation();
  const isTg = useAppStore((s) => s.isTelegramApp);

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 md:hidden',
        /* над MainButton Telegram */
        'bottom-[var(--tg-main-button-space,0px)]'
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div
        className={cn(
          'border-t border-[rgb(var(--border-default))]',
          isTg ? 'bg-[rgb(var(--bg-card))]/95 backdrop-blur-xl' : 'glass'
        )}
      >
        <div className="flex items-stretch justify-around px-1 h-[3.75rem] max-w-lg mx-auto">
          {navItems.map(({ path, icon: Icon, label, accent }) => {
            const isActive =
              location.pathname === path ||
              (path === '/' &&
                (location.pathname.startsWith('/contest') ||
                  location.pathname === '/contests'));

            return (
              <Link
                key={path}
                to={path}
                onClick={() => haptic.light()}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0',
                  'min-h-[44px] touch-manipulation select-none',
                  isActive && !accent && 'text-accent-500',
                  !isActive && !accent && 'text-[rgb(var(--fg-muted))]'
                )}
              >
                {accent ? (
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-lg shadow-accent-500/25 -mt-5 ring-4 ring-[rgb(var(--bg-primary))]">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <>
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.25 : 2} />
                    <span className="text-[10px] font-medium leading-none truncate max-w-full px-0.5">
                      {label}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="bottomNavIndicator"
                        className="absolute top-1 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-accent-500"
                        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                      />
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
