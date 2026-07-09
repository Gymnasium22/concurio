/**
 * Zustand Store — глобальное состояние приложения
 *
 * Хранит: тему, состояние Telegram, фильтры, UI-state
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ContestStatus, ThemeMode } from '@/types';

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
  sortBy: 'due_date' | 'created_at' | 'title';
  setSortBy: (sort: 'due_date' | 'created_at' | 'title') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;

  // UI
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Тема (по умолчанию — системная)
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      // Telegram
      isTelegramApp: false,
      setIsTelegramApp: (value) => set({ isTelegramApp: value }),

      // Фильтры
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      statusFilter: 'all',
      setStatusFilter: (status) => set({ statusFilter: status }),
      sortBy: 'due_date',
      setSortBy: (sort) => set({ sortBy: sort }),
      sortOrder: 'asc',
      setSortOrder: (order) => set({ sortOrder: order }),

      // UI
      isMobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
    }),
    {
      name: 'concurio-settings',
      // Сохраняем только настройки, не UI-state
      partialize: (state) => ({
        theme: state.theme,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
    }
  )
);

/**
 * Применить тему к документу
 */
function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    // 'system' — следуем системным настройкам
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

// Инициализация темы при загрузке
if (typeof window !== 'undefined') {
  const savedTheme = (JSON.parse(localStorage.getItem('concurio-settings') || '{}')?.state?.theme ?? 'system') as ThemeMode;
  applyTheme(savedTheme);

  // Слушаем изменения системной темы
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentTheme = useAppStore.getState().theme;
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  });
}
