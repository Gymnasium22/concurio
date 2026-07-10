/**
 * ContestCard — единый размер карточек + быстрые действия
 */
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/contest/status-badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  ChevronRight,
  MessageCircle,
  Flag,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { formatDate, getDeadlineUrgency, getUrgencyColor, cn } from '@/lib/utils';
import {
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_BAR,
  STATUS_DEFAULT_PROGRESS,
} from '@/lib/constants';
import type { Contest } from '@/types';
import { motion } from 'framer-motion';
import { useUpdateContest, useUpdateContestStatus } from '@/hooks/use-contests';
import { logActivity } from '@/hooks/use-task-extras';
import { haptic } from '@/lib/telegram';
import { useToast } from '@/components/ui/use-toast';

interface ContestCardProps {
  contest: Contest;
  index: number;
}

/** Единая компактная высота карточек */
const CARD_MIN_H = 'min-h-[156px] sm:min-h-[164px] h-full';

export function ContestCard({ contest, index }: ContestCardProps) {
  const urgency = getDeadlineUrgency(contest.due_date);
  const urgencyColor = getUrgencyColor(urgency);
  const hasLinks =
    contest.telegram_message_links && contest.telegram_message_links.length > 0;
  const typeStyle = TASK_TYPE_COLORS[contest.task_type] ?? TASK_TYPE_COLORS.task;
  const priorityStyle =
    PRIORITY_COLORS[contest.priority] ?? PRIORITY_COLORS.medium;

  const updateStatus = useUpdateContestStatus();
  const updateContest = useUpdateContest();
  const { toast } = useToast();

  const showActions =
    contest.status !== 'done' && contest.status !== 'cancelled';

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const markDone = async (e: React.MouseEvent) => {
    stop(e);
    haptic.success();
    await updateStatus.mutateAsync({
      id: contest.id,
      status: 'done',
      progress: 100,
    });
    await logActivity(contest.id, 'status_change', { status: 'done' });
    toast({ title: 'Отмечено готовым', variant: 'success' });
  };

  const startWork = async (e: React.MouseEvent) => {
    stop(e);
    haptic.light();
    await updateStatus.mutateAsync({
      id: contest.id,
      status: 'in_progress',
      progress: Math.max(contest.progress, STATUS_DEFAULT_PROGRESS.in_progress),
    });
    await logActivity(contest.id, 'status_change', { status: 'in_progress' });
    toast({ title: 'В работе', variant: 'success' });
  };

  const bumpProgress = async (e: React.MouseEvent) => {
    stop(e);
    haptic.medium();
    const next = Math.min(100, contest.progress + 10);
    const status =
      next >= 100
        ? 'done'
        : contest.status === 'todo'
          ? 'in_progress'
          : contest.status;
    await updateContest.mutateAsync({
      id: contest.id,
      progress: next,
      status,
    });
    await logActivity(contest.id, 'progress_change', { progress: next });
    toast({ title: `Прогресс ${next}%`, variant: 'success' });
  };

  return (
    <motion.div
      className={cn('h-full', CARD_MIN_H)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.04, 0.4),
        type: 'spring',
        stiffness: 320,
        damping: 26,
      }}
    >
      <Card
        className={cn(
          'glass group h-full overflow-hidden flex flex-row',
          'hover:border-accent-400/50 hover:shadow-lg transition-all duration-300'
        )}
      >
        {/* Цвет приоритета слева */}
        <div
          className={cn(
            'w-1 shrink-0 self-stretch',
            PRIORITY_BAR[contest.priority] ?? PRIORITY_BAR.medium
          )}
          title={`Приоритет: ${PRIORITY_LABELS[contest.priority] ?? contest.priority}`}
          aria-label={`Приоритет: ${PRIORITY_LABELS[contest.priority] ?? contest.priority}`}
        />

        <CardContent className="p-3 sm:p-3.5 flex flex-col flex-1 min-h-0 gap-0 min-w-0">
          <Link
            to={`/contest/${contest.id}`}
            className="flex flex-col flex-1 min-h-0 outline-none focus-visible:ring-2 focus-visible:ring-accent-400 rounded-lg"
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
                  <span
                    className={cn('h-1 w-1 rounded-full', priorityStyle.dot)}
                  />
                  {PRIORITY_LABELS[contest.priority] ?? 'Средний'}
                </span>
              </div>
              <StatusBadge status={contest.status} className="shrink-0 scale-90 origin-right" />
            </div>

            <h3
              className={cn(
                'mt-1.5 text-sm sm:text-[0.95rem] font-semibold leading-snug',
                'text-[rgb(var(--fg-primary))] group-hover:text-accent-500 transition-colors',
                'line-clamp-1 min-h-[1.35em]'
              )}
              title={contest.title}
            >
              {contest.title}
            </h3>

            <p
              className={cn(
                'mt-0.5 text-xs leading-snug line-clamp-1 min-h-[1.25em]',
                contest.description
                  ? 'text-[rgb(var(--fg-secondary))]'
                  : 'text-[rgb(var(--fg-muted))]/50'
              )}
            >
              {contest.description?.trim() || 'Без описания'}
            </p>

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
                  {hasLinks ? (
                    <span className="flex items-center gap-0.5 text-[10px]">
                      <MessageCircle className="h-3 w-3" />
                      {contest.telegram_message_links.length}
                    </span>
                  ) : null}
                  {contest.priority === 'urgent' && (
                    <Flag className="h-3 w-3 text-red-500" />
                  )}
                  <ChevronRight className="h-3.5 w-3.5 text-[rgb(var(--fg-muted))] group-hover:text-accent-500 hidden sm:block" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Progress value={contest.progress} className="h-1.5 flex-1" />
                <span className="text-[10px] font-bold w-8 text-right tabular-nums text-[rgb(var(--fg-secondary))]">
                  {contest.progress}%
                </span>
              </div>
            </div>
          </Link>

          <div className="mt-2 pt-2 border-t border-[rgb(var(--border-default))] min-h-[1.75rem] flex items-center shrink-0">
            {showActions ? (
              <div className="flex flex-wrap gap-1 w-full">
                {contest.status === 'todo' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-0.5 px-2 flex-1 sm:flex-none"
                    onClick={startWork}
                    disabled={updateStatus.isPending}
                  >
                    <Play className="h-3 w-3" />В работу
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-0.5 px-2 flex-1 sm:flex-none"
                  onClick={bumpProgress}
                  disabled={updateContest.isPending}
                >
                  +10%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-0.5 px-2 flex-1 sm:flex-none text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                  onClick={markDone}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Готово
                </Button>
              </div>
            ) : (
              <p className="text-[11px] text-[rgb(var(--fg-muted))] w-full text-center sm:text-left">
                {contest.status === 'done' ? 'Выполнено' : 'Отменено'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
