/**
 * ContestFilters — поиск + bottom-sheet фильтры (не уезжают за экран)
 */
import { useState, type ReactNode } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Input } from '@/components/ui/input';
import { Search, Eye, EyeOff, SlidersHorizontal, ArrowDownUp, X } from 'lucide-react';
import {
  STATUS_LABELS,
  STATUS_ORDER,
  TASK_TYPE_LABELS,
  TASK_TYPE_ORDER,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
} from '@/lib/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ContestStatus, TaskPriority, TaskType } from '@/types';

interface ContestFiltersProps {
  /** Компактный режим (канбан) — без чипов */
  compact?: boolean;
}

export function ContestFilters({ compact = false }: ContestFiltersProps) {
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    hideCompleted,
    setHideCompleted,
    taskTypeFilter,
    setTaskTypeFilter,
    priorityFilter,
    setPriorityFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
  } = useAppStore();

  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleSortToggle = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder(newSortBy === 'priority' ? 'desc' : 'asc');
    }
  };

  /** Режим «только готовые» (глаз) */
  const showingDoneOnly = statusFilter === 'done';

  const activeFilterCount = [
    statusFilter !== 'all' && !showingDoneOnly,
    taskTypeFilter !== 'all',
    priorityFilter !== 'all',
    showingDoneOnly,
  ].filter(Boolean).length;

  const hasActiveFilters =
    searchQuery.trim() !== '' || activeFilterCount > 0 || !hideCompleted;

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTaskTypeFilter('all');
    setPriorityFilter('all');
    setHideCompleted(true);
  };

  /** Глаз: активные ↔ только готовые (не «все подряд») */
  const toggleDoneView = () => {
    if (showingDoneOnly) {
      setHideCompleted(true);
      setStatusFilter('all');
    } else {
      setHideCompleted(false);
      setStatusFilter('done');
    }
  };

  const filterSummary =
    activeFilterCount > 0 ? `Фильтры · ${activeFilterCount}` : 'Фильтры';

  return (
    <div className={cn('flex flex-col w-full min-w-0', compact ? 'gap-2' : 'gap-2.5')}>
      <div className="flex gap-2 w-full min-w-0 items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--fg-muted))]" />
          <Input
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn('pl-9 w-full', compact ? 'h-10' : 'h-11')}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            'shrink-0',
            compact ? 'h-10 w-10' : 'h-11 w-11',
            showingDoneOnly &&
              'border-accent-300 bg-accent-50 text-accent-700 dark:border-accent-800 dark:bg-accent-900/30'
          )}
          onClick={toggleDoneView}
          title={showingDoneOnly ? 'Вернуться к активным' : 'Показать только готовые'}
          aria-pressed={showingDoneOnly}
          aria-label={
            showingDoneOnly ? 'Вернуться к активным' : 'Показать только готовые'
          }
        >
          {showingDoneOnly ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>

        <Button
          type="button"
          variant="outline"
          className={cn(
            'shrink-0 gap-1.5 px-2.5 sm:px-3',
            compact ? 'h-10' : 'h-11',
            activeFilterCount > 0 &&
              'border-accent-300 bg-accent-50 dark:bg-accent-900/20'
          )}
          onClick={() => setFiltersOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden xs:inline sm:inline text-sm">{filterSummary}</span>
          {activeFilterCount > 0 && (
            <span className="sm:hidden flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-white px-1">
              {activeFilterCount}
            </span>
          )}
        </Button>

        <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DialogContent
            className={cn(
              /* компактный sheet: не выше ~72dvh, скролл внутри */
              'max-h-[min(72dvh,var(--tg-viewport-stable-height,72dvh))]',
              'sm:max-w-md sm:max-h-[min(80vh,640px)]',
              'flex flex-col gap-0 p-0 overflow-hidden'
            )}
          >
            <DialogHeader className="shrink-0 px-4 pt-4 pb-2 pr-12 sm:px-6 sm:pt-5">
              <DialogTitle>Фильтры</DialogTitle>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-2 sm:px-6 space-y-5">
              <FilterSection title="Тип">
                <ChipRow>
                  <FilterChip
                    active={taskTypeFilter === 'all'}
                    onClick={() => setTaskTypeFilter('all')}
                    label="Все"
                  />
                  {TASK_TYPE_ORDER.map((type) => (
                    <FilterChip
                      key={type}
                      active={taskTypeFilter === type}
                      onClick={() => setTaskTypeFilter(type)}
                      label={TASK_TYPE_LABELS[type]}
                    />
                  ))}
                </ChipRow>
              </FilterSection>

              <FilterSection title="Статус">
                <ChipRow>
                  <FilterChip
                    active={statusFilter === 'all' && !showingDoneOnly}
                    onClick={() => {
                      setStatusFilter('all');
                      setHideCompleted(true);
                    }}
                    label="Все активные"
                  />
                  {STATUS_ORDER.map((status) => (
                    <FilterChip
                      key={status}
                      active={statusFilter === status}
                      onClick={() => {
                        setStatusFilter(status as ContestStatus);
                        if (status === 'done') setHideCompleted(false);
                        else if (status !== 'cancelled') setHideCompleted(true);
                      }}
                      label={STATUS_LABELS[status]}
                    />
                  ))}
                  <FilterChip
                    active={statusFilter === 'cancelled'}
                    onClick={() => {
                      setStatusFilter('cancelled');
                      setHideCompleted(false);
                    }}
                    label={STATUS_LABELS.cancelled}
                  />
                </ChipRow>
              </FilterSection>

              <FilterSection title="Приоритет">
                <ChipRow>
                  <FilterChip
                    active={priorityFilter === 'all'}
                    onClick={() => setPriorityFilter('all')}
                    label="Любой"
                  />
                  {PRIORITY_ORDER.map((p) => (
                    <FilterChip
                      key={p}
                      active={priorityFilter === p}
                      onClick={() => setPriorityFilter(p as TaskPriority)}
                      label={PRIORITY_LABELS[p]}
                    />
                  ))}
                </ChipRow>
              </FilterSection>
            </div>

            <div className="shrink-0 flex gap-2 border-t border-[rgb(var(--border-default))] px-4 py-3 sm:px-6">
              <Button
                type="button"
                variant="outline"
                className="flex-1 min-h-[44px]"
                onClick={() => {
                  clearFilters();
                }}
              >
                Сбросить
              </Button>
              <Button
                type="button"
                className="flex-1 min-h-[44px]"
                onClick={() => setFiltersOpen(false)}
              >
                Готово
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn('shrink-0', compact ? 'h-10 w-10' : 'h-11 w-11')}
              title="Сортировка"
            >
              <ArrowDownUp className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="bottom"
            collisionPadding={{ top: 12, bottom: 96, left: 12, right: 12 }}
            className="w-48 max-h-[min(var(--radix-dropdown-menu-content-available-height,50vh),calc(100dvh-7rem))]"
          >
            <DropdownMenuGroup>
              {(
                [
                  ['due_date', 'Дедлайн'],
                  ['priority', 'Приоритет'],
                  ['created_at', 'Дата создания'],
                  ['title', 'Название'],
                ] as const
              ).map(([key, label]) => (
                <DropdownMenuItem key={key} onClick={() => handleSortToggle(key)}>
                  <span
                    className={cn(
                      'flex-1',
                      sortBy === key && 'font-bold text-accent-500'
                    )}
                  >
                    {label}
                    {sortBy === key ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('shrink-0', compact ? 'h-10 w-10' : 'h-11 w-11')}
            onClick={clearFilters}
            title="Сбросить"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Активные фильтры — короткие чипы */}
      {!compact && activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {taskTypeFilter !== 'all' && (
            <Chip
              label={TASK_TYPE_LABELS[taskTypeFilter as TaskType]}
              onClear={() => setTaskTypeFilter('all')}
            />
          )}
          {statusFilter !== 'all' && (
            <Chip
              label={STATUS_LABELS[statusFilter]}
              onClear={() => {
                setStatusFilter('all');
                setHideCompleted(true);
              }}
            />
          )}
          {priorityFilter !== 'all' && (
            <Chip
              label={PRIORITY_LABELS[priorityFilter]}
              onClear={() => setPriorityFilter('all')}
            />
          )}
          {showingDoneOnly && (
            <Chip
              label="Только готовые"
              onClear={() => {
                setHideCompleted(true);
                setStatusFilter('all');
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-muted))]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] touch-manipulation',
        active
          ? 'border-accent-400 bg-accent-50 text-accent-700 dark:bg-accent-900/40 dark:text-accent-200 dark:border-accent-700'
          : 'border-[rgb(var(--border-default))] bg-[rgb(var(--bg-secondary))] text-[rgb(var(--fg-secondary))] hover:border-accent-300'
      )}
    >
      {label}
    </button>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1 rounded-full border border-accent-200 bg-accent-50 dark:bg-accent-900/30 dark:border-accent-800 px-2.5 py-0.5 text-xs font-medium text-accent-700 dark:text-accent-300"
    >
      {label}
      <X className="h-3 w-3 opacity-70" />
    </button>
  );
}
