/**
 * Чек-листы, комментарии, timeline
 * Чек-лист автоматически обновляет progress задачи
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QUERY_KEYS } from '@/lib/constants';
import type { ActivityEvent, ChecklistItem, ContestStatus, TaskComment } from '@/types';

export async function logActivity(
  contestId: string,
  action: string,
  details: Record<string, unknown> = {}
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;

  await supabase.from('activity_log').insert({
    contest_id: contestId,
    user_id: user.id,
    action,
    details,
  });
}

/**
 * Прогресс задачи = доля выполненных пунктов чек-листа.
 * Если есть подзадачи — прогресс считается по ним (не затираем).
 * Если пунктов нет — progress не трогаем (ручной / статусный).
 */
export async function syncProgressFromChecklist(
  contestId: string
): Promise<{ progress: number; status?: ContestStatus } | null> {
  const { count: subCount } = await supabase
    .from('contests')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', contestId);

  if (subCount && subCount > 0) {
    return null;
  }

  const { data: items, error } = await supabase
    .from('checklist_items')
    .select('is_done')
    .eq('contest_id', contestId);

  if (error) throw new Error(error.message);
  if (!items || items.length === 0) {
    return null;
  }

  const done = items.filter((i) => i.is_done).length;
  const progress = Math.round((done / items.length) * 100);

  const { data: contest } = await supabase
    .from('contests')
    .select('status')
    .eq('id', contestId)
    .single();

  let status: ContestStatus | undefined;
  const current = (contest?.status as ContestStatus) || 'todo';

  if (current !== 'cancelled') {
    if (progress >= 100) {
      status = 'done';
    } else if (progress > 0 && (current === 'todo' || current === 'done')) {
      status = 'in_progress';
    } else if (progress === 0 && current === 'done') {
      status = 'in_progress';
    }
  }

  const updates: { progress: number; status?: ContestStatus } = { progress };
  if (status) updates.status = status;

  const { error: updError } = await supabase
    .from('contests')
    .update(updates)
    .eq('id', contestId);

  if (updError) throw new Error(updError.message);

  await logActivity(contestId, 'progress_change', {
    progress,
    source: 'checklist',
    done,
    total: items.length,
    status: status ?? current,
  });

  return { progress, status };
}

// ---------- Checklist ----------

export function useChecklist(contestId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.checklist(contestId ?? ''),
    queryFn: async (): Promise<ChecklistItem[]> => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('contest_id', contestId!)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as ChecklistItem[];
    },
    enabled: !!contestId,
  });
}

export function useChecklistMutations(contestId: string) {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.checklist(contestId) });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.activity(contestId) });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.contest(contestId) });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.contests });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.stats });
  };

  const afterChecklistChange = async () => {
    await syncProgressFromChecklist(contestId);
    invalidate();
  };

  const addItem = useMutation({
    mutationFn: async (title: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Не авторизован');

      const { data: existing } = await supabase
        .from('checklist_items')
        .select('position')
        .eq('contest_id', contestId)
        .order('position', { ascending: false })
        .limit(1);

      const position = (existing?.[0]?.position ?? -1) + 1;

      const { data, error } = await supabase
        .from('checklist_items')
        .insert({
          contest_id: contestId,
          user_id: user.id,
          title: title.trim(),
          position,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      await logActivity(contestId, 'checklist_add', { title: title.trim() });
      await syncProgressFromChecklist(contestId);
      return data as ChecklistItem;
    },
    onSuccess: invalidate,
  });

  const toggleItem = useMutation({
    mutationFn: async ({ id, is_done }: { id: string; is_done: boolean }) => {
      const { error } = await supabase
        .from('checklist_items')
        .update({ is_done, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
      await logActivity(contestId, is_done ? 'checklist_done' : 'checklist_undone', {
        item_id: id,
      });
      await syncProgressFromChecklist(contestId);
    },
    onSuccess: invalidate,
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('checklist_items').delete().eq('id', id);
      if (error) throw new Error(error.message);
      await logActivity(contestId, 'checklist_remove', { item_id: id });
      await syncProgressFromChecklist(contestId);
    },
    onSuccess: invalidate,
  });

  /** Переупорядочить пункты (по id в новом порядке) */
  const reorderItems = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, position) =>
          supabase
            .from('checklist_items')
            .update({ position, updated_at: new Date().toISOString() })
            .eq('id', id)
        )
      );
      await logActivity(contestId, 'checklist_reorder', {
        count: orderedIds.length,
      });
    },
    onSuccess: invalidate,
  });

  return { addItem, toggleItem, removeItem, reorderItems, afterChecklistChange };
}

// ---------- Comments ----------

export function useComments(contestId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.comments(contestId ?? ''),
    queryFn: async (): Promise<TaskComment[]> => {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('contest_id', contestId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as TaskComment[];
    },
    enabled: !!contestId,
  });
}

export function useCommentMutations(contestId: string) {
  const qc = useQueryClient();

  const addComment = useMutation({
    mutationFn: async (body: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Не авторизован');

      const text = body.trim();
      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          contest_id: contestId,
          user_id: user.id,
          body: text,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      // @mentions: @username или @uuid
      const mentions = [...text.matchAll(/@([a-zA-Z0-9_-]{2,64})/g)].map((m) => m[1]!);
      if (mentions.length) {
        await logActivity(contestId, 'mention', {
          handles: mentions,
          comment_id: (data as TaskComment).id,
        });
        // best-effort: если handle = uuid, пишем в comment_mentions
        for (const handle of mentions) {
          if (
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              handle
            )
          ) {
            await supabase.from('comment_mentions').insert({
              comment_id: (data as TaskComment).id,
              mentioned_user_id: handle,
            });
          }
        }
      }

      await logActivity(contestId, 'comment_add', {
        preview: text.slice(0, 80),
        mentions,
      });
      return data as TaskComment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.comments(contestId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.activity(contestId) });
    },
  });

  const removeComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('task_comments').delete().eq('id', id);
      if (error) throw new Error(error.message);
      await logActivity(contestId, 'comment_remove', { comment_id: id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.comments(contestId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.activity(contestId) });
    },
  });

  return { addComment, removeComment };
}

// ---------- Activity ----------

export function useActivity(contestId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.activity(contestId ?? ''),
    queryFn: async (): Promise<ActivityEvent[]> => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('contest_id', contestId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as ActivityEvent[];
    },
    enabled: !!contestId,
  });
}
