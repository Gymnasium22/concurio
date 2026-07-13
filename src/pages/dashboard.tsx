/**
 * Dashboard — задачи сверху, компактный обзор, без «пустоты» слева
 */
import { useEffect, useMemo, useState } from 'react';
import {
  useContests,
  useDashboardStats,
  exportContestsCsv,
  exportContestsIcs,
} from '@/hooks/use-contests';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { DeadlineStrip } from '@/components/dashboard/deadline-strip';
import { ActivityHeatmap } from '@/components/dashboard/activity-heatmap';
import { ContestFilters } from '@/components/dashboard/contest-filters';
import { ContestCard } from '@/components/contest/contest-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ListTodo,
  Plus,
  FileDown,
  Table,
  CalendarRange,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadTasksPdfReport } from '@/lib/pdf-report';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/use-toast';
import { useAppStore } from '@/stores/app-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PAGE_SIZE = 20;

export function Dashboard() {
  const { data: contests, isLoading } = useContests();
  const { data: stats } = useDashboardStats();
  const { user } = useAuth();
  const { toast } = useToast();
  const hideCompleted = useAppStore((s) => s.hideCompleted);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const statusFilter = useAppStore((s) => s.statusFilter);
  const taskTypeFilter = useAppStore((s) => s.taskTypeFilter);
  const priorityFilter = useAppStore((s) => s.priorityFilter);

  const [pdfBusy, setPdfBusy] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showMoreStats, setShowMoreStats] = useState(false);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, statusFilter, hideCompleted, taskTypeFilter, priorityFilter]);

  const visibleContests = useMemo(
    () => (contests ?? []).slice(0, visibleCount),
    [contests, visibleCount]
  );
  const hasMore = (contests?.length ?? 0) > visibleCount;

  const handlePdf = async () => {
    if (!contests?.length) {
      toast({ title: 'Нет задач для отчёта', variant: 'error' });
      return;
    }
    setPdfBusy(true);
    try {
      await downloadTasksPdfReport(contests, stats, user?.display_name);
      toast({ title: 'PDF сохранён', variant: 'success' });
    } catch {
      toast({ title: 'Ошибка создания PDF', variant: 'error' });
    } finally {
      setPdfBusy(false);
    }
  };

  const handleCsv = () => {
    if (!contests?.length) {
      toast({ title: 'Нет задач для экспорта', variant: 'error' });
      return;
    }
    exportContestsCsv(contests);
    toast({ title: 'CSV сохранён', variant: 'success' });
  };

  const handleIcs = () => {
    try {
      if (!contests?.length) {
        toast({ title: 'Нет задач для экспорта', variant: 'error' });
        return;
      }
      exportContestsIcs(contests);
      toast({ title: 'Календарь (.ics) сохранён', variant: 'success' });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : 'Ошибка ICS',
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-500">
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Задачи</h1>
          <p className="text-sm text-[rgb(var(--fg-muted))] mt-0.5">
            {contests && contests.length > 0
              ? `${contests.length} ${
                  contests.length === 1
                    ? 'задача'
                    : contests.length < 5
                      ? 'задачи'
                      : 'задач'
                }${hideCompleted ? ' · активные' : ''}`
              : 'Список и быстрые действия'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 min-h-[40px]"
                disabled={pdfBusy}
              >
                <Download className="h-4 w-4" />
                Экспорт
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleCsv} className="gap-2">
                <Table className="h-4 w-4" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleIcs} className="gap-2">
                <CalendarRange className="h-4 w-4" />
                ICS
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => void handlePdf()}
                disabled={pdfBusy}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to="/create" className="hidden md:block">
            <Button size="sm" className="gap-2 min-h-[40px]">
              <Plus className="h-4 w-4" />
              Создать
            </Button>
          </Link>
        </div>
      </div>

      {/* Компактный обзор — одна полоса */}
      <StatsCards />

      {/* Дедлайны горизонтально — не толкают список вниз */}
      <DeadlineStrip />

      {/* Фильтры + список сразу */}
      <div className="space-y-3 pt-1">
        <ContestFilters compact />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="min-h-[132px] rounded-2xl" />
            ))}
          </div>
        ) : !contests || contests.length === 0 ? (
          <div className="glass-subtle p-10 rounded-3xl flex flex-col items-center text-center border-dashed border-2 border-[rgb(var(--border-default))]">
            <div className="h-14 w-14 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center mb-3">
              <ListTodo className="h-7 w-7 text-accent-500" />
            </div>
            <h3 className="text-lg font-bold mb-1">
              {hideCompleted ? 'Нет активных задач' : 'Пока пусто'}
            </h3>
            <p className="text-sm text-[rgb(var(--fg-secondary))] mb-5 max-w-sm">
              {hideCompleted
                ? 'Всё сделано — или покажите готовые (иконка глаза).'
                : 'Создайте первую задачу.'}
            </p>
            <Link to="/create">
              <Button className="gap-2 min-h-[44px]">
                <Plus className="h-4 w-4" />
                Создать
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch auto-rows-fr"
              layout
            >
              <AnimatePresence mode="popLayout">
                {visibleContests.map((contest, index) => (
                  <ContestCard key={contest.id} contest={contest} index={index} />
                ))}
              </AnimatePresence>
            </motion.div>
            {hasMore && (
              <div className="flex justify-center pt-1">
                <Button
                  variant="outline"
                  className="min-h-[44px] w-full sm:w-auto"
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                >
                  Ещё {(contests?.length ?? 0) - visibleCount}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Аналитика — внизу, по желанию */}
      <div className="pt-2 border-t border-[rgb(var(--border-default))]">
        <button
          type="button"
          onClick={() => setShowMoreStats((v) => !v)}
          className="flex w-full items-center justify-between py-2 text-sm font-medium text-[rgb(var(--fg-secondary))] hover:text-[rgb(var(--fg-primary))]"
        >
          <span>Активность</span>
          {showMoreStats ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        {showMoreStats && (
          <div className="pb-2 animate-in fade-in slide-in-from-top-1">
            <ActivityHeatmap />
          </div>
        )}
      </div>
    </div>
  );
}
