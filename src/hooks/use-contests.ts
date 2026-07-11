/**
 * useContests — TanStack Query хуки для работы с конкурсами
 *
 * CRUD операции, фильтрация, статистика
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QUERY_KEYS } from '@/lib/constants';
import { useAppStore } from '@/stores/app-store';
import type {
  Contest,
  ContestInsert,
  ContestUpdate,
  Attachment,
  DashboardStats,
  ContestStatus,
} from '@/types';
import { startOfWeek, isAfter, isBefore, addDays } from 'date-fns';

// ========================
// Запросы (queries)
// ========================

/**
 * Получить все конкурсы текущего пользователя (с фильтрацией)
 */
export function useContests() {
  const {
    searchQuery,
    statusFilter,
    hideCompleted,
    taskTypeFilter,
    priorityFilter,
    sortBy,
    sortOrder,
  } = useAppStore();

  return useQuery({
    queryKey: [
      ...QUERY_KEYS.contests,
      searchQuery,
      statusFilter,
      hideCompleted,
      taskTypeFilter,
      priorityFilter,
      sortBy,
      sortOrder,
    ],
    queryFn: async (): Promise<Contest[]> => {
      let query = supabase.from('contests').select('*');

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      } else if (hideCompleted) {
        // Активные: без готовых и отменённых
        query = query.not('status', 'in', '(done,cancelled)');
      }

      if (taskTypeFilter !== 'all') {
        query = query.eq('task_type', taskTypeFilter);
      }

      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      if (searchQuery.trim()) {
        query = query.ilike('title', `%${searchQuery.trim()}%`);
      }

      // priority сортируем на клиенте (enum), остальное — на сервере
      const serverSort = sortBy === 'priority' ? 'due_date' : sortBy;
      query = query.order(serverSort, {
        ascending: sortOrder === 'asc',
        nullsFirst: false,
      });

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      let rows = (data ?? []).map(normalizeContest);

      if (sortBy === 'priority') {
        const weight: Record<string, number> = {
          low: 1,
          medium: 2,
          high: 3,
          urgent: 4,
        };
        rows = [...rows].sort((a, b) => {
          const diff = (weight[a.priority] ?? 0) - (weight[b.priority] ?? 0);
          return sortOrder === 'asc' ? diff : -diff;
        });
      }

      return rows;
    },
    staleTime: 30_000,
  });
}

/** Нормализация старых записей без новых колонок */
function normalizeContest(row: Record<string, unknown>): Contest {
  return {
    ...(row as unknown as Contest),
    task_type: (row.task_type as Contest['task_type']) ?? 'contest',
    priority: (row.priority as Contest['priority']) ?? 'medium',
    tags: (row.tags as string[]) ?? [],
    color: (row.color as string | null) ?? null,
    telegram_message_links: (row.telegram_message_links as string[]) ?? [],
  };
}

/**
 * Получить один конкурс по ID
 */
export function useContest(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.contest(id ?? ''),
    queryFn: async (): Promise<Contest> => {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('id', id!)
        .single();

      if (error) throw new Error(error.message);
      return normalizeContest(data as Record<string, unknown>);
    },
    enabled: !!id,
  });
}

/**
 * Получить вложения конкурса
 */
export function useAttachments(contestId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.attachments(contestId ?? ''),
    queryFn: async (): Promise<Attachment[]> => {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('contest_id', contestId!)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as Attachment[];
    },
    enabled: !!contestId,
  });
}

/**
 * Получить статистику для дашборда
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: async (): Promise<DashboardStats> => {
      const { data, error } = await supabase
        .from('contests')
        .select('*');

      if (error) throw new Error(error.message);

      const contests = (data ?? []).map((r) =>
        normalizeContest(r as Record<string, unknown>)
      );
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });

      return {
        total: contests.length,
        completed: contests.filter((c) => c.status === 'done').length,
        overdue: contests.filter(
          (c) =>
            c.due_date &&
            isBefore(new Date(c.due_date), now) &&
            c.status !== 'done' &&
            c.status !== 'cancelled'
        ).length,
        inProgress: contests.filter(
          (c) => c.status === 'in_progress' || c.status === 'review'
        ).length,
        completedThisWeek: contests.filter(
          (c) =>
            c.status === 'done' &&
            c.updated_at &&
            isAfter(new Date(c.updated_at), weekStart)
        ).length,
        upcomingDeadlines: contests.filter(
          (c) =>
            c.due_date &&
            isAfter(new Date(c.due_date), now) &&
            isBefore(new Date(c.due_date), addDays(now, 7)) &&
            c.status !== 'done' &&
            c.status !== 'cancelled'
        ).length,
        contests: contests.filter((c) => c.task_type === 'contest').length,
        tasks: contests.filter((c) => c.task_type !== 'contest').length,
      };
    },
    staleTime: 60_000,
  });
}

// ========================
// Мутации
// ========================

/**
 * Создать новый конкурс
 */
export function useCreateContest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ContestInsert): Promise<Contest> => {
      // getSession — без лишнего запроса /auth/v1/user (он мог сбрасывать сессию при 403)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Не авторизован');

      const { data, error } = await supabase
        .from('contests')
        .insert({
          ...input,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return normalizeContest(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contests });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
    },
  });
}

/**
 * Обновить конкурс
 */
export function useUpdateContest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: ContestUpdate & { id: string }): Promise<Contest> => {
      const { data, error } = await supabase
        .from('contests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return normalizeContest(data as Record<string, unknown>);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contests });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contest(data.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
    },
  });
}

/**
 * Удалить конкурс
 */
export function useDeleteContest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('contests')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contests });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
    },
  });
}

/**
 * Быстрое обновление статуса
 */
export function useUpdateContestStatus() {
  const updateContest = useUpdateContest();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      progress,
    }: {
      id: string;
      status: ContestStatus;
      progress?: number;
    }) => {
      return updateContest.mutateAsync({
        id,
        status,
        progress,
      });
    },
  });
}
