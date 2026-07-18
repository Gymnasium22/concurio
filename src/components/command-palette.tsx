/**
 * Command palette — ⌘K / Ctrl+K
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useContests } from '@/hooks/use-contests';
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  FolderOpen,
  LayoutDashboard,
  LayoutGrid,
  Plus,
  Search,
  Trash2,
  Users,
  Zap,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/telegram';

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Plus;
  keywords?: string;
  run: () => void;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { data: contests } = useContests();

  const go = useCallback(
    (path: string) => {
      setOpen(false);
      setQ('');
      haptic.light();
      navigate(path);
    },
    [navigate]
  );

  const commands = useMemo<Cmd[]>(() => {
    const base: Cmd[] = [
      {
        id: 'create',
        label: 'Создать задачу',
        hint: 'Новая',
        icon: Plus,
        keywords: 'create new task задача создать',
        run: () => go('/create'),
      },
      {
        id: 'home',
        label: 'Главная',
        icon: LayoutDashboard,
        keywords: 'home dashboard главная',
        run: () => go('/'),
      },
      {
        id: 'kanban',
        label: 'Канбан',
        icon: LayoutGrid,
        keywords: 'board kanban доска',
        run: () => go('/kanban'),
      },
      {
        id: 'calendar',
        label: 'Календарь',
        icon: CalendarDays,
        keywords: 'calendar календарь',
        run: () => go('/calendar'),
      },
      {
        id: 'analytics',
        label: 'Аналитика',
        icon: BarChart3,
        keywords: 'stats analytics',
        run: () => go('/analytics'),
      },
      {
        id: 'workspace',
        label: 'Команда',
        icon: Users,
        keywords: 'team workspace команда',
        run: () => go('/workspace'),
      },
      {
        id: 'gallery',
        label: 'Файлы',
        icon: FolderOpen,
        keywords: 'files gallery файлы',
        run: () => go('/gallery'),
      },
      {
        id: 'automations',
        label: 'Автоправила',
        icon: Zap,
        keywords: 'automation rules',
        run: () => go('/automations'),
      },
      {
        id: 'trash',
        label: 'Корзина',
        icon: Trash2,
        keywords: 'trash delete корзина',
        run: () => go('/trash'),
      },
      {
        id: 'profile',
        label: 'Профиль',
        icon: CheckSquare,
        keywords: 'profile settings профиль',
        run: () => go('/profile'),
      },
    ];

    const tasks = (contests ?? []).slice(0, 40).map((c) => ({
      id: `task-${c.id}`,
      label: c.title,
      hint: 'Открыть',
      icon: CheckSquare,
      keywords: `${c.title} ${c.tags?.join(' ') ?? ''}`,
      run: () => go(`/contest/${c.id}`),
    }));

    return [...base, ...tasks];
  }, [contests, go]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return commands.slice(0, 12);
    return commands
      .filter((c) => {
        const hay = `${c.label} ${c.hint ?? ''} ${c.keywords ?? ''}`.toLowerCase();
        return hay.includes(needle);
      })
      .slice(0, 12);
  }, [commands, q]);

  useEffect(() => {
    setActive(0);
  }, [q, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const runActive = () => {
    const item = filtered[active];
    if (item) item.run();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'hidden sm:inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border-default))]',
          'bg-[rgb(var(--bg-secondary))]/80 px-2.5 py-1.5 text-xs text-[rgb(var(--fg-muted))]',
          'hover:border-accent-400/50 hover:text-[rgb(var(--fg-primary))] transition-colors',
          'min-h-[36px] max-w-[11rem]'
        )}
        aria-label="Поиск и команды"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">Поиск…</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 rounded-md border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-card))] px-1.5 py-0.5 text-[10px] font-medium">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            'p-0 gap-0 overflow-hidden sm:max-w-lg',
            'sm:top-[18%] sm:translate-y-0'
          )}
        >
          <DialogTitle className="sr-only">Команды</DialogTitle>
          <div className="flex items-center gap-2 border-b border-[rgb(var(--border-default))] px-3 py-2.5">
            <Search className="h-4 w-4 text-[rgb(var(--fg-muted))] shrink-0" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActive((i) => Math.min(i + 1, filtered.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActive((i) => Math.max(i - 1, 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  runActive();
                }
              }}
              placeholder="Команда или задача…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[rgb(var(--fg-muted))] min-h-[40px]"
            />
          </div>
          <ul className="max-h-[min(50dvh,360px)] overflow-y-auto p-1.5" role="listbox">
            {filtered.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-[rgb(var(--fg-muted))]">
                Ничего не найдено
              </li>
            )}
            {filtered.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => item.run()}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                      'min-h-[44px] touch-manipulation',
                      i === active
                        ? 'bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-200'
                        : 'hover:bg-[rgb(var(--bg-secondary))]'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-80" />
                    <span className="flex-1 truncate font-medium">{item.label}</span>
                    {item.hint && (
                      <span className="text-[10px] text-[rgb(var(--fg-muted))] shrink-0">
                        {item.hint}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="px-3 py-2 text-[10px] text-[rgb(var(--fg-muted))] border-t border-[rgb(var(--border-default))]">
            ↑↓ выбор · Enter открыть · Esc закрыть · ⌘K
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
