/**
 * attachmentService — Storage + таблица attachments
 */
import { supabase, uploadFile, deleteFile, getSignedFileUrl } from '@/lib/supabase';
import { assertSafeUpload } from '@/lib/file-safety';
import type { Attachment, AttachmentInsert } from '@/types';

export async function fetchAttachments(contestId: string): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('contest_id', contestId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Attachment[];
}

/** Все вложения пользователя (галерея) */
export async function fetchAllUserAttachments(): Promise<
  (Attachment & { contest_title?: string })[]
> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*, contests(title)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const r = row as Attachment & { contests?: { title?: string } | null };
    return {
      id: r.id,
      contest_id: r.contest_id,
      file_name: r.file_name,
      file_path: r.file_path,
      file_type: r.file_type,
      file_size: r.file_size,
      created_at: r.created_at,
      contest_title: r.contests?.title,
    };
  });
}

export async function createAttachment(
  contestId: string,
  userId: string,
  file: File,
  fileType: string
): Promise<Attachment> {
  assertSafeUpload(file);
  const filePath = await uploadFile(userId, file);
  if (!filePath) throw new Error(`Не удалось загрузить "${file.name}"`);

  const insertData: AttachmentInsert = {
    contest_id: contestId,
    file_name: file.name,
    file_path: filePath,
    file_type: fileType,
    file_size: file.size,
  };

  const { data, error } = await supabase
    .from('attachments')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    await deleteFile(filePath);
    throw new Error(error.message);
  }
  return data as Attachment;
}

export async function removeAttachment(attachment: Attachment): Promise<void> {
  await deleteFile(attachment.file_path);
  const { error } = await supabase.from('attachments').delete().eq('id', attachment.id);
  if (error) throw new Error(error.message);
}

export { getSignedFileUrl };
