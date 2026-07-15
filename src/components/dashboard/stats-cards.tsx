/**
 * StatsCards — карточки статистики на дашборде
 */
import { useDashboardStats } from '@/hooks/use-contests';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, Target } from 'lucide-react';
import { ProgressRing } from '@/components/dashboard/progress-ring';
import { motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

export function StatsCards({
  /** 2×2 в сайдбаре desktop — без раздувания главной */
  compact = false,
}: {
  compact?: boolean;
}) {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading || !stats) {
    return (
      <div
        className={
          compact
            ? 'grid grid-cols-2 gap-2'
            : 'grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3'
        }
      >
        {[1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            className={compact ? 'h-16 rounded-xl' : 'h-[4.25rem] rounded-2xl'}
          />
        ))}
      </div>
    );
  }

  const overallProgress =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={
        compact
          ? 'grid grid-cols-2 gap-2'
          : 'grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3'
      }
    >
      <motion.div variants={itemVariants}>
        <Card className={cn('neu h-full border-none', compact && 'rounded-xl')}>
          <CardContent
            className={cn(
              'flex items-center gap-2.5',
              compact ? 'p-2.5 min-h-[3.5rem]' : 'p-3 min-h-[4.25rem]'
            )}
          >
            <ProgressRing
              progress={overallProgress}
              size={compact ? 36 : 44}
              strokeWidth={4}
              color="accent"
              className="shrink-0"
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[10px] leading-tight text-[rgb(var(--fg-secondary))] font-medium uppercase tracking-wider">
                Готово
              </span>
              <span
                className={cn(
                  'font-bold tabular-nums leading-none',
                  compact ? 'text-sm' : 'text-base'
                )}
              >
                {stats.completed}
                <span className="text-[rgb(var(--fg-muted))] font-semibold text-sm">
                  {' '}
                  / {stats.total}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className={cn('glass h-full', compact && 'rounded-xl')}>
          <CardContent
            className={cn(
              'flex flex-col justify-between h-full gap-1',
              compact ? 'p-2.5 min-h-[3.5rem]' : 'p-3 min-h-[4.25rem]'
            )}
          >
            <div className="flex justify-between items-start gap-1">
              <span className="text-[10px] leading-tight text-[rgb(var(--fg-secondary))] font-medium uppercase tracking-wider">
                В работе
              </span>
              <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-500 shrink-0">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>
            <span
              className={cn('font-bold tabular-nums', compact ? 'text-lg' : 'text-xl')}
            >
              {stats.inProgress}
            </span>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className={cn('glass h-full', compact && 'rounded-xl')}>
          <CardContent
            className={cn(
              'flex flex-col justify-between h-full gap-1',
              compact ? 'p-2.5 min-h-[3.5rem]' : 'p-3 min-h-[4.25rem]'
            )}
          >
            <div className="flex justify-between items-start gap-1">
              <span className="text-[10px] leading-tight text-[rgb(var(--fg-secondary))] font-medium uppercase tracking-wider">
                Просрочено
              </span>
              <div className="p-1 rounded-md bg-red-50 dark:bg-red-900/30 text-red-500 shrink-0">
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
            </div>
            <span
              className={cn('font-bold tabular-nums', compact ? 'text-lg' : 'text-xl')}
            >
              {stats.overdue}
            </span>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className={cn('glass h-full', compact && 'rounded-xl')}>
          <CardContent
            className={cn(
              'flex flex-col justify-between h-full gap-1',
              compact ? 'p-2.5 min-h-[3.5rem]' : 'p-3 min-h-[4.25rem]'
            )}
          >
            <div className="flex justify-between items-start gap-1">
              <span className="text-[10px] leading-tight text-[rgb(var(--fg-secondary))] font-medium uppercase tracking-wider">
                ≤7 дней
              </span>
              <div className="p-1 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-500 shrink-0">
                <Target className="h-3.5 w-3.5" />
              </div>
            </div>
            <span
              className={cn('font-bold tabular-nums', compact ? 'text-lg' : 'text-xl')}
            >
              {stats.upcomingDeadlines}
            </span>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
