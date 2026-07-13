/**
 * ContestDetail — полная информация о задаче / конкурсе
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUpdateContestStatus } from '@/hooks/use-contests';
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
import { Calendar, Clock, CheckCircle2, Tag, Repeat } from 'lucide-react';
import { formatDate, getTimeLeft, cn } from '@/lib/utils';
import {
  STATUS_ORDER,
  STATUS_LABELS,
  STATUS_DEFAULT_PROGRESS,
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  RECURRENCE_LABELS,
} from '@/lib/constants';
import type { Contest, ContestStatus, Attachment } from '@/types';

interface ContestDetailProps {
  contest: Contest;
}

export function ContestDetail({ contest }: ContestDetailProps) {
  const updateStatusMutation = useUpdateContestStatus();
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);

  const handleStatusChange = async (newStatus: ContestStatus) => {
    if (contest.status === newStatus) return;
    await updateStatusMutation.mutateAsync({
      id: contest.id,
      status: newStatus,
      progress: STATUS_DEFAULT_PROGRESS[newStatus],
    });
    await logActivity(contest.id, 'status_change', {
      status: newStatus,
      from: contest.status,
    });
  };

  return (
    <div className="space-y-6">
      {/* Шапка: Статус и Дедлайн */}
      <div className="glass p-5 sm:p-6 rounded-2xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={contest.status} className="px-3 py-1 text-sm" />
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
          </div>

          {contest.due_date && (
            <div className="flex items-center gap-4 text-sm font-medium text-[rgb(var(--fg-secondary))]">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(contest.due_date)}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[rgb(var(--bg-secondary))] px-2.5 py-1 rounded-lg">
                <Clock className="h-4 w-4" />
                <span>{getTimeLeft(contest.due_date)}</span>
              </div>
            </div>
          )}
        </div>

        {contest.tags?.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
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

        {/* Степпер статусов */}
        <div className="mt-2 relative">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-[rgb(var(--border-default))] -translate-y-1/2 rounded-full hidden sm:block" />
          
          <div className="relative flex flex-col sm:flex-row justify-between gap-2 sm:gap-0">
            {STATUS_ORDER.map((status, index) => {
              const isActive = contest.status === status;
              const isPast = STATUS_ORDER.indexOf(contest.status) > index;
              const isCancelled = contest.status === 'cancelled';
              
              return (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={updateStatusMutation.isPending || isCancelled}
                  className={cn(
                    "flex sm:flex-col items-center gap-3 sm:gap-2 group transition-all text-left sm:text-center",
                    isCancelled ? "opacity-50 grayscale cursor-not-allowed" : "cursor-pointer"
                  )}
                >
                  <div className={cn(
                    "relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all bg-[rgb(var(--bg-card))]",
                    isActive ? "border-accent-500 text-accent-500 scale-110 shadow-lg shadow-accent-500/20" : 
                    isPast ? "border-emerald-500 text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30" : 
                    "border-[rgb(var(--border-strong))] text-[rgb(var(--fg-muted))] group-hover:border-accent-300"
                  )}>
                    {isPast ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-bold">{index + 1}</span>}
                  </div>
                  <span className={cn(
                    "text-xs font-medium transition-colors",
                    isActive ? "text-accent-500 font-bold" : 
                    isPast ? "text-emerald-600 dark:text-emerald-400" : 
                    "text-[rgb(var(--fg-secondary))]"
                  )}>
                    {STATUS_LABELS[status]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Отменён (если применимо) */}
        {contest.status === 'cancelled' && (
          <div className="mt-2 p-3 rounded-lg bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-800/50 text-sm font-medium text-center">
            Задача отменена. Можно вернуть её в работу, выбрав другой статус.
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={() => handleStatusChange('todo')} className="bg-white dark:bg-black">
                Вернуть в работу
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Описание */}
      {contest.description && (
        <div className="glass-subtle p-5 sm:p-6 rounded-2xl">
          <h3 className="text-sm font-medium text-[rgb(var(--fg-secondary))] mb-2">Описание</h3>
          <p className="text-[rgb(var(--fg-primary))] whitespace-pre-wrap text-sm leading-relaxed">
            {contest.description}
          </p>
        </div>
      )}

      {/* Прогресс */}
      <div className="glass p-5 sm:p-6 rounded-2xl">
        <div className="flex justify-between items-end mb-3">
          <h3 className="text-sm font-medium text-[rgb(var(--fg-secondary))]">Прогресс выполнения</h3>
          <span className="text-2xl font-bold text-accent-500">{contest.progress}%</span>
        </div>
        <Progress value={contest.progress} className="h-3" />
        <p className="text-xs text-[rgb(var(--fg-muted))] mt-3">
          Считается из чек-листа; без пунктов — от статуса или кнопки «+10%» на
          карточке.
        </p>
      </div>

      {/* Чек-лист */}
      <ChecklistPanel contestId={contest.id} />

      {/* Подзадачи (только у корневых) */}
      {!contest.parent_id && <SubtasksPanel parentId={contest.id} />}

      {contest.parent_id && (
        <div className="text-sm text-[rgb(var(--fg-muted))]">
          Это подзадача.{' '}
          <Link
            to={`/contest/${contest.parent_id}`}
            className="text-accent-500 font-medium hover:underline"
          >
            К родительской задаче
          </Link>
        </div>
      )}

      {/* Ссылки */}
      {contest.telegram_message_links && contest.telegram_message_links.length > 0 && (
        <TelegramLinks links={contest.telegram_message_links} />
      )}

      {/* Файлы */}
      <div className="glass p-5 sm:p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-medium text-[rgb(var(--fg-secondary))]">Вложения</h3>
        <FileUpload contestId={contest.id} />
        <div className="pt-2">
          <FileList contestId={contest.id} onPreviewClick={setPreviewFile} />
        </div>
      </div>

      {/* Комментарии и timeline */}
      <CommentsTimeline contestId={contest.id} />

      {/* Превью: почти на весь экран, фото целиком */}
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
