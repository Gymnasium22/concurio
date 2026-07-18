/**
 * useFileUpload — хук для загрузки файлов в Supabase Storage
 *
 * Поддерживает PDF, DOC/DOCX, PPT/PPTX и изображения.
 */
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  QUERY_KEYS,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
  ACCEPTED_FILE_TYPES,
  ACCEPTED_FILE_LABELS,
  MIME_BY_EXTENSION,
} from '@/lib/constants';
import {
  createAttachment,
  removeAttachment as removeAttachmentService,
} from '@/services/attachmentService';
import { assertSafeUpload } from '@/lib/file-safety';
import type { Attachment } from '@/types';

/** Определить MIME-тип файла (браузер иногда отдаёт пустой type) */
function resolveFileMime(file: File): string {
  if (file.type) return file.type;
  const lower = file.name.toLowerCase();
  const ext = Object.keys(MIME_BY_EXTENSION).find((e) => lower.endsWith(e));
  return ext ? MIME_BY_EXTENSION[ext]! : 'application/octet-stream';
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

interface UseFileUploadReturn {
  uploadState: UploadState;
  uploadFiles: (
    contestId: string,
    userId: string,
    files: File[]
  ) => Promise<Attachment[]>;
  removeAttachment: (attachment: Attachment) => Promise<void>;
  validateFiles: (files: File[]) => { valid: File[]; errors: string[] };
}

export function useFileUpload(): UseFileUploadReturn {
  const queryClient = useQueryClient();

  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  /**
   * Валидация файлов перед загрузкой
   */
  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; errors: string[] } => {
      const valid: File[] = [];
      const errors: string[] = [];
      const acceptedTypes = new Set(Object.keys(ACCEPTED_FILE_TYPES));
      const allowedExtensions = new Set(
        Object.values(ACCEPTED_FILE_TYPES).flatMap((exts) => exts)
      );

      for (const file of files) {
        try {
          assertSafeUpload(file);
        } catch (e) {
          errors.push(e instanceof Error ? e.message : `«${file.name}» заблокирован`);
          continue;
        }

        const normalizedName = file.name.toLowerCase();
        const hasAllowedExtension = Array.from(allowedExtensions).some((ext) =>
          normalizedName.endsWith(ext)
        );
        // MIME без расширения — обход (spoof). Требуем реальное расширение allowlist.
        if (!hasAllowedExtension) {
          errors.push(
            `"${file.name}" — неподдерживаемый формат. Допускаются ${ACCEPTED_FILE_LABELS}.`
          );
          continue;
        }
        // Если браузер отдал MIME — он должен быть из allowlist (или пустой)
        if (file.type && !acceptedTypes.has(file.type)) {
          errors.push(
            `"${file.name}" — тип файла (${file.type}) не совпадает с разрешёнными.`
          );
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          errors.push(
            `"${file.name}" — файл слишком большой (макс. ${MAX_FILE_SIZE_MB} МБ).`
          );
          continue;
        }
        valid.push(file);
      }

      return { valid, errors };
    },
    []
  );

  /**
   * Загрузить файлы и создать записи в таблице attachments
   */
  const uploadFiles = useCallback(
    async (contestId: string, userId: string, files: File[]): Promise<Attachment[]> => {
      setUploadState({ isUploading: true, progress: 0, error: null });

      // Повторная валидация — нельзя обойти, вызвав upload напрямую
      const { valid, errors } = validateFiles(files);
      if (errors.length > 0 && valid.length === 0) {
        setUploadState({
          isUploading: false,
          progress: 0,
          error: errors[0] ?? 'Файлы отклонены',
        });
        return [];
      }

      const uploaded: Attachment[] = [];
      const total = valid.length;

      try {
        for (let i = 0; i < valid.length; i++) {
          const file = valid[i]!;
          assertSafeUpload(file);
          const attachment = await createAttachment(
            contestId,
            userId,
            file,
            resolveFileMime(file)
          );
          uploaded.push(attachment);

          setUploadState((s) => ({
            ...s,
            progress: Math.round(((i + 1) / total) * 100),
          }));
        }

        setUploadState({
          isUploading: false,
          progress: 100,
          error: errors.length ? errors.join(' ') : null,
        });

        // Инвалидируем кэш вложений
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.attachments(contestId),
        });

        return uploaded;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Ошибка загрузки';
        setUploadState({ isUploading: false, progress: 0, error: message });
        return uploaded;
      }
    },
    [queryClient, validateFiles]
  );

  /**
   * Мутация удаления вложения
   */
  const deleteMutation = useMutation({
    mutationFn: async (attachment: Attachment) => {
      await removeAttachmentService(attachment);
      return attachment;
    },
    onSuccess: (attachment) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.attachments(attachment.contest_id),
      });
      queryClient.invalidateQueries({ queryKey: ['file-gallery'] });
    },
  });

  const removeAttachment = useCallback(
    async (attachment: Attachment) => {
      await deleteMutation.mutateAsync(attachment);
    },
    [deleteMutation]
  );

  return {
    uploadState,
    uploadFiles,
    removeAttachment,
    validateFiles,
  };
}
