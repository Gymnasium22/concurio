/**
 * Zustand Store — глобальное состояние приложения
 *
 * Хранит: тему, состояние Telegram, фильтры, UI-state
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ContestStatus, TaskPriority, TaskType, ThemeMode } from '@/types';
import { normalizeWorkspaceScope, type WorkspaceScope } from '@/lib/workspace-scope';

interface AppState {
  // Тема
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // Telegram
  isTelegramApp: boolean;
  setIsTelegramApp: (value: boolean) => void;

  // Фильтры
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: ContestStatus | 'all';
  setStatusFilter: (status: ContestStatus | 'all') => void;
  /** Скрывать готовые и отменённые (архив) — по умолчанию true */
  hideCompleted: boolean;
  setHideCompleted: (hide: boolean) => void;
  taskTypeFilter: TaskType | 'all';
  setTaskTypeFilter: (type: TaskType | 'all') => void;
  priorityFilter: TaskPriority | 'all';
  setPriorityFilter: (priority: TaskPriority | 'all') => void;
  sortBy: 'due_date' | 'created_at' | 'title' | 'priority';
  setSortBy: (sort: 'due_date' | 'created_at' | 'title' | 'priority') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;

  // UI
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;

  /**
   * Область задач:
   * - 'personal' — только личные
   * - 'all' — все (личные + workspace)
   * - uuid — конкретный workspace
   */
  activeWorkspaceId: WorkspaceScope;
  setActiveWorkspaceId: (id: WorkspaceScope) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      isTelegramApp: false,
      setIsTelegramApp: (value) => set({ isTelegramApp: value }),

      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      statusFilter: 'all',
      setStatusFilter: (status) => set({ statusFilter: status }),
      hideCompleted: true,
      setHideCompleted: (hide) => set({ hideCompleted: hide }),
      taskTypeFilter: 'all',
      setTaskTypeFilter: (type) => set({ taskTypeFilter: type }),
      priorityFilter: 'all',
      setPriorityFilter: (priority) => set({ priorityFilter: priority }),
      sortBy: 'due_date',
      setSortBy: (sort) => set({ sortBy: sort }),
      sortOrder: 'asc',
      setSortOrder: (order) => set({ sortOrder: order }),

      isMobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),

      activeWorkspaceId: 'all',
      setActiveWorkspaceId: (id) =>
        set({ activeWorkspaceId: normalizeWorkspaceScope(id) }),
    }),
    {
      name: 'concurio-settings',
      partialize: (state) => ({
        theme: state.theme,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        hideCompleted: state.hideCompleted,
        activeWorkspaceId: state.activeWorkspaceId,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          ...p,
          activeWorkspaceId: normalizeWorkspaceScope(
            p.activeWorkspaceId === undefined
              ? current.activeWorkspaceId
              : p.activeWorkspaceId
          ),
        };
      },
    }
  )
);

function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

if (typeof window !== 'undefined') {
  const savedTheme = (JSON.parse(localStorage.getItem('concurio-settings') || '{}')?.state
    ?.theme ?? 'system') as ThemeMode;
  applyTheme(savedTheme);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentTheme = useAppStore.getState().theme;
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  });
}
