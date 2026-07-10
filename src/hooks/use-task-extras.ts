/**
 * Чек-листы, комментарии, timeline
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QUERY_KEYS } from '@/lib/constants';
import type { ActivityEvent, ChecklistItem, TaskComment } from '@/types';

export async function logActivity(
  contestId: string,
  action: string,
  details: Record<string, unknown> = {}
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('activity_log').insert({
    contest_id: contestId,
    user_id: user.id,
    action,
    details,
  });
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
  };

  const addItem = useMutation({
    mutationFn: async (title: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
    },
    onSuccess: invalidate,
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('checklist_items').delete().eq('id', id);
      if (error) throw new Error(error.message);
      await logActivity(contestId, 'checklist_remove', { item_id: id });
    },
    onSuccess: invalidate,
  });

  return { addItem, toggleItem, removeItem };
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

      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          contest_id: contestId,
          user_id: user.id,
          body: body.trim(),
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      await logActivity(contestId, 'comment_add', { preview: body.trim().slice(0, 80) });
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
