/**
 * BottomNav — мобильная навигация внизу экрана (Telegram-style)
 */
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Trophy, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/telegram';
import { motion } from 'framer-motion';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Главная' },
  { path: '/contests', icon: Trophy, label: 'Конкурсы' },
  { path: '/create', icon: Plus, label: 'Создать', accent: true },
  { path: '/profile', icon: User, label: 'Профиль' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="glass border-t border-[rgb(var(--border-default))]">
        <div className="flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] h-16">
          {navItems.map(({ path, icon: Icon, label, accent }) => {
            const isActive = location.pathname === path ||
              (path === '/contests' && location.pathname.startsWith('/contest'));

            return (
              <Link
                key={path}
                to={path}
                onClick={() => haptic.light()}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all',
                  isActive && !accent && 'text-accent-500',
                  !isActive && !accent && 'text-[rgb(var(--fg-muted))]',
                )}
              >
                {accent ? (
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-lg -mt-4">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <>
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium">{label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="bottomNavIndicator"
                        className="absolute -top-0.5 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-accent-500"
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
