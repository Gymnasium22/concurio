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
  const { searchQuery, statusFilter, sortBy, sortOrder } = useAppStore();

  return useQuery({
    queryKey: [...QUERY_KEYS.contests, searchQuery, statusFilter, sortBy, sortOrder],
    queryFn: async (): Promise<Contest[]> => {
      let query = supabase
        .from('contests')
        .select('*');

      // Фильтр по статусу
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Поиск по названию
      if (searchQuery.trim()) {
        query = query.ilike('title', `%${searchQuery.trim()}%`);
      }

      // Сортировка
      query = query.order(sortBy, {
        ascending: sortOrder === 'asc',
        nullsFirst: false,
      });

      const { data, error } = await query;

      if (error) throw new Error(error.message);
      return (data ?? []) as Contest[];
    },
    staleTime: 30_000, // 30 секунд
  });
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
      return data as Contest;
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

      const contests = (data ?? []) as Contest[];
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Понедельник

      return {
        total: contests.length,
        completed: contests.filter(c => c.status === 'done').length,
        overdue: contests.filter(c =>
          c.due_date &&
          isBefore(new Date(c.due_date), now) &&
          c.status !== 'done' &&
          c.status !== 'cancelled'
        ).length,
        inProgress: contests.filter(c =>
          c.status === 'in_progress' || c.status === 'review'
        ).length,
        completedThisWeek: contests.filter(c =>
          c.status === 'done' &&
          c.updated_at &&
          isAfter(new Date(c.updated_at), weekStart)
        ).length,
        upcomingDeadlines: contests.filter(c =>
          c.due_date &&
          isAfter(new Date(c.due_date), now) &&
          isBefore(new Date(c.due_date), addDays(now, 7)) &&
          c.status !== 'done' &&
          c.status !== 'cancelled'
        ).length,
      };
    },
    staleTime: 60_000, // 1 минута
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
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
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
      return data as Contest;
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
      return data as Contest;
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
