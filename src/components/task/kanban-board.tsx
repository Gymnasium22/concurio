/**
 * Канбан: DnD, на desktop колонки заполняют ширину и высоту рабочей области
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useContestsBoard, useUpdateContestStatus } from '@/hooks/use-contests';
import {
  STATUS_LABELS,
  STATUS_ORDER,
  STATUS_HINTS,
  progressForStatusChange,
  PRIORITY_BAR,
  PRIORITY_LABELS,
  TASK_TYPE_LABELS,
} from '@/lib/constants';
import type { Contest, ContestStatus } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, getDeadlineUrgency, getUrgencyColor, cn } from '@/lib/utils';
import { haptic } from '@/lib/telegram';
import { Calendar, GitBranch, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';

const MAIN_COLUMNS: ContestStatus[] = [...STATUS_ORDER];
const ALL_COLUMNS: ContestStatus[] = [...STATUS_ORDER, 'cancelled'];

const COLUMN_ACCENT: Record<ContestStatus, string> = {
  todo: 'border-t-slate-400',
  in_progress: 'border-t-blue-500',
  review: 'border-t-amber-500',
  done: 'border-t-emerald-500',
  cancelled: 'border-t-red-400',
};

export function KanbanBoard() {
  const { data: contests, isLoading } = useContestsBoard();
  const updateStatus = useUpdateContestStatus();
  const { toast } = useToast();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropStatus, setDropStatus] = useState<ContestStatus | null>(null);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-3 px-3 sm:-mx-5 sm:px-5 lg:mx-0 lg:px-0">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton
            key={i}
            className="h-72 w-[220px] shrink-0 rounded-2xl lg:flex-1 lg:w-auto"
          />
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
      progress: progressForStatusChange(status, contest.progress),
    });
    toast({
      title: STATUS_LABELS[status],
      description: contest.title,
      variant: 'success',
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

  return (
    <div
      className={cn(
        'flex gap-2.5 sm:gap-3 overflow-x-auto overscroll-x-contain touch-pan-x',
        'pb-2 pt-0.5',
        '-mx-3 px-3 sm:-mx-5 sm:px-5 lg:mx-0 lg:px-0',
        'scroll-smooth snap-x snap-mandatory lg:snap-none',
        'lg:min-h-[min(72vh,calc(100dvh-13rem))]'
      )}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {ALL_COLUMNS.map((status) => {
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
              'snap-start shrink-0 flex flex-col rounded-2xl border border-t-[3px] transition-colors',
              'bg-[rgb(var(--bg-secondary))]/70',
              COLUMN_ACCENT[status],
              isNarrow
                ? 'w-[148px] sm:w-[160px] lg:w-[11%] lg:min-w-[7.5rem]'
                : 'w-[min(240px,80vw)] sm:w-[250px] lg:flex-1 lg:min-w-0 lg:w-auto',
              'min-h-[200px] max-h-[min(62vh,calc(var(--tg-viewport-stable-height,100dvh)-12rem))]',
              'lg:max-h-none lg:min-h-[min(72vh,calc(100dvh-13rem))]',
              isDropTarget
                ? 'border-accent-400 bg-accent-50/50 dark:bg-accent-900/25 ring-2 ring-accent-400/30'
                : 'border-[rgb(var(--border-default))]'
            )}
          >
            <div className="px-2.5 py-2 border-b border-[rgb(var(--border-default))]/80 flex items-center justify-between shrink-0 gap-1">
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold truncate">
                  {STATUS_LABELS[status]}
                </h3>
                <p className="text-[10px] text-[rgb(var(--fg-muted))] truncate leading-tight mt-0.5 hidden sm:block">
                  {STATUS_HINTS[status]}
                </p>
              </div>
              <span className="text-[10px] font-semibold text-[rgb(var(--fg-muted))] bg-[rgb(var(--bg-card))] px-1.5 py-0.5 rounded-full shrink-0 tabular-nums min-w-[1.25rem] text-center">
                {items.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-1.5 space-y-1.5 min-h-[80px]">
              {items.length === 0 && (
                <div
                  className={cn(
                    'rounded-xl border border-dashed px-2 py-10 text-center',
                    isDropTarget
                      ? 'border-accent-400 bg-accent-50/40 dark:bg-accent-900/20'
                      : 'border-[rgb(var(--border-default))]'
                  )}
                >
                  <p className="text-[11px] text-[rgb(var(--fg-muted))] leading-snug">
                    {isDropTarget ? 'Отпустите сюда' : 'Перетащите карточку'}
                  </p>
                </div>
              )}
              {items.map((c) => {
                const urgency = getDeadlineUrgency(c.due_date);
                const dueColor = getUrgencyColor(urgency);
                const subCount = c.subtask_count ?? 0;
                const subDone = c.subtask_done_count ?? 0;
                const stageDue = c.next_stage_due_date;
                const muted = c.status === 'done' || c.status === 'cancelled';

                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, c)}
                    onDragEnd={onDragEnd}
                    className={cn(
                      'rounded-xl border bg-[rgb(var(--bg-card))] overflow-hidden',
                      'hover:border-accent-400/50 hover:shadow-sm transition-all',
                      'cursor-grab active:cursor-grabbing',
                      draggingId === c.id && 'opacity-40 scale-[0.98]',
                      muted && 'opacity-75',
                      'border-[rgb(var(--border-default))]'
                    )}
                  >
                    <div className="flex">
                      <div
                        className={cn(
                          'w-1 shrink-0 self-stretch',
                          PRIORITY_BAR[c.priority] ?? PRIORITY_BAR.medium
                        )}
                        title={PRIORITY_LABELS[c.priority]}
                      />
                      <div className="flex-1 min-w-0 p-2 pl-2">
                        <div className="flex items-start gap-0.5">
                          <Link
                            to={`/contest/${c.id}`}
                            className="flex-1 min-w-0 block outline-none focus-visible:ring-2 focus-visible:ring-accent-400 rounded-md"
                            draggable={false}
                          >
                            <p
                              className={cn(
                                'text-sm font-semibold line-clamp-2 leading-snug hover:text-accent-500',
                                c.status === 'done' &&
                                  'line-through text-[rgb(var(--fg-muted))]'
                              )}
                            >
                              {c.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                              <span className="text-[10px] text-[rgb(var(--fg-muted))]">
                                {TASK_TYPE_LABELS[c.task_type] ?? 'Задача'}
                              </span>
                              {subCount > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 text-[10px] text-[rgb(var(--fg-muted))] tabular-nums"
                                  title={`Этапы ${subDone}/${subCount}`}
                                >
                                  <GitBranch className="h-2.5 w-2.5" />
                                  {subDone}/{subCount}
                                </span>
                              )}
                            </div>
                            {(c.due_date || stageDue) && (
                              <p
                                className={cn(
                                  'text-[10px] mt-1 flex items-center gap-1 font-medium',
                                  c.due_date ? dueColor : 'text-[rgb(var(--fg-muted))]'
                                )}
                              >
                                <Calendar className="h-3 w-3 shrink-0 opacity-80" />
                                <span className="truncate">
                                  {stageDue && !c.due_date
                                    ? `Этап · ${formatDate(stageDue)}`
                                    : formatDate(c.due_date)}
                                </span>
                              </p>
                            )}
                            <div className="mt-1.5 h-1 rounded-full bg-[rgb(var(--bg-secondary))] overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-[width]',
                                  c.status === 'done'
                                    ? 'bg-emerald-500'
                                    : c.status === 'review'
                                      ? 'bg-amber-500'
                                      : 'bg-accent-500'
                                )}
                                style={{ width: `${Math.min(100, c.progress)}%` }}
                              />
                            </div>
                          </Link>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="p-1.5 rounded-md text-[rgb(var(--fg-muted))] hover:bg-[rgb(var(--bg-secondary))] shrink-0 touch-manipulation min-h-[32px] min-w-[32px] flex items-center justify-center"
                                aria-label="Переместить"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="shrink-0 w-3 lg:hidden" aria-hidden />
    </div>
  );
}
