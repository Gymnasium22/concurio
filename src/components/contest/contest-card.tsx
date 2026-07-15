/**
 * ContestCard — компактная карточка; быстрые действия в меню «⋯»
 */
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/contest/status-badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  ChevronRight,
  MessageCircle,
  Flag,
  CheckCircle2,
  Play,
  Repeat,
  MoreHorizontal,
  Percent,
} from 'lucide-react';
import { formatDate, getDeadlineUrgency, getUrgencyColor, cn } from '@/lib/utils';
import {
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_BAR,
  progressForStatusChange,
  RECURRENCE_LABELS,
} from '@/lib/constants';
import type { Contest } from '@/types';
import { motion } from 'framer-motion';
import { useUpdateContest, useUpdateContestStatus } from '@/hooks/use-contests';
import { logActivity } from '@/hooks/use-task-extras';
import { haptic } from '@/lib/telegram';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ContestCardProps {
  contest: Contest;
  index: number;
}

const CARD_MIN_H = 'min-h-[132px] sm:min-h-[140px] h-full';

export function ContestCard({ contest, index }: ContestCardProps) {
  const stageDue = contest.next_stage_due_date ?? null;
  const stageTitle = contest.next_stage_title ?? null;
  const showStageDue = !!stageDue;
  /** На карточке: дедлайн задачи, плюс ближайший этап если есть */
  const urgency = getDeadlineUrgency(contest.due_date);
  const urgencyColor = getUrgencyColor(urgency);
  const stageUrgency = getDeadlineUrgency(stageDue);
  const stageUrgencyColor = getUrgencyColor(stageUrgency);
  const subCount = contest.subtask_count ?? 0;
  const subDone = contest.subtask_done_count ?? 0;
  const hasLinks =
    contest.telegram_message_links && contest.telegram_message_links.length > 0;
  const typeStyle = TASK_TYPE_COLORS[contest.task_type] ?? TASK_TYPE_COLORS.task;
  const priorityStyle = PRIORITY_COLORS[contest.priority] ?? PRIORITY_COLORS.medium;

  const updateStatus = useUpdateContestStatus();
  const updateContest = useUpdateContest();
  const { toast } = useToast();

  const showActions = contest.status !== 'done' && contest.status !== 'cancelled';
  const busy = updateStatus.isPending || updateContest.isPending;

  const markDone = async () => {
    haptic.success();
    await updateStatus.mutateAsync({
      id: contest.id,
      status: 'done',
      progress: 100,
    });
    await logActivity(contest.id, 'status_change', { status: 'done' });
    toast({ title: 'Отмечено готовым', variant: 'success' });
  };

  const startWork = async () => {
    haptic.light();
    await updateStatus.mutateAsync({
      id: contest.id,
      status: 'in_progress',
      progress: progressForStatusChange('in_progress', contest.progress),
    });
    await logActivity(contest.id, 'status_change', { status: 'in_progress' });
    toast({ title: 'В работе', variant: 'success' });
  };

  const bumpProgress = async () => {
    haptic.medium();
    const next = Math.min(100, contest.progress + 10);
    // 100% → Готово; 85–99% → На проверке (если ещё не готово); иначе В работе
    let status = contest.status;
    if (next >= 100) {
      status = 'done';
    } else if (next >= 85 && contest.status !== 'done') {
      status = 'review';
    } else if (contest.status === 'todo') {
      status = 'in_progress';
    }
    await updateContest.mutateAsync({
      id: contest.id,
      progress: next,
      status,
    });
    await logActivity(contest.id, 'progress_change', { progress: next, status });
    toast({
      title:
        status === 'done'
          ? 'Готово (100%)'
          : status === 'review' && contest.status !== 'review'
            ? `На проверке · ${next}%`
            : `Прогресс ${next}%`,
      variant: 'success',
    });
  };

  return (
    <motion.div
      className={cn('h-full', CARD_MIN_H)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.03, 0.3),
        type: 'spring',
        stiffness: 320,
        damping: 26,
      }}
    >
      <Card
        className={cn(
          'glass group h-full overflow-hidden flex flex-row',
          'hover:border-accent-400/50 hover:shadow-lg transition-all duration-300',
          contest.status === 'done' && 'opacity-80',
          contest.status === 'cancelled' && 'opacity-70 grayscale-[0.3]'
        )}
      >
        <div
          className={cn(
            'w-1 shrink-0 self-stretch',
            PRIORITY_BAR[contest.priority] ?? PRIORITY_BAR.medium
          )}
          title={`Приоритет: ${PRIORITY_LABELS[contest.priority] ?? contest.priority}`}
        />

        <CardContent className="p-3 sm:p-3.5 flex flex-col flex-1 min-h-0 gap-0 min-w-0">
          <div className="flex items-start gap-1">
            <Link
              to={`/contest/${contest.id}`}
              className="flex flex-col flex-1 min-h-0 min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-accent-400 rounded-lg"
            >
              <div className="flex justify-between items-center gap-2 shrink-0">
                <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold border',
                      typeStyle.text,
                      typeStyle.bg,
                      typeStyle.border
                    )}
                  >
                    {TASK_TYPE_LABELS[contest.task_type] ?? 'Задача'}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                      priorityStyle.text,
                      priorityStyle.bg
                    )}
                  >
                    <span className={cn('h-1 w-1 rounded-full', priorityStyle.dot)} />
                    {PRIORITY_LABELS[contest.priority] ?? 'Средний'}
                  </span>
                </div>
                <StatusBadge
                  status={contest.status}
                  className="shrink-0 scale-90 origin-right"
                />
              </div>

              <h3
                className={cn(
                  'mt-1.5 text-sm sm:text-[0.95rem] font-semibold leading-snug',
                  'text-[rgb(var(--fg-primary))] group-hover:text-accent-500 transition-colors',
                  'line-clamp-2 min-h-[1.35em]',
                  contest.status === 'done' &&
                    'line-through text-[rgb(var(--fg-muted))] decoration-[rgb(var(--fg-muted))]'
                )}
                title={contest.title}
              >
                {contest.title}
              </h3>

              <div className="mt-auto pt-2 space-y-1.5 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={cn(
                      'flex items-center gap-1 text-xs font-medium truncate',
                      urgencyColor
                    )}
                  >
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{formatDate(contest.due_date)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[rgb(var(--fg-muted))] shrink-0">
                    {subCount > 0 && (
                      <span
                        className="text-[10px] tabular-nums"
                        title={`Подзадачи: ${subDone} из ${subCount}`}
                      >
                        {subDone}/{subCount}
                      </span>
                    )}
                    {contest.recurrence && contest.recurrence !== 'none' && (
                      <span
                        className="flex items-center text-violet-600 dark:text-violet-400"
                        title={RECURRENCE_LABELS[contest.recurrence]}
                      >
                        <Repeat className="h-3 w-3" />
                      </span>
                    )}
                    {hasLinks ? (
                      <span className="flex items-center gap-0.5 text-[10px]">
                        <MessageCircle className="h-3 w-3" />
                        {contest.telegram_message_links.length}
                      </span>
                    ) : null}
                    {contest.priority === 'urgent' && (
                      <Flag className="h-3 w-3 text-red-500" />
                    )}
                    <ChevronRight className="h-3.5 w-3.5 hidden sm:block group-hover:text-accent-500" />
                  </div>
                </div>

                {showStageDue && (
                  <div
                    className={cn(
                      'flex items-center gap-1 text-[10px] font-medium truncate',
                      stageUrgencyColor
                    )}
                    title={
                      stageTitle
                        ? `Ближайший этап: ${stageTitle}`
                        : 'Ближайший дедлайн подзадачи'
                    }
                  >
                    <span className="text-[rgb(var(--fg-muted))] shrink-0">Этап:</span>
                    <span className="truncate">
                      {stageTitle ? `${stageTitle} · ` : ''}
                      {formatDate(stageDue)}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="relative h-1.5 flex-1 rounded-full bg-[rgb(var(--bg-secondary))] overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-[width]',
                        contest.status === 'done'
                          ? 'bg-emerald-500'
                          : contest.status === 'review'
                            ? 'bg-amber-500'
                            : 'bg-gradient-to-r from-accent-500 to-accent-400'
                      )}
                      style={{
                        width: `${Math.min(100, Math.max(0, contest.progress))}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-bold w-8 text-right tabular-nums text-[rgb(var(--fg-secondary))]">
                    {contest.progress}%
                  </span>
                </div>
              </div>
            </Link>

            {showActions ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 -mr-1 text-[rgb(var(--fg-muted))]"
                    disabled={busy}
                    aria-label="Действия"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {contest.status === 'todo' && (
                    <DropdownMenuItem
                      className="gap-2"
                      disabled={busy}
                      onClick={() => void startWork()}
                    >
                      <Play className="h-4 w-4" />В работу
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="gap-2"
                    disabled={busy}
                    onClick={() => void bumpProgress()}
                  >
                    <Percent className="h-4 w-4" />
                    +10% прогресс
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-emerald-600 focus:text-emerald-700"
                    disabled={busy}
                    onClick={() => void markDone()}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Готово
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className="text-[10px] text-[rgb(var(--fg-muted))] shrink-0 pt-1 pr-1">
                {contest.status === 'done' ? '✓' : '✕'}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
