/**
 * StatsCards — карточки статистики на дашборде
 */
import { useDashboardStats } from '@/hooks/use-contests';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, Target } from 'lucide-react';
import { ProgressRing } from '@/components/dashboard/progress-ring';
import { motion, type Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

export function StatsCards() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  const overallProgress = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
    >
      {/* Карточка 1: Прогресс */}
      <motion.div variants={itemVariants}>
        <Card className="neu h-full border-none">
          <CardContent className="p-4 flex items-center gap-3">
            <ProgressRing progress={overallProgress} size={48} strokeWidth={5} />
            <div className="flex flex-col">
              <span className="text-xs text-[rgb(var(--fg-secondary))] font-medium uppercase tracking-wider">Всего готово</span>
              <span className="text-lg font-bold">{stats.completed} / {stats.total}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Карточка 2: В работе */}
      <motion.div variants={itemVariants}>
        <Card className="glass h-full">
          <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
            <div className="flex justify-between items-start">
              <span className="text-xs text-[rgb(var(--fg-secondary))] font-medium uppercase tracking-wider">В работе</span>
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <span className="text-2xl font-bold">{stats.inProgress}</span>
          </CardContent>
        </Card>
      </motion.div>

      {/* Карточка 3: Просрочено */}
      <motion.div variants={itemVariants}>
        <Card className="glass h-full">
          <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
            <div className="flex justify-between items-start">
              <span className="text-xs text-[rgb(var(--fg-secondary))] font-medium uppercase tracking-wider">Просрочено</span>
              <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-500">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <span className="text-2xl font-bold">{stats.overdue}</span>
          </CardContent>
        </Card>
      </motion.div>

      {/* Карточка 4: Ближайшие (≤7 дней) */}
      <motion.div variants={itemVariants}>
        <Card className="glass h-full">
          <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
            <div className="flex justify-between items-start">
              <span className="text-xs text-[rgb(var(--fg-secondary))] font-medium uppercase tracking-wider">Скоро сдача</span>
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-500">
                <Target className="h-4 w-4" />
              </div>
            </div>
            <span className="text-2xl font-bold">{stats.upcomingDeadlines}</span>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
