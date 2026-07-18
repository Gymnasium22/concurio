/**
 * Dashboard — задачи сверху, компактный обзор, без «пустоты» слева
 */
import { useMemo, useRef, useState } from 'react';
import {
  useContests,
  useDashboardStats,
  exportContestsCsv,
  exportContestsIcs,
  useImportContestsCsv,
} from '@/hooks/use-contests';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { DeadlineStrip } from '@/components/dashboard/deadline-strip';
import { FocusBoard } from '@/components/dashboard/focus-board';
import { QuickCreate } from '@/components/dashboard/quick-create';
import { ActivityHeatmap } from '@/components/dashboard/activity-heatmap';
import { ContestFilters } from '@/components/dashboard/contest-filters';
import { ContestCard } from '@/components/contest/contest-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ListTodo,
  FileDown,
  Table,
  CalendarRange,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadTasksPdfReport } from '@/lib/pdf-report';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/use-toast';
import { useAppStore } from '@/stores/app-store';
import { usePreferences, useSavePreferences, useWorkspaces } from '@/hooks/use-platform';
import type { HomeWidgetId } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { FOCUS_TAB_LABELS, matchesFocusTab, type FocusTab } from '@/lib/focus-buckets';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { workspaceScopeLabel } from '@/lib/workspace-scope';

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
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const { data: workspaces } = useWorkspaces();
  const activeWsName = workspaceScopeLabel(activeWorkspaceId, workspaces);

  const [pdfBusy, setPdfBusy] = useState(false);
  const [pageExtra, setPageExtra] = useState(0);
  const [showMoreStats, setShowMoreStats] = useState(false);
  /** Фокус-фильтр списка: null = все задачи */
  const [focusFilter, setFocusFilter] = useState<FocusTab | null>(null);
  const listSectionRef = useRef<HTMLDivElement>(null);
  const importCsv = useImportContestsCsv();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: prefs } = usePreferences();
  const savePrefs = useSavePreferences();
  const widgets = prefs?.widgets ?? ['stats', 'deadlines', 'list', 'heatmap'];

  const toggleWidget = (id: HomeWidgetId) => {
    const next = widgets.includes(id)
      ? widgets.filter((w) => w !== id)
      : [...widgets, id];
    void savePrefs.mutateAsync({ widgets: next.length ? next : ['list'] });
  };

  const handleFocusTab = (tab: FocusTab) => {
    setFocusFilter((prev) => {
      // повторный клик по той же вкладке — сброс «показать все»
      if (prev === tab) return null;
      return tab;
    });
    setPageExtra(0);
    // На mobile полезно доскроллить к списку; на desktop сайдбар sticky — не дёргаем
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 1023px)').matches
    ) {
      requestAnimationFrame(() => {
        listSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    }
  };

  const filterKey = `${searchQuery}|${statusFilter}|${hideCompleted}|${taskTypeFilter}|${priorityFilter}|${focusFilter ?? ''}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPageExtra(0);
  }

  const focusedContests = useMemo(() => {
    const all = contests ?? [];
    if (!focusFilter) return all;
    return all.filter((c) => matchesFocusTab(c, focusFilter));
  }, [contests, focusFilter]);

  const visibleCount = PAGE_SIZE + pageExtra;
  const visibleContests = useMemo(
    () => focusedContests.slice(0, visibleCount),
    [focusedContests, visibleCount]
  );
  const hasMore = focusedContests.length > visibleCount;

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

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const n = await importCsv.mutateAsync(file);
      toast({
        title: 'Импорт завершён',
        description: `Создано задач: ${n}`,
        variant: 'success',
      });
    } catch (e) {
      toast({
        title: 'Ошибка импорта',
        description: e instanceof Error ? e.message : undefined,
        variant: 'error',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-5 animate-in fade-in duration-500">
      {/* Шапка — короче на desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Главная</h1>
          <p className="text-xs sm:text-sm text-[rgb(var(--fg-muted))] mt-0.5 truncate">
            {contests && contests.length > 0
              ? `${contests.length} ${
                  contests.length === 1
                    ? 'задача'
                    : contests.length < 5
                      ? 'задачи'
                      : 'задач'
                }${
                  statusFilter === 'done'
                    ? ' · готовые'
                    : hideCompleted
                      ? ' · активные'
                      : ''
                }`
              : 'Фокус сверху · список и сводка рядом'}
            {activeWsName ? ` · ${activeWsName}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => void handleImportFile(e.target.files?.[0])}
          />

          {/* Одно меню «Данные» — меньше шума на desktop */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 min-h-[40px]"
                disabled={pdfBusy || importCsv.isPending}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Данные</span>
                <span className="sm:hidden">Ещё</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                disabled={importCsv.isPending}
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Импорт CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCsv} className="gap-2">
                <Table className="h-4 w-4" />
                Экспорт CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleIcs} className="gap-2">
                <CalendarRange className="h-4 w-4" />
                Экспорт ICS
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => void handlePdf()}
                disabled={pdfBusy}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                Экспорт PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--fg-muted))]">
                Виджеты
              </p>
              {(
                [
                  ['stats', 'Статистика'],
                  ['deadlines', 'Дедлайны'],
                  ['list', 'Список'],
                  ['heatmap', 'Активность'],
                  ['analytics', 'Ссылка на аналитику'],
                ] as const
              ).map(([id, label]) => (
                <DropdownMenuCheckboxItem
                  key={id}
                  checked={widgets.includes(id)}
                  onCheckedChange={() => toggleWidget(id)}
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/*
        Desktop (lg+): 2 колонки — слева фокус+список, справа панель.
        Mobile: стол без дублей дайджест/статы/дедлайны.
      */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-5 lg:items-start">
        {/* ——— Основная колонка ——— */}
        <div className="lg:col-span-8 space-y-3 sm:space-y-4 min-w-0">
          <FocusBoard
            activeTab={focusFilter}
            onTabChange={handleFocusTab}
            listLinked={focusFilter != null}
          />

          {/* Быстрые шаблоны только на mobile (на desktop — в сайдбаре) */}
          <div className="lg:hidden">
            <QuickCreate />
          </div>

          {/* Статы/дедлайны на mobile; на desktop уезжают в сайдбар */}
          <div className="space-y-3 lg:hidden">
            {widgets.includes('stats') && <StatsCards />}
            {widgets.includes('deadlines') && <DeadlineStrip />}
          </div>

          {/* Список */}
          <div ref={listSectionRef} className="space-y-3 scroll-mt-20">
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <h2 className="text-sm font-semibold text-[rgb(var(--fg-secondary))]">
                {focusFilter ? `Фокус: ${FOCUS_TAB_LABELS[focusFilter]}` : 'Все задачи'}
                {focusFilter && (
                  <span className="ml-1.5 font-normal text-[rgb(var(--fg-muted))] tabular-nums">
                    ({focusedContests.length})
                  </span>
                )}
              </h2>
              {focusFilter && (
                <button
                  type="button"
                  onClick={() => setFocusFilter(null)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border border-accent-300',
                    'bg-accent-50 dark:bg-accent-900/30 dark:border-accent-800',
                    'px-2.5 py-1 text-xs font-medium text-accent-700 dark:text-accent-300',
                    'min-h-[32px] touch-manipulation'
                  )}
                >
                  Сбросить фокус
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <ContestFilters compact />

            {widgets.includes('list') &&
              (isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="min-h-[132px] rounded-2xl" />
                  ))}
                </div>
              ) : !contests || contests.length === 0 ? (
                <EmptyState
                  icon={<ListTodo className="h-7 w-7 text-accent-500" />}
                  title={
                    statusFilter === 'done'
                      ? 'Нет готовых задач'
                      : hideCompleted
                        ? 'Нет активных задач'
                        : 'Пока пусто'
                  }
                  description={
                    statusFilter === 'done'
                      ? 'Закройте задачу статусом «Готово» — она появится здесь.'
                      : hideCompleted
                        ? 'Всё сделано — или откройте готовые (иконка глаза). Шаблон «на неделю» — быстрый старт.'
                        : 'Один клик — и первая задача. Или ⌘K → «Создать».'
                  }
                  actionLabel="Создать задачу"
                  actionTo="/create"
                  secondary={
                    <Link
                      to="/create?template=weekly"
                      className="text-xs font-medium text-accent-600 dark:text-accent-400 hover:underline"
                    >
                      Или шаблон «На неделю»
                    </Link>
                  }
                />
              ) : focusedContests.length === 0 && focusFilter ? (
                <div className="rounded-2xl border border-dashed border-[rgb(var(--border-default))] px-4 py-8 text-center space-y-3">
                  <p className="text-sm text-[rgb(var(--fg-secondary))]">
                    В «{FOCUS_TAB_LABELS[focusFilter]}» сейчас пусто
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[40px]"
                    onClick={() => setFocusFilter(null)}
                  >
                    Показать все задачи
                  </Button>
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
                        onClick={() => setPageExtra((n) => n + PAGE_SIZE)}
                      >
                        Ещё {focusedContests.length - visibleCount}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
          </div>

          {widgets.includes('heatmap') && (
            <div className="pt-2 border-t border-[rgb(var(--border-default))]">
              <button
                type="button"
                onClick={() => setShowMoreStats((v) => !v)}
                className="flex w-full items-center justify-between py-2 text-sm font-medium text-[rgb(var(--fg-secondary))] hover:text-[rgb(var(--fg-primary))]"
                aria-expanded={showMoreStats}
              >
                <span>Активность</span>
                {showMoreStats ? (
                  <ChevronUp className="h-4 w-4" aria-hidden />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden />
                )}
              </button>
              {showMoreStats && (
                <div className="pb-1 animate-in fade-in">
                  <ActivityHeatmap />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ——— Сайдбар desktop ——— */}
        <aside className="hidden lg:flex lg:col-span-4 flex-col gap-3 sticky top-[4.5rem] max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain pb-4">
          <QuickCreate vertical />

          {widgets.includes('stats') && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--fg-muted))] px-0.5">
                Сводка
              </p>
              <StatsCards compact />
            </div>
          )}

          {widgets.includes('deadlines') && <DeadlineStrip />}

          {widgets.includes('analytics') && (
            <Link
              to="/analytics"
              className="rounded-2xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-card))] px-3 py-3 text-sm flex justify-between items-center hover:border-accent-400/50 transition-colors"
            >
              <span className="text-[rgb(var(--fg-secondary))]">Аналитика</span>
              <span className="text-accent-500 font-medium">Открыть →</span>
            </Link>
          )}

          <p className="text-[10px] text-[rgb(var(--fg-muted))] px-1 leading-relaxed">
            Вкладки фокуса фильтруют список. Дайджест в TG: /today.
          </p>
        </aside>
      </div>
    </div>
  );
}
