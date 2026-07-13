/**
 * Dashboard — список задач + обзор + экспорт
 */
import { useEffect, useMemo, useState } from 'react';
import {
  useContests,
  useDashboardStats,
  exportContestsCsv,
  exportContestsIcs,
} from '@/hooks/use-contests';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { DeadlineList } from '@/components/dashboard/deadline-list';
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

  // Сброс пагинации при смене фильтров
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
    <div className="space-y-5 sm:space-y-8 animate-in fade-in duration-500">
      <div className="md:hidden pt-1">
        <h1 className="text-2xl font-bold tracking-tight">Мои задачи</h1>
        <p className="text-sm text-[rgb(var(--fg-muted))] mt-1">
          Обзор, дедлайны и список
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-medium text-[rgb(var(--fg-secondary))] uppercase tracking-wider hidden md:block">
            Обзор
          </h2>
          <StatsCards />
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[rgb(var(--fg-secondary))] uppercase tracking-wider hidden md:block">
            Внимание
          </h2>
          <div className="space-y-3 sm:space-y-4">
            <DeadlineList />
            <div className="hidden sm:block">
              <ActivityHeatmap />
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap на мобиле — ниже, не сжимает дедлайны */}
      <div className="sm:hidden">
        <ActivityHeatmap />
      </div>

      <div className="space-y-4 pt-4 border-t border-[rgb(var(--border-default))]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold">
              {hideCompleted ? 'Активные задачи' : 'Все задачи'}
            </h2>
            {contests && contests.length > 0 && (
              <p className="text-xs text-[rgb(var(--fg-muted))] mt-0.5">
                {contests.length}{' '}
                {contests.length === 1
                  ? 'задача'
                  : contests.length < 5
                    ? 'задачи'
                    : 'задач'}
                {hasMore ? ` · показано ${visibleContests.length}` : ''}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0 min-h-[40px]"
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
                  CSV (таблица)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleIcs} className="gap-2">
                  <CalendarRange className="h-4 w-4" />
                  ICS (календарь)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void handlePdf()}
                  disabled={pdfBusy}
                  className="gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  PDF-отчёт
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to="/create" className="hidden md:block">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Новая задача
              </Button>
            </Link>
          </div>
        </div>

        <ContestFilters />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                className="min-h-[156px] sm:min-h-[164px] h-full rounded-2xl"
              />
            ))}
          </div>
        ) : !contests || contests.length === 0 ? (
          <div className="glass-subtle p-10 sm:p-12 rounded-3xl flex flex-col items-center justify-center text-center border-dashed border-2 border-[rgb(var(--border-default))]">
            <div className="h-16 w-16 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center mb-4">
              <ListTodo className="h-8 w-8 text-accent-500" />
            </div>
            <h3 className="text-lg font-bold mb-2">
              {hideCompleted ? 'Нет активных задач' : 'Здесь пока пусто'}
            </h3>
            <p className="text-[rgb(var(--fg-secondary))] mb-6 max-w-sm text-sm">
              {hideCompleted
                ? 'Всё сделано — или нажмите «Показать готовые», чтобы увидеть архив.'
                : 'Добавьте конкурс, задачу или напоминание.'}
            </p>
            <Link to="/create">
              <Button className="gap-2 min-h-[44px]">
                <Plus className="h-4 w-4" />
                Создать задачу
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-stretch auto-rows-fr"
              layout
            >
              <AnimatePresence mode="popLayout">
                {visibleContests.map((contest, index) => (
                  <ContestCard key={contest.id} contest={contest} index={index} />
                ))}
              </AnimatePresence>
            </motion.div>
            {hasMore && (
              <div className="flex justify-center pt-1 pb-2">
                <Button
                  variant="outline"
                  className="min-h-[44px] w-full sm:w-auto"
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                >
                  Показать ещё ({(contests?.length ?? 0) - visibleCount})
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
