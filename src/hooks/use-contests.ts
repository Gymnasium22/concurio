/**
 * useContests — TanStack Query хуки (данные с сервера).
 * Zustand — только UI/фильтры; CRUD — через contestService.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QUERY_KEYS } from '@/lib/constants';
import { useAppStore } from '@/stores/app-store';
import { clientRateLimit } from '@/lib/rate-limit';
import {
  fetchContests,
  fetchContestById,
  fetchSubtasks,
  createContest,
  updateContest,
  deleteContest,
  fetchDashboardStats,
  fetchActivityHeatmap,
  contestsToCsv,
  downloadCsv,
} from '@/services/contestService';
import { fetchAttachments } from '@/services/attachmentService';
import { contestsToIcs, downloadIcs } from '@/lib/ics';
import { spawnNextOccurrence } from '@/lib/recurrence';
import type {
  Contest,
  ContestInsert,
  ContestUpdate,
  Attachment,
  DashboardStats,
  ContestStatus,
} from '@/types';

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
    queryFn: (): Promise<Contest[]> =>
      fetchContests({
        searchQuery,
        statusFilter,
        hideCompleted,
        taskTypeFilter,
        priorityFilter,
        sortBy,
        sortOrder,
        rootOnly: true,
      }),
    staleTime: 30_000,
  });
}

export function useContest(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.contest(id ?? ''),
    queryFn: (): Promise<Contest> => fetchContestById(id!),
    enabled: !!id,
  });
}

export function useSubtasks(parentId: string | undefined) {
  return useQuery({
    queryKey: ['subtasks', parentId ?? ''],
    queryFn: (): Promise<Contest[]> => fetchSubtasks(parentId!),
    enabled: !!parentId,
    staleTime: 20_000,
  });
}

export function useAttachments(contestId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.attachments(contestId ?? ''),
    queryFn: (): Promise<Attachment[]> => fetchAttachments(contestId!),
    enabled: !!contestId,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: (): Promise<DashboardStats> => fetchDashboardStats(),
    staleTime: 60_000,
  });
}

export function useActivityHeatmap(days = 84) {
  return useQuery({
    queryKey: ['activity-heatmap', days],
    queryFn: () => fetchActivityHeatmap(days),
    staleTime: 120_000,
  });
}

export function useCreateContest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ContestInsert): Promise<Contest> => {
      if (!clientRateLimit('create-contest', 20, 60_000)) {
        throw new Error(
          'Слишком много созданий задач. Подождите минуту и попробуйте снова.'
        );
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Не авторизован');

      return createContest(input, user.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contests });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      if (data.parent_id) {
        queryClient.invalidateQueries({
          queryKey: ['subtasks', data.parent_id],
        });
      }
    },
  });
}

export function useUpdateContest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: ContestUpdate & { id: string }): Promise<Contest> => {
      // Перед сменой статуса — читаем текущую запись (для recurrence)
      let prev: Contest | null = null;
      if (updates.status === 'done') {
        try {
          prev = await fetchContestById(id);
        } catch {
          prev = null;
        }
      }

      const updated = await updateContest(id, updates);

      // Автосоздание следующего повтора при завершении
      if (
        updates.status === 'done' &&
        prev &&
        prev.status !== 'done' &&
        prev.recurrence &&
        prev.recurrence !== 'none'
      ) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (userId) {
          try {
            await spawnNextOccurrence({ ...prev, ...updated }, userId);
          } catch (e) {
            console.warn('recurrence spawn failed', e);
          }
        }
      }

      return updated;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contests });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contest(data.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      if (data.parent_id) {
        queryClient.invalidateQueries({
          queryKey: ['subtasks', data.parent_id],
        });
      }
    },
  });
}

export function useDeleteContest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await deleteContest(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contests });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    },
  });
}

export function useUpdateContestStatus() {
  const updateContestMutation = useUpdateContest();

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
      return updateContestMutation.mutateAsync({
        id,
        status,
        progress,
      });
    },
  });
}

export function exportContestsCsv(contests: Contest[], filename?: string) {
  const csv = contestsToCsv(contests);
  downloadCsv(
    filename ?? `concurio-tasks-${new Date().toISOString().slice(0, 10)}.csv`,
    csv
  );
}

export function exportContestsIcs(contests: Contest[], filename?: string) {
  const withDue = contests.filter((c) => c.due_date);
  if (withDue.length === 0) {
    throw new Error('Нет задач с дедлайном для календаря');
  }
  const ics = contestsToIcs(withDue);
  downloadIcs(
    filename ?? `concurio-calendar-${new Date().toISOString().slice(0, 10)}.ics`,
    ics
  );
}
