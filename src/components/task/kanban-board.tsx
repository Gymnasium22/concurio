/**
 * Канбан: DnD, горизонтальный скролл с запасом справа (колонка «Готово» видна)
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useContests, useUpdateContestStatus } from '@/hooks/use-contests';
import { STATUS_LABELS, STATUS_ORDER, STATUS_DEFAULT_PROGRESS } from '@/lib/constants';
import type { Contest, ContestStatus } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, cn } from '@/lib/utils';
import { haptic } from '@/lib/telegram';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Основные колонки; «Отменён» — отдельно в конце, уже уже */
const MAIN_COLUMNS: ContestStatus[] = [...STATUS_ORDER];
const ALL_COLUMNS: ContestStatus[] = [...STATUS_ORDER, 'cancelled'];

export function KanbanBoard() {
  const { data: contests, isLoading } = useContests();
  const updateStatus = useUpdateContestStatus();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropStatus, setDropStatus] = useState<ContestStatus | null>(null);

  if (isLoading) {
    return (
      <div className="flex gap-2.5 overflow-x-auto pb-3 -mx-3 px-3 sm:-mx-4 sm:px-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-56 w-[220px] shrink-0 rounded-2xl" />
        ))}
      </div>
    );
  }

  const byStatus = (status: ContestStatus) =>
    (contests ?? []).filter((c) => c.status === status);

  const moveTo = async (contest: Contest, status: ContestStatus) => {
    if (contest.status === status) return;
    haptic.light();
    await updateStatus.mutateAsync({
      id: contest.id,
      status,
      progress: STATUS_DEFAULT_PROGRESS[status],
    });
  };

  const onDragStart = (e: React.DragEvent, contest: Contest) => {
    e.dataTransfer.setData('text/contest-id', contest.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(contest.id);
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setDropStatus(null);
  };

  const onDropColumn = async (status: ContestStatus, e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/contest-id');
    setDropStatus(null);
    setDraggingId(null);
    if (!id) return;
    const contest = (contests ?? []).find((c) => c.id === id);
    if (!contest) return;
    await moveTo(contest, status);
  };

  const columns = ALL_COLUMNS;

  return (
    <div
      className={cn(
        'flex gap-2.5 overflow-x-auto overscroll-x-contain touch-pan-x',
        'pb-3 pt-0.5',
        /* выравниваем с краями экрана и оставляем padding справа, чтобы «Готово» не обрезалось */
        '-mx-3 px-3 sm:-mx-4 sm:px-4',
        'scroll-smooth',
        'snap-x snap-mandatory'
      )}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {columns.map((status) => {
        const items = byStatus(status);
        const isDropTarget = dropStatus === status;
        const isNarrow = status === 'cancelled';

        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDropStatus(status);
            }}
            onDragLeave={() => {
              if (dropStatus === status) setDropStatus(null);
            }}
            onDrop={(e) => void onDropColumn(status, e)}
            className={cn(
              'snap-start shrink-0 flex flex-col rounded-2xl border transition-colors',
              'bg-[rgb(var(--bg-secondary))]/80',
              /* фиксированная ширина: 4–5 колонок скроллятся, последняя с отступом */
              isNarrow ? 'w-[160px] sm:w-[180px]' : 'w-[min(230px,78vw)] sm:w-[240px]',
              'max-h-[min(70vh,calc(var(--tg-viewport-stable-height,100dvh)-10.5rem))]',
              isDropTarget
                ? 'border-accent-400 bg-accent-50/40 dark:bg-accent-900/20'
                : 'border-[rgb(var(--border-default))]'
            )}
          >
            <div className="px-2.5 py-2.5 border-b border-[rgb(var(--border-default))] flex items-center justify-between shrink-0 gap-1">
              <h3 className="text-xs sm:text-sm font-bold truncate">
                {STATUS_LABELS[status]}
              </h3>
              <span className="text-[10px] font-medium text-[rgb(var(--fg-muted))] bg-[rgb(var(--bg-card))] px-1.5 py-0.5 rounded-full shrink-0 tabular-nums">
                {items.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-1.5 space-y-1.5 min-h-[72px]">
              {items.length === 0 && (
                <p className="text-[11px] text-center text-[rgb(var(--fg-muted))] py-5">
                  {isDropTarget ? 'Сюда' : '—'}
                </p>
              )}
              {items.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, c)}
                  onDragEnd={onDragEnd}
                  className={cn(
                    'rounded-xl p-2.5 border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-card))]',
                    'hover:border-accent-400/40 transition-colors cursor-grab active:cursor-grabbing',
                    draggingId === c.id && 'opacity-50'
                  )}
                >
                  <div className="flex items-start gap-1">
                    <Link
                      to={`/contest/${c.id}`}
                      className="flex-1 min-w-0 block"
                      draggable={false}
                    >
                      <p className="text-sm font-semibold line-clamp-2 hover:text-accent-500">
                        {c.title}
                      </p>
                      {c.due_date && (
                        <p className="text-[10px] text-[rgb(var(--fg-muted))] mt-1">
                          {formatDate(c.due_date)}
                        </p>
                      )}
                      <div className="mt-1.5 h-1 rounded-full bg-[rgb(var(--bg-secondary))]">
                        <div
                          className="h-full rounded-full bg-accent-500"
                          style={{ width: `${c.progress}%` }}
                        />
                      </div>
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="p-1 rounded-md text-[rgb(var(--fg-muted))] hover:bg-[rgb(var(--bg-secondary))] shrink-0"
                          aria-label="Переместить"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        {MAIN_COLUMNS.filter((s) => s !== c.status).map((s) => (
                          <DropdownMenuItem
                            key={s}
                            disabled={updateStatus.isPending}
                            onClick={() => void moveTo(c, s)}
                          >
                            → {STATUS_LABELS[s]}
                          </DropdownMenuItem>
                        ))}
                        {c.status !== 'cancelled' && (
                          <DropdownMenuItem
                            disabled={updateStatus.isPending}
                            onClick={() => void moveTo(c, 'cancelled')}
                            className="text-red-500"
                          >
                            → {STATUS_LABELS.cancelled}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {/* «хвост» скролла — чтобы последняя колонка не прилипала к краю */}
      <div className="shrink-0 w-2 sm:w-3" aria-hidden />
    </div>
  );
}
