/**
 * Dashboard — список / канбан / календарь + PDF-отчёт
 */
import { useState } from 'react';
import { useContests, useDashboardStats } from '@/hooks/use-contests';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { DeadlineList } from '@/components/dashboard/deadline-list';
import { ContestFilters } from '@/components/dashboard/contest-filters';
import { ContestCard } from '@/components/contest/contest-card';
import { KanbanBoard } from '@/components/task/kanban-board';
import { DeadlineCalendar } from '@/components/task/deadline-calendar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ListTodo, Plus, LayoutGrid, CalendarDays, FileDown, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadTasksPdfReport } from '@/lib/pdf-report';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import type { ViewMode } from '@/types';

export function Dashboard() {
  const { data: contests, isLoading } = useContests();
  const { data: stats } = useDashboardStats();
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<ViewMode>('list');
  const [pdfBusy, setPdfBusy] = useState(false);

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

  const viewTabs: { id: ViewMode; label: string; icon: typeof List }[] = [
    { id: 'list', label: 'Список', icon: List },
    { id: 'kanban', label: 'Канбан', icon: LayoutGrid },
    { id: 'calendar', label: 'Календарь', icon: CalendarDays },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div className="md:hidden pt-2 pb-2">
        <h1 className="text-2xl font-bold tracking-tight">Мои задачи</h1>
        <p className="text-sm text-[rgb(var(--fg-muted))] mt-1">
          Список, канбан, календарь и PDF-отчёт
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-medium text-[rgb(var(--fg-secondary))] mb-3 uppercase tracking-wider hidden md:block">
            Обзор
          </h2>
          <StatsCards />
        </div>
        <div>
          <h2 className="text-sm font-medium text-[rgb(var(--fg-secondary))] mb-3 uppercase tracking-wider hidden md:block">
            Внимание
          </h2>
          <DeadlineList />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-[rgb(var(--border-default))]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Все задачи</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex flex-1 sm:flex-none rounded-xl border border-[rgb(var(--border-default))] p-0.5 bg-[rgb(var(--bg-secondary))]/50 overflow-x-auto no-scrollbar">
              {viewTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors shrink-0 touch-manipulation min-h-[40px]',
                    view === id
                      ? 'bg-[rgb(var(--bg-card))] text-accent-600 shadow-sm'
                      : 'text-[rgb(var(--fg-muted))] hover:text-[rgb(var(--fg-primary))]'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0 min-h-[40px]"
              onClick={handlePdf}
              disabled={pdfBusy}
            >
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
            <Link to="/create" className="hidden md:block">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Новая задача
              </Button>
            </Link>
          </div>
        </div>

        <ContestFilters />

        {view === 'kanban' && <KanbanBoard />}
        {view === 'calendar' && <DeadlineCalendar />}

        {view === 'list' &&
          (isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="min-h-[200px] sm:min-h-[212px] h-full rounded-2xl" />
              ))}
            </div>
          ) : !contests || contests.length === 0 ? (
            <div className="glass-subtle p-12 rounded-3xl flex flex-col items-center justify-center text-center border-dashed border-2 border-[rgb(var(--border-default))]">
              <div className="h-16 w-16 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center mb-4">
                <ListTodo className="h-8 w-8 text-accent-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">Здесь пока пусто</h3>
              <p className="text-[rgb(var(--fg-secondary))] mb-6 max-w-sm">
                Добавьте конкурс, задачу или напоминание.
              </p>
              <Link to="/create">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Создать первую задачу
                </Button>
              </Link>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch auto-rows-fr"
              layout
            >
              <AnimatePresence mode="popLayout">
                {contests.map((contest, index) => (
                  <ContestCard key={contest.id} contest={contest} index={index} />
                ))}
              </AnimatePresence>
            </motion.div>
          ))}
      </div>
    </div>
  );
}
