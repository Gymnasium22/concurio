/**
 * Toaster — рендер toast уведомлений
 */
import { useToast, dismissToast } from '@/components/ui/use-toast';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

const variantStyles = {
  default: 'bg-[rgb(var(--bg-card))] border-[rgb(var(--border-default))]',
  success:
    'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800',
  error: 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800',
  warning: 'bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800',
};

const variantIcons = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
};

const variantIconColors = {
  default: 'text-accent-500',
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
};

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div
      className={cn(
        'fixed z-[100] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-full pointer-events-none',
        /* над bottom nav / MainButton на mobile; справа снизу на desktop */
        'left-4 right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px)+var(--tg-main-button-space,0px))]',
        'md:left-auto md:right-4 md:bottom-4'
      )}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const variant = t.variant ?? 'default';
          const Icon = variantIcons[variant];

          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-4 shadow-lg pointer-events-auto',
                variantStyles[variant]
              )}
            >
              <Icon
                className={cn('h-5 w-5 mt-0.5 shrink-0', variantIconColors[variant])}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t.title}</p>
                {t.description && (
                  <p className="text-xs text-[rgb(var(--fg-secondary))] mt-1">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismissToast(t.id)}
                className="shrink-0 rounded-lg p-1 text-[rgb(var(--fg-muted))] hover:text-[rgb(var(--fg-primary))] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
