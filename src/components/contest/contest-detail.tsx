/**
 * ContestDetail — полная информация о конкурсе
 */
import { useState } from 'react';
import { useUpdateContestStatus } from '@/hooks/use-contests';
import { StatusBadge } from '@/components/contest/status-badge';
import { TelegramLinks } from '@/components/contest/telegram-links';
import { FileList } from '@/components/contest/file-list';
import { FileUpload } from '@/components/contest/file-upload';
import { PdfPreview } from '@/components/contest/pdf-preview';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { formatDate, getTimeLeft, cn } from '@/lib/utils';
import { STATUS_ORDER, STATUS_LABELS, STATUS_DEFAULT_PROGRESS } from '@/lib/constants';
import type { Contest, ContestStatus, Attachment } from '@/types';

interface ContestDetailProps {
  contest: Contest;
}

export function ContestDetail({ contest }: ContestDetailProps) {
  const updateStatusMutation = useUpdateContestStatus();
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);

  // Обработчик изменения статуса (степпер)
  const handleStatusChange = async (newStatus: ContestStatus) => {
    if (contest.status === newStatus) return;
    
    // Обновляем статус и выставляем дефолтный прогресс для этого статуса
    await updateStatusMutation.mutateAsync({
      id: contest.id,
      status: newStatus,
      progress: STATUS_DEFAULT_PROGRESS[newStatus],
    });
  };

  return (
    <div className="space-y-6">
      {/* Шапка: Статус и Дедлайн */}
      <div className="glass p-5 sm:p-6 rounded-2xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <StatusBadge status={contest.status} className="px-3 py-1 text-sm" />
          
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
            Конкурс отменён. Вы можете вернуть его в работу, выбрав другой статус.
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
          * Прогресс обновляется автоматически при смене статуса, либо его можно изменить вручную при редактировании.
        </p>
      </div>

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

      {/* Модалка превью PDF */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-[rgb(var(--bg-secondary))] border-none">
          <DialogHeader className="p-4 bg-[rgb(var(--bg-card))] border-b absolute top-0 left-0 right-0 z-10 m-0">
            <DialogTitle className="truncate pr-8 text-base">
              {previewFile?.file_name}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-[60px] h-[80vh]">
            {previewFile && <PdfPreview filePath={previewFile.file_path} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
