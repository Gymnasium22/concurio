/**
 * ContestFilters — компактная полоса: поиск + меню фильтров
 */
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'shrink-0 gap-1.5 px-2.5 sm:px-3',
                compact ? 'h-10' : 'h-11',
                activeFilterCount > 0 &&
                  'border-accent-300 bg-accent-50 dark:bg-accent-900/20'
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline text-sm">{filterSummary}</span>
              {activeFilterCount > 0 && (
                <span className="sm:hidden flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-white px-1">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="bottom"
            collisionPadding={{ top: 12, bottom: 88, left: 12, right: 12 }}
            className="w-56"
          >
            <DropdownMenuLabel>Тип</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setTaskTypeFilter('all')}>
              <span
                className={cn(taskTypeFilter === 'all' && 'font-bold text-accent-500')}
              >
                Все типы
              </span>
            </DropdownMenuItem>
            {TASK_TYPE_ORDER.map((type) => (
              <DropdownMenuItem key={type} onClick={() => setTaskTypeFilter(type)}>
                <span
                  className={cn(taskTypeFilter === type && 'font-bold text-accent-500')}
                >
                  {TASK_TYPE_LABELS[type]}
                </span>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Статус</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setStatusFilter('all')}>
              <span className={cn(statusFilter === 'all' && 'font-bold text-accent-500')}>
                Все статусы
              </span>
            </DropdownMenuItem>
            {STATUS_ORDER.map((status) => (
              <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>
                <span
                  className={cn(statusFilter === status && 'font-bold text-accent-500')}
                >
                  {STATUS_LABELS[status]}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>
              <span
                className={cn(
                  statusFilter === 'cancelled' && 'font-bold text-accent-500'
                )}
              >
                {STATUS_LABELS.cancelled}
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Приоритет</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setPriorityFilter('all')}>
              <span
                className={cn(priorityFilter === 'all' && 'font-bold text-accent-500')}
              >
                Любой
              </span>
            </DropdownMenuItem>
            {PRIORITY_ORDER.map((p) => (
              <DropdownMenuItem key={p} onClick={() => setPriorityFilter(p)}>
                <span className={cn(priorityFilter === p && 'font-bold text-accent-500')}>
                  {PRIORITY_LABELS[p]}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

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
          <DropdownMenuContent align="end" className="w-48">
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
              label={TASK_TYPE_LABELS[taskTypeFilter]}
              onClear={() => setTaskTypeFilter('all')}
            />
          )}
          {statusFilter !== 'all' && (
            <Chip
              label={STATUS_LABELS[statusFilter]}
              onClear={() => setStatusFilter('all')}
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
