/**
 * ContestFilters — поиск, фильтрация по статусу и сортировка
 */
import { useAppStore } from '@/stores/app-store';
import { Input } from '@/components/ui/input';
import { Search, SlidersHorizontal, ArrowDownUp } from 'lucide-react';
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/constants';
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
import type { ContestStatus } from '@/types';

export function ContestFilters() {
  const {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    sortBy, setSortBy,
    sortOrder, setSortOrder
  } = useAppStore();

  const handleSortToggle = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc'); // По умолчанию по возрастанию для нового поля
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Поиск */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--fg-muted))]" />
        <Input
          placeholder="Поиск по названию..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-11"
        />
      </div>

      <div className="flex gap-2 shrink-0">
        {/* Фильтр по статусу (горизонтальный скролл на мобильных) */}
        <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1.5 sm:hidden pb-1">
          <FilterTab
            label="Все"
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
          {STATUS_ORDER.map(status => (
            <FilterTab
              key={status}
              label={STATUS_LABELS[status]}
              active={statusFilter === status}
              onClick={() => setStatusFilter(status)}
            />
          ))}
        </div>

        {/* Фильтр по статусу (dropdown для desktop) */}
        <div className="hidden sm:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 gap-2 border-dashed">
                <SlidersHorizontal className="h-4 w-4" />
                {statusFilter === 'all' ? 'Статус: Все' : STATUS_LABELS[statusFilter]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                <span className={cn('flex-1', statusFilter === 'all' && 'font-bold text-accent-500')}>Все статусы</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {STATUS_ORDER.map(status => (
                <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>
                  <span className={cn('flex-1', statusFilter === status && 'font-bold text-accent-500')}>
                    {STATUS_LABELS[status]}
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>
                <span className={cn('flex-1', statusFilter === 'cancelled' && 'font-bold text-accent-500')}>
                  {STATUS_LABELS['cancelled']}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Сортировка */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-11 w-11 px-0 sm:w-auto sm:px-4 gap-2 border-dashed">
              <ArrowDownUp className="h-4 w-4" />
              <span className="hidden sm:inline">
                {sortBy === 'due_date' ? 'По дедлайну' : sortBy === 'created_at' ? 'По созданию' : 'По алфавиту'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => handleSortToggle('due_date')}>
                <span className={cn('flex-1', sortBy === 'due_date' && 'font-bold text-accent-500')}>Дедлайн</span>
                {sortBy === 'due_date' && <span className="text-xs text-[rgb(var(--fg-muted))]">{sortOrder === 'asc' ? 'Сначала ближ.' : 'Сначала дал.'}</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortToggle('created_at')}>
                <span className={cn('flex-1', sortBy === 'created_at' && 'font-bold text-accent-500')}>Дата создания</span>
                {sortBy === 'created_at' && <span className="text-xs text-[rgb(var(--fg-muted))]">{sortOrder === 'asc' ? 'Сначала стар.' : 'Сначала нов.'}</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortToggle('title')}>
                <span className={cn('flex-1', sortBy === 'title' && 'font-bold text-accent-500')}>Название</span>
                {sortBy === 'title' && <span className="text-xs text-[rgb(var(--fg-muted))]">{sortOrder === 'asc' ? 'А-Я' : 'Я-А'}</span>}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Вспомогательный компонент для мобильных вкладок
function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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
