/**
 * ThemeToggle — одна кнопка-цикл (light → dark → system), без трёх иконок в шапке
 */
import { Sun, Moon, Monitor } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '@/types';
import { haptic } from '@/lib/telegram';
import { Button } from '@/components/ui/button';

const ORDER: ThemeMode[] = ['light', 'dark', 'system'];

const META: Record<ThemeMode, { icon: typeof Sun; label: string; nextHint: string }> = {
  light: { icon: Sun, label: 'Светлая', nextHint: 'Тёмная' },
  dark: { icon: Moon, label: 'Тёмная', nextHint: 'Системная' },
  system: { icon: Monitor, label: 'Системная', nextHint: 'Светлая' },
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useAppStore();
  const current = META[theme] ?? META.system;
  const Icon = current.icon;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('h-9 w-9 p-0 shrink-0', className)}
      onClick={() => {
        const i = ORDER.indexOf(theme);
        setTheme(ORDER[(i + 1) % ORDER.length]);
        haptic.selection();
      }}
      title={`Тема: ${current.label} → ${current.nextHint}`}
      aria-label={`Тема: ${current.label}. Нажмите для «${current.nextHint}»`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
