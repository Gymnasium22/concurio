/**
 * Supabase Client — подключение к базе данных и Storage
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase credentials not configured. Copy .env.example → .env and fill in your values.'
  );
}

/** Supabase клиент для работы с БД, Auth и Storage */
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      // Сохраняем сессию в localStorage
      persistSession: true,
      autoRefreshToken: true,
      // Для Telegram Mini App используем свой storage key
      storageKey: 'concurio-auth',
    },
  }
);

/**
 * Получить публичный URL файла из Supabase Storage
 * @param filePath - путь к файлу в бакете 'attachments'
 */
export function getFileUrl(filePath: string): string {
  const { data } = supabase.storage
    .from('attachments')
    .getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Получить подписанный URL для скачивания (если бакет приватный)
 * @param filePath - путь к файлу
 * @param expiresIn - время жизни ссылки в секундах (по умолчанию 1 час)
 */
export async function getSignedFileUrl(
  filePath: string,
  expiresIn = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error('Error creating signed URL:', error.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Загрузить файл в Supabase Storage
 * @param userId - ID пользователя (для папки)
 * @param file - объект File для загрузки
 * @returns путь к загруженному файлу или null при ошибке
 */
export async function uploadFile(
  userId: string,
  file: File
): Promise<string | null> {
  // Уникальное имя: userId/timestamp_filename
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${userId}/${timestamp}_${safeName}`;

  const { error } = await supabase.storage
    .from('attachments')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading file:', error.message);
    return null;
  }

  return filePath;
}

/**
 * Удалить файл из Supabase Storage
 * @param filePath - путь к файлу для удаления
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  const { error } = await supabase.storage
    .from('attachments')
    .remove([filePath]);

  if (error) {
    console.error('Error deleting file:', error.message);
    return false;
  }
  return true;
}
