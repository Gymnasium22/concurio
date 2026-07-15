/**
 * Календарь дедлайнов
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { useContests } from '@/hooks/use-contests';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Contest } from '@/types';
import { STATUS_LABELS } from '@/lib/constants';

export function DeadlineCalendar() {
  const { data: contests, isLoading } = useContests();
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const byDay = useMemo(() => {
    const map = new Map<string, Contest[]>();
    const add = (key: string, c: Contest) => {
      const list = map.get(key) ?? [];
      // не дублировать одну задачу в день
      if (!list.some((x) => x.id === c.id)) list.push(c);
      map.set(key, list);
    };
    for (const c of contests ?? []) {
      if (c.status === 'cancelled') continue;
      if (c.due_date) {
        add(format(new Date(c.due_date), 'yyyy-MM-dd'), c);
      }
      // ближайший этап тоже на календаре
      if (c.next_stage_due_date) {
        add(format(new Date(c.next_stage_due_date), 'yyyy-MM-dd'), c);
      }
    }
    return map;
  }, [contests]);

  const selectedKey = selected ? format(selected, 'yyyy-MM-dd') : null;
  const selectedTasks = selectedKey ? (byDay.get(selectedKey) ?? []) : [];

  if (isLoading) {
    return <Skeleton className="h-80 w-full rounded-2xl" />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 glass rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h3 className="text-base font-bold capitalize">
            {format(month, 'LLLL yyyy', { locale: ru })}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
            <div
              key={d}
              className="text-center text-[11px] font-medium text-[rgb(var(--fg-muted))] py-1"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const count = byDay.get(key)?.length ?? 0;
            const inMonth = isSameMonth(day, month);
            const active = selected && isSameDay(day, selected);

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(day)}
                className={cn(
                  'relative aspect-square rounded-xl text-sm font-medium transition-colors',
                  !inMonth && 'text-[rgb(var(--fg-muted))] opacity-40',
                  inMonth && 'hover:bg-[rgb(var(--bg-secondary))]',
                  active && 'bg-accent-500 text-white hover:bg-accent-600',
                  isToday(day) && !active && 'ring-1 ring-accent-400'
                )}
              >
                {format(day, 'd')}
                {count > 0 && (
                  <span
                    className={cn(
                      'absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full',
                      active ? 'bg-white' : 'bg-accent-500'
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-2 glass rounded-2xl p-4 sm:p-5 space-y-3">
        <h3 className="text-sm font-bold">
          {selected ? format(selected, 'd MMMM yyyy', { locale: ru }) : 'Выберите день'}
        </h3>
        {selectedTasks.length === 0 ? (
          <p className="text-sm text-[rgb(var(--fg-muted))]">Нет дедлайнов в этот день</p>
        ) : (
          <ul className="space-y-2">
            {selectedTasks.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/contest/${c.id}`}
                  className="block rounded-xl border border-[rgb(var(--border-default))] p-3 hover:border-accent-400/50 transition-colors"
                >
                  <p className="text-sm font-semibold">{c.title}</p>
                  <p className="text-xs text-[rgb(var(--fg-muted))] mt-0.5">
                    {STATUS_LABELS[c.status]} · {c.progress}%
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
