/**
 * FileUpload — компонент для Drag & Drop загрузки файлов
 * (PDF, Word, PowerPoint, изображения)
 */
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import {
  ACCEPTED_FILE_TYPES,
  ACCEPTED_FILE_LABELS,
  MAX_FILE_SIZE_MB,
} from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

interface FileUploadProps {
  contestId: string;
  onUploadSuccess?: () => void;
}

export function FileUpload({ contestId, onUploadSuccess }: FileUploadProps) {
  const { user } = useAuth();
  const { uploadFiles, uploadState, validateFiles } = useFileUpload();
  const { toast } = useToast();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!user) return;

      const { valid, errors } = validateFiles(acceptedFiles);

      // Показываем ошибки валидации
      errors.forEach(err => {
        toast({ title: 'Ошибка файла', description: err, variant: 'error' });
      });

      if (valid.length === 0) return;

      // Загружаем валидные файлы
      const uploaded = await uploadFiles(contestId, user.id, valid);

      if (uploaded.length > 0) {
        toast({
          title: 'Загружено',
          description: `Успешно загружено файлов: ${uploaded.length}`,
          variant: 'success',
        });
        onUploadSuccess?.();
      }

      if (uploadState.error) {
        toast({
          title: 'Ошибка загрузки',
          description: uploadState.error,
          variant: 'error',
        });
      }
    },
    [user, contestId, validateFiles, uploadFiles, toast, onUploadSuccess, uploadState.error]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    disabled: uploadState.isUploading,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer',
          isDragActive
            ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
            : 'border-[rgb(var(--border-strong))] hover:border-accent-400 hover:bg-[rgb(var(--bg-secondary))]/50',
          uploadState.isUploading && 'pointer-events-none opacity-60'
        )}
      >
        <input {...getInputProps()} />
        <div className="p-3 rounded-full bg-[rgb(var(--bg-secondary))] mb-3">
          <UploadCloud className={cn('h-6 w-6', isDragActive ? 'text-accent-500' : 'text-[rgb(var(--fg-muted))]')} />
        </div>
        <p className="text-sm font-medium text-center">
          {isDragActive ? 'Отпустите файлы здесь...' : 'Нажмите или перетащите файлы'}
        </p>
        <p className="text-xs text-[rgb(var(--fg-muted))] text-center mt-1">
          {ACCEPTED_FILE_LABELS} (до {MAX_FILE_SIZE_MB} МБ)
        </p>
      </div>

      {uploadState.isUploading && (
        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between text-xs font-medium">
            <span>Загрузка...</span>
            <span>{uploadState.progress}%</span>
          </div>
          <Progress value={uploadState.progress} className="h-1.5" />
        </div>
      )}
    </div>
  );
}
