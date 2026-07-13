import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  acceptInvite,
  createInvite,
  createWorkspace,
  fetchMembers,
  fetchMyWorkspaces,
  fetchWorkspaceActivity,
} from '@/services/workspaceService';
import {
  createAutomationRule,
  deleteAutomationRule,
  fetchAutomationRules,
} from '@/services/automationService';
import { fetchPreferences, savePreferences } from '@/services/preferencesService';
import { computeAnalytics } from '@/services/analyticsService';
import {
  fetchContests,
  softDeleteContest,
  restoreContest,
  deleteContest,
} from '@/services/contestService';
import type { AutomationRule, HomeWidgetId } from '@/types';
import { useAppStore } from '@/stores/app-store';

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: fetchMyWorkspaces,
    staleTime: 60_000,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Не авторизован');
      return createWorkspace(name, session.user.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}

export function useWorkspaceMembers(workspaceId?: string) {
  return useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => fetchMembers(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useCreateInvite(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { role?: 'member' | 'viewer'; email?: string }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Не авторизован');
      return createInvite(
        workspaceId,
        session.user.id,
        input.role ?? 'member',
        input.email
      );
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['workspace-members', workspaceId] }),
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Не авторизован');
      await acceptInvite(token, session.user.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}

export function useWorkspaceActivity(workspaceId?: string) {
  return useQuery({
    queryKey: ['workspace-activity', workspaceId],
    queryFn: () => fetchWorkspaceActivity(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useAutomationRules() {
  return useQuery({
    queryKey: ['automation-rules'],
    queryFn: fetchAutomationRules,
  });
}

export function useCreateAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<AutomationRule, 'id' | 'user_id' | 'created_at'>) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Не авторизован');
      return createAutomationRule(input, session.user.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-rules'] }),
  });
}

export function useDeleteAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAutomationRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-rules'] }),
  });
}

export function usePreferences() {
  return useQuery({
    queryKey: ['preferences'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Не авторизован');
      return fetchPreferences(session.user.id);
    },
  });
}

export function useSavePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: {
      widgets?: HomeWidgetId[];
      onboarding_done?: boolean;
    }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Не авторизован');
      return savePreferences(session.user.id, patch);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['preferences'] }),
  });
}

export function useAnalytics() {
  const workspaceId = useAppStore((s) => s.activeWorkspaceId);
  return useQuery({
    queryKey: ['analytics', workspaceId],
    queryFn: async () => {
      const contests = await fetchContests({
        searchQuery: '',
        statusFilter: 'all',
        hideCompleted: false,
        taskTypeFilter: 'all',
        priorityFilter: 'all',
        sortBy: 'created_at',
        sortOrder: 'desc',
        rootOnly: true,
        workspaceId: workspaceId || undefined,
      });
      return { contests, analytics: computeAnalytics(contests) };
    },
    staleTime: 60_000,
  });
}

export function useTrash() {
  return useQuery({
    queryKey: ['trash'],
    queryFn: () =>
      fetchContests({
        searchQuery: '',
        statusFilter: 'all',
        hideCompleted: false,
        taskTypeFilter: 'all',
        priorityFilter: 'all',
        sortBy: 'created_at',
        sortOrder: 'desc',
        rootOnly: false,
        trash: true,
      }),
  });
}

export function useSoftDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: softDeleteContest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contests'] });
      qc.invalidateQueries({ queryKey: ['trash'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useRestoreTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: restoreContest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contests'] });
      qc.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function usePurgeTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteContest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trash'] }),
  });
}
