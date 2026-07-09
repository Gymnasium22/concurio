/**
 * ThemeToggle — переключатель тёмной/светлой темы
 */
import { Sun, Moon, Monitor } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '@/types';
import { haptic } from '@/lib/telegram';

const themes: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Светлая' },
  { value: 'dark', icon: Moon, label: 'Тёмная' },
  { value: 'system', icon: Monitor, label: 'Системная' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useAppStore();

  return (
    <div className="flex items-center gap-1 rounded-xl bg-[rgb(var(--bg-secondary))] p-1">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => {
            setTheme(value);
            haptic.selection();
          }}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200',
            theme === value
              ? 'bg-[rgb(var(--bg-card))] text-[rgb(var(--fg-primary))] shadow-sm'
              : 'text-[rgb(var(--fg-muted))] hover:text-[rgb(var(--fg-secondary))]'
          )}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
