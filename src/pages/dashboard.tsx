/**
 * Dashboard — главная страница приложения
 */
import { useContests } from '@/hooks/use-contests';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { DeadlineList } from '@/components/dashboard/deadline-list';
import { ContestFilters } from '@/components/dashboard/contest-filters';
import { ContestCard } from '@/components/contest/contest-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function Dashboard() {
  const { data: contests, isLoading } = useContests();

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* Заголовок страницы (мобильный) */}
      <div className="md:hidden pt-2 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Дашборд</h1>
      </div>

      {/* Статистика и дедлайны */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-medium text-[rgb(var(--fg-secondary))] mb-3 uppercase tracking-wider hidden md:block">Обзор</h2>
          <StatsCards />
        </div>
        <div>
          <h2 className="text-sm font-medium text-[rgb(var(--fg-secondary))] mb-3 uppercase tracking-wider hidden md:block">Внимание</h2>
          <DeadlineList />
        </div>
      </div>

      {/* Список конкурсов */}
      <div className="space-y-4 pt-4 border-t border-[rgb(var(--border-default))]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold">Мои конкурсы</h2>
          <Link to="/create" className="hidden sm:block">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Новый конкурс
            </Button>
          </Link>
        </div>

        <ContestFilters />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        ) : !contests || contests.length === 0 ? (
          <div className="glass-subtle p-12 rounded-3xl flex flex-col items-center justify-center text-center border-dashed border-2 border-[rgb(var(--border-default))]">
            <div className="h-16 w-16 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 text-accent-500" />
            </div>
            <h3 className="text-lg font-bold mb-2">Здесь пока пусто</h3>
            <p className="text-[rgb(var(--fg-secondary))] mb-6 max-w-sm">
              У вас нет активных заданий или конкурсов, соответствующих фильтрам.
            </p>
            <Link to="/create">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Создать первое задание
              </Button>
            </Link>
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            layout
          >
            <AnimatePresence mode="popLayout">
              {contests.map((contest, index) => (
                <ContestCard key={contest.id} contest={contest} index={index} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
