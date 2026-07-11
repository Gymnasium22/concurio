/**
 * ContestFilters — поиск, тип, статус, приоритет, сортировка, архив
 */
import { useAppStore } from '@/stores/app-store';
import { Input } from '@/components/ui/input';
import {
  Search,
  SlidersHorizontal,
  ArrowDownUp,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ContestFilters() {
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

  const sortLabel =
    sortBy === 'due_date'
      ? 'По дедлайну'
      : sortBy === 'created_at'
        ? 'По созданию'
        : sortBy === 'priority'
          ? 'По приоритету'
          : 'По алфавиту';

  return (
    <div className="flex flex-col gap-3 w-full min-w-0">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full min-w-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--fg-muted))]" />
          <Input
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11 w-full"
          />
        </div>

        <div className="flex gap-2 shrink-0 overflow-x-auto no-scrollbar">
          <Button
            type="button"
            variant="outline"
            className={cn(
              'h-11 gap-2 border-dashed shrink-0',
              !hideCompleted &&
                'border-accent-300 bg-accent-50 text-accent-700 dark:border-accent-800 dark:bg-accent-900/30 dark:text-accent-300'
            )}
            onClick={() => {
              const next = !hideCompleted;
              setHideCompleted(next);
              // При скрытии архива сбрасываем фильтр «Готово/Отменён», чтобы не остаться на пустом списке
              if (next && (statusFilter === 'done' || statusFilter === 'cancelled')) {
                setStatusFilter('all');
              }
            }}
            title={
              hideCompleted
                ? 'Готовые скрыты. Нажмите, чтобы показать архив'
                : 'Показаны все задачи. Нажмите, чтобы скрыть готовые'
            }
          >
            {hideCompleted ? (
              <Archive className="h-4 w-4" />
            ) : (
              <ArchiveRestore className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {hideCompleted ? 'Архив' : 'Только активные'}
            </span>
            <span className="sm:hidden">
              {hideCompleted ? 'Архив' : 'Активные'}
            </span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 gap-2 border-dashed">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {taskTypeFilter === 'all'
                    ? 'Тип: Все'
                    : TASK_TYPE_LABELS[taskTypeFilter]}
                </span>
                <span className="sm:hidden">Тип</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setTaskTypeFilter('all')}>
                <span
                  className={cn(
                    'flex-1',
                    taskTypeFilter === 'all' && 'font-bold text-accent-500'
                  )}
                >
                  Все типы
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {TASK_TYPE_ORDER.map((type) => (
                <DropdownMenuItem key={type} onClick={() => setTaskTypeFilter(type)}>
                  <span
                    className={cn(
                      'flex-1',
                      taskTypeFilter === type && 'font-bold text-accent-500'
                    )}
                  >
                    {TASK_TYPE_LABELS[type]}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 gap-2 border-dashed">
                {statusFilter === 'all' ? 'Статус' : STATUS_LABELS[statusFilter]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                <span
                  className={cn(
                    'flex-1',
                    statusFilter === 'all' && 'font-bold text-accent-500'
                  )}
                >
                  Все статусы
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {STATUS_ORDER.map((status) => (
                <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>
                  <span
                    className={cn(
                      'flex-1',
                      statusFilter === status && 'font-bold text-accent-500'
                    )}
                  >
                    {STATUS_LABELS[status]}
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>
                <span
                  className={cn(
                    'flex-1',
                    statusFilter === 'cancelled' && 'font-bold text-accent-500'
                  )}
                >
                  {STATUS_LABELS.cancelled}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-11 w-11 px-0 sm:w-auto sm:px-4 gap-2 border-dashed"
              >
                <ArrowDownUp className="h-4 w-4" />
                <span className="hidden sm:inline">{sortLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => handleSortToggle('due_date')}>
                  <span
                    className={cn(
                      'flex-1',
                      sortBy === 'due_date' && 'font-bold text-accent-500'
                    )}
                  >
                    Дедлайн
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortToggle('priority')}>
                  <span
                    className={cn(
                      'flex-1',
                      sortBy === 'priority' && 'font-bold text-accent-500'
                    )}
                  >
                    Приоритет
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortToggle('created_at')}>
                  <span
                    className={cn(
                      'flex-1',
                      sortBy === 'created_at' && 'font-bold text-accent-500'
                    )}
                  >
                    Дата создания
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortToggle('title')}>
                  <span
                    className={cn(
                      'flex-1',
                      sortBy === 'title' && 'font-bold text-accent-500'
                    )}
                  >
                    Название
                  </span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Быстрые чипы типа на мобильных */}
      <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-1 sm:hidden">
        <FilterTab
          label="Все"
          active={taskTypeFilter === 'all'}
          onClick={() => setTaskTypeFilter('all')}
        />
        {TASK_TYPE_ORDER.map((type) => (
          <FilterTab
            key={type}
            label={TASK_TYPE_LABELS[type]}
            active={taskTypeFilter === type}
            onClick={() => setTaskTypeFilter(type)}
          />
        ))}
      </div>

      {/* Приоритет — чипы */}
      <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-1">
        <FilterTab
          label="Любой приоритет"
          active={priorityFilter === 'all'}
          onClick={() => setPriorityFilter('all')}
        />
        {PRIORITY_ORDER.map((p) => (
          <FilterTab
            key={p}
            label={PRIORITY_LABELS[p]}
            active={priorityFilter === p}
            onClick={() => setPriorityFilter(p)}
          />
        ))}
      </div>
    </div>
  );
}

function FilterTab({
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
      onClick={onClick}
      className={cn(
        'whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
        active
          ? 'bg-accent-100 text-accent-700 border-accent-200 dark:bg-accent-900/30 dark:text-accent-300 dark:border-accent-800'
          : 'bg-transparent text-[rgb(var(--fg-secondary))] border-[rgb(var(--border-default))] hover:bg-[rgb(var(--bg-secondary))]'
      )}
    >
      {label}
    </button>
  );
}
