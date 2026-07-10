/**
 * ContestCard — карточка + быстрые действия
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.05, 0.5),
        type: 'spring',
        stiffness: 300,
        damping: 24,
      }}
    >
      <Card className="glass group hover:border-accent-400/50 hover:shadow-lg transition-all duration-300 overflow-hidden">
        {contest.color && (
          <div className="h-1 w-full" style={{ background: contest.color }} />
        )}
        <CardContent className="p-4 sm:p-5 flex flex-col gap-3">
          <Link to={`/contest/${contest.id}`} className="block">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border',
                      typeStyle.text,
                      typeStyle.bg,
                      typeStyle.border
                    )}
                  >
                    {TASK_TYPE_LABELS[contest.task_type] ?? 'Задача'}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium',
                      priorityStyle.text,
                      priorityStyle.bg
                    )}
                  >
                    <span
                      className={cn('h-1.5 w-1.5 rounded-full', priorityStyle.dot)}
                    />
                    {PRIORITY_LABELS[contest.priority] ?? 'Средний'}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-[rgb(var(--fg-primary))] group-hover:text-accent-500 transition-colors truncate">
                  {contest.title}
                </h3>
                {contest.description && (
                  <p className="text-sm text-[rgb(var(--fg-secondary))] line-clamp-1">
                    {contest.description}
                  </p>
                )}
              </div>
              <StatusBadge status={contest.status} className="shrink-0" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4 mt-3">
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={cn(
                    'flex items-center gap-1.5 text-sm font-medium',
                    urgencyColor
                  )}
                >
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(contest.due_date)}</span>
                </div>
                {hasLinks && (
                  <div className="flex items-center gap-1 text-xs text-[rgb(var(--fg-muted))]">
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>{contest.telegram_message_links.length}</span>
                  </div>
                )}
                {contest.priority === 'urgent' && (
                  <Flag className="h-3.5 w-3.5 text-red-500" />
                )}
              </div>
              <div className="flex items-center gap-3 w-full sm:w-1/3 min-w-[120px]">
                <Progress value={contest.progress} className="h-2 flex-1" />
                <span className="text-xs font-bold w-9 text-right text-[rgb(var(--fg-secondary))]">
                  {contest.progress}%
                </span>
                <ChevronRight className="h-5 w-5 text-[rgb(var(--fg-muted))] group-hover:text-accent-500 hidden sm:block" />
              </div>
            </div>
          </Link>

          {/* Быстрые действия */}
          {contest.status !== 'done' && contest.status !== 'cancelled' && (
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[rgb(var(--border-default))]">
              {contest.status === 'todo' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={startWork}
                  disabled={updateStatus.isPending}
                >
                  <Play className="h-3.5 w-3.5" />В работу
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={bumpProgress}
                disabled={updateContest.isPending}
              >
                +10%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                onClick={markDone}
                disabled={updateStatus.isPending}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Готово
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
