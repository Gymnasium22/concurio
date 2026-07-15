/**
 * ContestDetail — рабочий экран задачи: статус, прогресс, этапы, работа
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useSubtasks,
  useUpdateContest,
  useUpdateContestStatus,
} from '@/hooks/use-contests';
import { logActivity } from '@/hooks/use-task-extras';
import { StatusBadge } from '@/components/contest/status-badge';
import { TelegramLinks } from '@/components/contest/telegram-links';
import { FileList } from '@/components/contest/file-list';
import { FileUpload } from '@/components/contest/file-upload';
import { FilePreview } from '@/components/contest/pdf-preview';
import { ChecklistPanel } from '@/components/task/checklist-panel';
import { SubtasksPanel } from '@/components/task/subtasks-panel';
import { CommentsTimeline } from '@/components/task/comments-timeline';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Tag,
  Repeat,
  Play,
  Eye,
  Flag,
  GitBranch,
  ArrowUpRight,
} from 'lucide-react';
import {
  formatDate,
  getTimeLeft,
  getDeadlineUrgency,
  getUrgencyColor,
  cn,
} from '@/lib/utils';
import {
  STATUS_ORDER,
  STATUS_LABELS,
  STATUS_HINTS,
  progressForStatusChange,
  statusFromProgress,
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  RECURRENCE_LABELS,
} from '@/lib/constants';
import type { Contest, ContestStatus, Attachment } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { haptic } from '@/lib/telegram';

interface ContestDetailProps {
  contest: Contest;
}

export function ContestDetail({ contest }: ContestDetailProps) {
  const updateStatusMutation = useUpdateContestStatus();
  const updateContest = useUpdateContest();
  const { toast } = useToast();
  const { data: subtasks } = useSubtasks(contest.parent_id ? undefined : contest.id);
  const hasSubtasks = (subtasks?.length ?? 0) > 0;
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);
  const [sliderValue, setSliderValue] = useState(contest.progress);

  useEffect(() => {
    setSliderValue(contest.progress);
  }, [contest.progress, contest.id]);

  const busy = updateStatusMutation.isPending || updateContest.isPending;
  const isCancelled = contest.status === 'cancelled';
  const isDone = contest.status === 'done';

  const stageDue = contest.next_stage_due_date ?? null;
  const stageTitle = contest.next_stage_title ?? null;
  const dueUrgency = getDeadlineUrgency(contest.due_date);
  const stageUrgency = getDeadlineUrgency(stageDue);

  const handleStatusChange = async (newStatus: ContestStatus) => {
    if (contest.status === newStatus) return;
    try {
      haptic.light();
      await updateStatusMutation.mutateAsync({
        id: contest.id,
        status: newStatus,
        progress: progressForStatusChange(newStatus, contest.progress),
      });
      await logActivity(contest.id, 'status_change', {
        status: newStatus,
        from: contest.status,
      });
      toast({
        title: STATUS_LABELS[newStatus],
        description: STATUS_HINTS[newStatus],
        variant: newStatus === 'done' ? 'success' : 'default',
      });
    } catch {
      toast({ title: 'Не удалось сменить статус', variant: 'error' });
    }
  };

  const commitProgress = async (raw: number) => {
    const progress = Math.max(0, Math.min(100, Math.round(raw)));
    if (isCancelled) return;

    const status = statusFromProgress(progress, contest.status);
    if (progress === contest.progress && status === contest.status) return;

    try {
      await updateContest.mutateAsync({
        id: contest.id,
        progress,
        status,
        completed_at: status === 'done' ? new Date().toISOString() : null,
      });
      await logActivity(contest.id, 'progress_change', {
        progress,
        status,
        source: 'slider',
      });
      if (status !== contest.status) {
        toast({
          title:
            status === 'done'
              ? 'Готово (100%)'
              : status === 'review'
                ? `На проверке · ${progress}%`
                : `Прогресс ${progress}%`,
          variant: 'success',
        });
      }
    } catch {
      toast({ title: 'Не удалось обновить прогресс', variant: 'error' });
      setSliderValue(contest.progress);
    }
  };

  const currentIdx =
    contest.status === 'cancelled' ? -1 : STATUS_ORDER.indexOf(contest.status);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ——— Герой: статус + дедлайны + прогресс ——— */}
      <section className="rounded-2xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-card))] shadow-sm overflow-hidden">
        {/* Мета-бейджи */}
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 flex flex-wrap items-center gap-2">
          <StatusBadge status={contest.status} className="px-2.5 py-1 text-xs" />
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border',
              TASK_TYPE_COLORS[contest.task_type]?.text,
              TASK_TYPE_COLORS[contest.task_type]?.bg,
              TASK_TYPE_COLORS[contest.task_type]?.border
            )}
          >
            {TASK_TYPE_LABELS[contest.task_type] ?? 'Задача'}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              PRIORITY_COLORS[contest.priority]?.text,
              PRIORITY_COLORS[contest.priority]?.bg
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                PRIORITY_COLORS[contest.priority]?.dot
              )}
            />
            {PRIORITY_LABELS[contest.priority] ?? 'Средний'}
          </span>
          {contest.recurrence && contest.recurrence !== 'none' && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800">
              <Repeat className="h-3 w-3" />
              {RECURRENCE_LABELS[contest.recurrence] ?? contest.recurrence}
            </span>
          )}
          {contest.parent_id && (
            <Link
              to={`/contest/${contest.parent_id}`}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-[rgb(var(--border-default))] text-accent-600 dark:text-accent-400 hover:bg-[rgb(var(--bg-secondary))]"
            >
              <GitBranch className="h-3 w-3" />
              К родителю
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {/* Дедлайны */}
        <div className="px-4 sm:px-5 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {contest.due_date ? (
            <div
              className={cn(
                'rounded-xl border px-3 py-2.5 flex items-center gap-3',
                'border-[rgb(var(--border-default))] bg-[rgb(var(--bg-secondary))]/60'
              )}
            >
              <div className="h-9 w-9 rounded-lg bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-default))] flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-[rgb(var(--fg-muted))]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-[rgb(var(--fg-muted))]">
                  Дедлайн задачи
                </p>
                <p className="text-sm font-semibold truncate">
                  {formatDate(contest.due_date)}
                </p>
                <p className={cn('text-[11px]', getUrgencyColor(dueUrgency))}>
                  {getTimeLeft(contest.due_date)}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[rgb(var(--border-default))] px-3 py-2.5 text-xs text-[rgb(var(--fg-muted))] flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" />
              Дедлайн задачи не задан
            </div>
          )}

          {stageDue ? (
            <div
              className={cn(
                'rounded-xl border px-3 py-2.5 flex items-center gap-3',
                'border-amber-200/70 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20'
              )}
            >
              <div className="h-9 w-9 rounded-lg bg-[rgb(var(--bg-card))] border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center shrink-0">
                <Flag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-800/80 dark:text-amber-200/80">
                  Ближайший этап
                </p>
                <p className="text-sm font-semibold truncate">
                  {stageTitle ?? 'Этап'} · {formatDate(stageDue)}
                </p>
                <p className={cn('text-[11px]', getUrgencyColor(stageUrgency))}>
                  {getTimeLeft(stageDue)}
                </p>
              </div>
            </div>
          ) : hasSubtasks ? (
            <div className="rounded-xl border border-dashed border-[rgb(var(--border-default))] px-3 py-2.5 text-xs text-[rgb(var(--fg-muted))] flex items-center gap-2">
              <Flag className="h-4 w-4 shrink-0" />У этапов нет ближайшей даты
            </div>
          ) : null}
        </div>

        {contest.tags?.length > 0 && (
          <div className="px-4 sm:px-5 pt-3 flex flex-wrap items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-[rgb(var(--fg-muted))]" />
            {contest.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-md bg-[rgb(var(--bg-secondary))] text-[rgb(var(--fg-secondary))]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Быстрые действия */}
        {!isCancelled && !isDone && (
          <div className="px-4 sm:px-5 pt-3 flex flex-wrap gap-2">
            {contest.status === 'todo' && (
              <Button
                size="sm"
                className="gap-1.5 min-h-[36px]"
                disabled={busy}
                onClick={() => void handleStatusChange('in_progress')}
              >
                <Play className="h-3.5 w-3.5" />В работу
              </Button>
            )}
            {(contest.status === 'todo' || contest.status === 'in_progress') && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 min-h-[36px]"
                disabled={busy}
                onClick={() => void handleStatusChange('review')}
              >
                <Eye className="h-3.5 w-3.5" />
                На проверку
              </Button>
            )}
            <Button
              size="sm"
              variant={contest.status === 'review' ? 'default' : 'outline'}
              className={cn(
                'gap-1.5 min-h-[36px]',
                contest.status === 'review' &&
                  'bg-emerald-600 hover:bg-emerald-700 text-white'
              )}
              disabled={busy}
              onClick={() => void handleStatusChange('done')}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Готово
            </Button>
          </div>
        )}

        {/* Степпер */}
        <div className="px-4 sm:px-5 pt-4 pb-2">
          <div className="relative">
            <div className="absolute top-4 left-[10%] right-[10%] h-0.5 bg-[rgb(var(--border-default))] rounded-full hidden sm:block" />
            <div className="relative flex flex-col sm:flex-row justify-between gap-1.5 sm:gap-0">
              {STATUS_ORDER.map((status, index) => {
                const isActive = contest.status === status;
                const isPast = currentIdx > index;
                const isFullyDone = contest.status === 'done' && status === 'done';

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => void handleStatusChange(status)}
                    disabled={busy || isCancelled}
                    title={STATUS_HINTS[status]}
                    className={cn(
                      'flex sm:flex-col items-center gap-2.5 sm:gap-1.5 group transition-all text-left sm:text-center sm:max-w-[5.5rem] min-h-[40px] sm:min-h-0',
                      isCancelled
                        ? 'opacity-50 grayscale cursor-not-allowed'
                        : 'cursor-pointer'
                    )}
                  >
                    <div
                      className={cn(
                        'relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all bg-[rgb(var(--bg-card))]',
                        isFullyDone || (isActive && status === 'done')
                          ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 scale-105'
                          : isActive && status === 'review'
                            ? 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-900/30 scale-105'
                            : isActive
                              ? 'border-accent-500 text-accent-500 scale-105 shadow-md shadow-accent-500/15'
                              : isPast
                                ? 'border-accent-400/70 text-accent-500 bg-accent-50/80 dark:bg-accent-900/20'
                                : 'border-[rgb(var(--border-strong))] text-[rgb(var(--fg-muted))] group-hover:border-accent-300'
                      )}
                    >
                      {isFullyDone || (isPast && status === 'done') ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-bold">{index + 1}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium',
                        isActive && status === 'done'
                          ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                          : isActive && status === 'review'
                            ? 'text-amber-600 dark:text-amber-400 font-bold'
                            : isActive
                              ? 'text-accent-500 font-bold'
                              : 'text-[rgb(var(--fg-secondary))]'
                      )}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-[11px] text-[rgb(var(--fg-muted))] leading-relaxed mt-3">
            {isCancelled ? STATUS_HINTS.cancelled : STATUS_HINTS[contest.status]}
            {contest.status === 'review' && (
              <span className="block mt-0.5 text-amber-600 dark:text-amber-400 font-medium">
                «На проверке» ≠ «Готово». Закройте задачу кнопкой «Готово».
              </span>
            )}
          </p>
        </div>

        {isCancelled && (
          <div className="mx-4 sm:mx-5 mb-4 p-3 rounded-xl bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-800/50 text-sm font-medium text-center">
            Задача отменена.
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void handleStatusChange('todo')}
                className="bg-white dark:bg-black"
              >
                Вернуть в работу
              </Button>
            </div>
          </div>
        )}

        {/* Прогресс в той же карточке */}
        <div className="border-t border-[rgb(var(--border-default))] px-4 sm:px-5 py-4">
          <div className="flex justify-between items-end mb-2">
            <h3 className="text-sm font-semibold text-[rgb(var(--fg-secondary))]">
              Прогресс
            </h3>
            <span className="text-xl font-bold text-accent-500 tabular-nums">
              {sliderValue}%
            </span>
          </div>
          <Progress value={sliderValue} className="h-2.5" />
          <div className="mt-3 space-y-1.5">
            <label className="sr-only" htmlFor={`progress-slider-${contest.id}`}>
              Слайдер прогресса
            </label>
            <input
              id={`progress-slider-${contest.id}`}
              type="range"
              min={0}
              max={100}
              step={1}
              value={sliderValue}
              disabled={busy || isCancelled || hasSubtasks}
              onChange={(e) => setSliderValue(Number(e.target.value))}
              onPointerUp={(e) =>
                void commitProgress(Number((e.target as HTMLInputElement).value))
              }
              onTouchEnd={(e) =>
                void commitProgress(Number((e.target as HTMLInputElement).value))
              }
              onKeyUp={(e) => {
                if (
                  e.key === 'ArrowLeft' ||
                  e.key === 'ArrowRight' ||
                  e.key === 'Home' ||
                  e.key === 'End'
                ) {
                  void commitProgress(Number((e.target as HTMLInputElement).value));
                }
              }}
              onBlur={(e) =>
                void commitProgress(Number((e.target as HTMLInputElement).value))
              }
              className={cn(
                'w-full h-2 rounded-full appearance-none cursor-pointer accent-accent-500',
                'bg-[rgb(var(--bg-secondary))]',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            />
            <div className="flex justify-between text-[10px] text-[rgb(var(--fg-muted))] tabular-nums">
              <span>0%</span>
              <span>~85% проверка</span>
              <span>100% готово</span>
            </div>
          </div>
          <p className="text-[11px] text-[rgb(var(--fg-muted))] mt-2 leading-snug">
            {hasSubtasks
              ? 'Прогресс родителя = среднее по подзадачам. Меняйте статусы этапов.'
              : 'Слайдер и чек-лист меняют % и статус (85% → проверка, 100% → готово).'}
          </p>
        </div>
      </section>

      {/* ——— Контент: работа слева, вложения справа на desktop ——— */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-5 lg:items-start">
        <div className="lg:col-span-7 space-y-4 min-w-0">
          {contest.description && (
            <section className="rounded-2xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-card))] px-4 sm:px-5 py-4">
              <h3 className="text-sm font-semibold text-[rgb(var(--fg-secondary))] mb-2">
                Описание
              </h3>
              <p className="text-[rgb(var(--fg-primary))] whitespace-pre-wrap text-sm leading-relaxed">
                {contest.description}
              </p>
            </section>
          )}

          <ChecklistPanel contestId={contest.id} />

          {!contest.parent_id && <SubtasksPanel parentId={contest.id} />}

          <CommentsTimeline contestId={contest.id} />
        </div>

        <aside className="mt-4 lg:mt-0 lg:col-span-5 space-y-4 lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto lg:overscroll-contain lg:pb-4">
          {contest.telegram_message_links &&
            contest.telegram_message_links.length > 0 && (
              <TelegramLinks links={contest.telegram_message_links} />
            )}

          <section className="rounded-2xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-card))] px-4 sm:px-5 py-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[rgb(var(--fg-secondary))]">
                Вложения
              </h3>
              <Clock className="h-3.5 w-3.5 text-[rgb(var(--fg-muted))]" />
            </div>
            <FileUpload contestId={contest.id} />
            <FileList contestId={contest.id} onPreviewClick={setPreviewFile} />
          </section>
        </aside>
      </div>

      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent
          className={cn(
            'p-0 gap-0 overflow-hidden border-none bg-black',
            'w-[100vw] max-w-[100vw] sm:max-w-[min(96vw,1100px)]',
            'h-[min(96dvh,var(--tg-viewport-stable-height,96dvh))] max-h-[min(96dvh,var(--tg-viewport-stable-height,96dvh))]',
            'sm:h-[min(92vh,900px)] sm:max-h-[92vh]',
            'left-0 right-0 bottom-0 top-auto sm:top-[50%] sm:bottom-auto sm:left-[50%] sm:right-auto',
            'translate-x-0 translate-y-0 sm:-translate-x-1/2 sm:-translate-y-1/2',
            'rounded-none sm:rounded-2xl',
            'flex flex-col'
          )}
        >
          <DialogHeader className="shrink-0 px-4 py-3 pr-12 bg-black/90 border-b border-white/10 m-0">
            <DialogTitle className="truncate text-sm text-white font-medium">
              {previewFile?.file_name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {previewFile && (
              <FilePreview
                filePath={previewFile.file_path}
                fileName={previewFile.file_name}
                fileType={previewFile.file_type}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
