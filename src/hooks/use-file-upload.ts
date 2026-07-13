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
  uploadFiles: (contestId: string, userId: string, files: File[]) => Promise<Attachment[]>;
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
  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];
    const acceptedTypes = new Set(Object.keys(ACCEPTED_FILE_TYPES));
    const allowedExtensions = new Set(
      Object.values(ACCEPTED_FILE_TYPES).flatMap(exts => exts)
    );

    for (const file of files) {
      const normalizedName = file.name.toLowerCase();
      const hasAllowedExtension = Array.from(allowedExtensions).some(ext => normalizedName.endsWith(ext));
      const hasAllowedMimeType = acceptedTypes.has(file.type);
      const isAllowedFile = hasAllowedExtension || hasAllowedMimeType;

      if (!isAllowedFile) {
        errors.push(
          `"${file.name}" — неподдерживаемый формат. Допускаются ${ACCEPTED_FILE_LABELS}.`
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
  }, []);

  /**
   * Загрузить файлы и создать записи в таблице attachments
   */
  const uploadFiles = useCallback(async (
    contestId: string,
    userId: string,
    files: File[]
  ): Promise<Attachment[]> => {
    setUploadState({ isUploading: true, progress: 0, error: null });

    const uploaded: Attachment[] = [];
    const total = files.length;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
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

      setUploadState({ isUploading: false, progress: 100, error: null });

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
  }, [queryClient]);

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

  const removeAttachment = useCallback(async (attachment: Attachment) => {
    await deleteMutation.mutateAsync(attachment);
  }, [deleteMutation]);

  return {
    uploadState,
    uploadFiles,
    removeAttachment,
    validateFiles,
  };
}
