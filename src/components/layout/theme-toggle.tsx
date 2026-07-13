/**
 * ThemeToggle — компактный переключатель (иконки, подписи в title)
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

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useAppStore();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl bg-[rgb(var(--bg-secondary))] p-0.5',
        className
      )}
      role="group"
      aria-label="Тема оформления"
    >
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => {
            setTheme(value);
            haptic.selection();
          }}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200',
            theme === value
              ? 'bg-[rgb(var(--bg-card))] text-[rgb(var(--fg-primary))] shadow-sm'
              : 'text-[rgb(var(--fg-muted))] hover:text-[rgb(var(--fg-secondary))]'
          )}
          title={label}
          aria-label={label}
          aria-pressed={theme === value}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
