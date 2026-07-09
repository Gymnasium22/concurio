/**
 * useFileUpload — хук для загрузки файлов в Supabase Storage
 *
 * Поддерживает .pdf и .docx, показывает прогресс загрузки.
 */
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, uploadFile, deleteFile } from '@/lib/supabase';
import { QUERY_KEYS, MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from '@/lib/constants';
import type { Attachment, AttachmentInsert } from '@/types';

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
        errors.push(`"${file.name}" — неподдерживаемый формат. Допускаются PDF, DOC, DOCX, JPG, PNG.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" — файл слишком большой (макс. 10 МБ).`);
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

        // Загружаем в Storage
        const filePath = await uploadFile(userId, file);
        if (!filePath) {
          throw new Error(`Не удалось загрузить "${file.name}"`);
        }

        // Создаём запись в БД
        const insertData: AttachmentInsert = {
          contest_id: contestId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
        };

        const { data, error } = await supabase
          .from('attachments')
          .insert(insertData)
          .select()
          .single();

        if (error) throw new Error(error.message);
        if (data) uploaded.push(data as Attachment);

        // Обновляем прогресс
        setUploadState(s => ({
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
      // Удаляем файл из Storage
      await deleteFile(attachment.file_path);

      // Удаляем запись из БД
      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id);

      if (error) throw new Error(error.message);
      return attachment;
    },
    onSuccess: (attachment) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.attachments(attachment.contest_id),
      });
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
