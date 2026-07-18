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
  softDeleteContest,
  fetchDashboardStats,
  fetchActivityHeatmap,
  contestsToCsv,
  downloadCsv,
  csvToContestInserts,
  importContests,
  reorderSubtasks,
  syncProgressFromSubtasks,
} from '@/services/contestService';
import {
  applyRulesToInsert,
  applyRulesToUpdate,
  fetchAutomationRules,
} from '@/services/automationService';
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
    activeWorkspaceId,
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
      activeWorkspaceId,
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
        workspaceId: activeWorkspaceId,
      }),
    staleTime: 30_000,
  });
}

/** Канбан: все колонки (готово/отменён), но поиск и фильтры — те же */
export function useContestsBoard() {
  const {
    searchQuery,
    statusFilter,
    taskTypeFilter,
    priorityFilter,
    sortBy,
    sortOrder,
    activeWorkspaceId,
  } = useAppStore();

  return useQuery({
    queryKey: [
      ...QUERY_KEYS.contests,
      'board',
      searchQuery,
      statusFilter,
      taskTypeFilter,
      priorityFilter,
      sortBy,
      sortOrder,
      activeWorkspaceId,
    ],
    queryFn: (): Promise<Contest[]> =>
      fetchContests({
        searchQuery,
        statusFilter: statusFilter === 'all' ? 'all' : statusFilter,
        hideCompleted: false,
        taskTypeFilter,
        priorityFilter,
        sortBy,
        sortOrder,
        rootOnly: true,
        workspaceId: activeWorkspaceId,
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
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  return useQuery({
    queryKey: [...QUERY_KEYS.stats, activeWorkspaceId],
    queryFn: (): Promise<DashboardStats> => fetchDashboardStats(activeWorkspaceId),
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
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);

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

      const rules = await fetchAutomationRules();
      let payload = applyRulesToInsert(rules, input, 'on_create');
      if (
        activeWorkspaceId &&
        activeWorkspaceId !== 'all' &&
        activeWorkspaceId !== 'personal' &&
        !payload.workspace_id
      ) {
        payload = { ...payload, workspace_id: activeWorkspaceId };
      }
      return createContest(payload, user.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contests });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      if (data.parent_id) {
        queryClient.invalidateQueries({
          queryKey: ['subtasks', data.parent_id],
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.contest(data.parent_id),
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
      const prev = await fetchContestById(id).catch(() => null);

      const rules = await fetchAutomationRules();
      const patched = prev != null ? applyRulesToUpdate(rules, prev, updates) : updates;

      const updated = await updateContest(id, patched);

      // Автосоздание следующего повтора при завершении
      if (
        patched.status === 'done' &&
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
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.contest(data.parent_id),
        });
      }
    },
  });
}

export function useDeleteContest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const prev = await fetchContestById(id).catch(() => null);
      await softDeleteContest(id);
      if (prev?.parent_id) {
        try {
          await syncProgressFromSubtasks(prev.parent_id);
        } catch {
          /* ignore */
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contests });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useReorderSubtasks(parentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await reorderSubtasks(parentId, orderedIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentId] });
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
      const { isOnline, enqueueOffline } = await import('@/lib/offline-queue');
      if (!isOnline()) {
        enqueueOffline({
          type: 'update_status',
          contestId: id,
          status,
          progress,
        });
        // оптимистично возвращаем «как будто» обновили
        const prev = await fetchContestById(id).catch(() => null);
        if (!prev)
          throw new Error('Нет сети. Действие в очереди — откройте задачу позже.');
        return {
          ...prev,
          status,
          progress: progress ?? prev.progress,
          completed_at: status === 'done' ? new Date().toISOString() : null,
        };
      }

      const updated = await updateContestMutation.mutateAsync({
        id,
        status,
        progress,
        completed_at: status === 'done' ? new Date().toISOString() : null,
      });
      if (status === 'done') {
        const { celebrateDone } = await import('@/components/ui/celebrate');
        celebrateDone();
      }
      return updated;
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

export function useImportContestsCsv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<number> => {
      if (!clientRateLimit('import-csv', 5, 60_000)) {
        throw new Error('Слишком много импортов. Подождите минуту.');
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Не авторизован');

      const text = await file.text();
      const inserts = csvToContestInserts(text);
      return importContests(inserts, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contests });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
    },
  });
}
