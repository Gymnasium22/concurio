/**
 * contestService — доступ к задачам/конкурсам (Supabase)
 * Хуки (TanStack Query) вызывают эти функции; UI не ходит в Supabase напрямую.
 */
import { supabase } from '@/lib/supabase';
import type {
  Contest,
  ContestInsert,
  ContestUpdate,
  ContestStatus,
  DashboardStats,
  TaskPriority,
  TaskType,
} from '@/types';
import { startOfWeek, isAfter, isBefore, addDays } from 'date-fns';

export interface ContestListFilters {
  searchQuery: string;
  statusFilter: ContestStatus | 'all';
  hideCompleted: boolean;
  taskTypeFilter: TaskType | 'all';
  priorityFilter: TaskPriority | 'all';
  sortBy: 'due_date' | 'created_at' | 'title' | 'priority';
  sortOrder: 'asc' | 'desc';
  /** Если true — только корневые (без подзадач) */
  rootOnly?: boolean;
  parentId?: string | null;
}

export function normalizeContest(row: Record<string, unknown>): Contest {
  return {
    ...(row as unknown as Contest),
    task_type: (row.task_type as Contest['task_type']) ?? 'contest',
    priority: (row.priority as Contest['priority']) ?? 'medium',
    tags: (row.tags as string[]) ?? [],
    color: (row.color as string | null) ?? null,
    telegram_message_links: (row.telegram_message_links as string[]) ?? [],
    parent_id: (row.parent_id as string | null) ?? null,
    recurrence: (row.recurrence as Contest['recurrence']) ?? 'none',
    recurrence_until: (row.recurrence_until as string | null) ?? null,
  };
}

export async function fetchContests(
  filters: ContestListFilters
): Promise<Contest[]> {
  let query = supabase.from('contests').select('*');

  if (filters.parentId) {
    query = query.eq('parent_id', filters.parentId);
  } else if (filters.rootOnly !== false) {
    // По умолчанию скрываем подзадачи в общем списке
    query = query.is('parent_id', null);
  }

  if (filters.statusFilter !== 'all') {
    query = query.eq('status', filters.statusFilter);
  } else if (filters.hideCompleted) {
    query = query.not('status', 'in', '(done,cancelled)');
  }

  if (filters.taskTypeFilter !== 'all') {
    query = query.eq('task_type', filters.taskTypeFilter);
  }

  if (filters.priorityFilter !== 'all') {
    query = query.eq('priority', filters.priorityFilter);
  }

  if (filters.searchQuery.trim()) {
    query = query.ilike('title', `%${filters.searchQuery.trim()}%`);
  }

  const serverSort =
    filters.sortBy === 'priority' ? 'due_date' : filters.sortBy;
  query = query.order(serverSort, {
    ascending: filters.sortOrder === 'asc',
    nullsFirst: false,
  });

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []).map((r) =>
    normalizeContest(r as Record<string, unknown>)
  );

  if (filters.sortBy === 'priority') {
    const weight: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      urgent: 4,
    };
    rows = [...rows].sort((a, b) => {
      const diff = (weight[a.priority] ?? 0) - (weight[b.priority] ?? 0);
      return filters.sortOrder === 'asc' ? diff : -diff;
    });
  }

  return rows;
}

export async function fetchContestById(id: string): Promise<Contest> {
  const { data, error } = await supabase
    .from('contests')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return normalizeContest(data as Record<string, unknown>);
}

export async function fetchSubtasks(parentId: string): Promise<Contest[]> {
  const { data, error } = await supabase
    .from('contests')
    .select('*')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) =>
    normalizeContest(r as Record<string, unknown>)
  );
}

export async function createContest(
  input: ContestInsert,
  userId: string
): Promise<Contest> {
  const { data, error } = await supabase
    .from('contests')
    .insert({
      ...input,
      user_id: userId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return normalizeContest(data as Record<string, unknown>);
}

export async function updateContest(
  id: string,
  updates: ContestUpdate
): Promise<Contest> {
  const { data, error } = await supabase
    .from('contests')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return normalizeContest(data as Record<string, unknown>);
}

export async function deleteContest(id: string): Promise<void> {
  const { error } = await supabase.from('contests').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.from('contests').select('*');
  if (error) throw new Error(error.message);

  const contests = (data ?? []).map((r) =>
    normalizeContest(r as Record<string, unknown>)
  );
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  return {
    total: contests.filter((c) => !c.parent_id).length,
    completed: contests.filter(
      (c) => !c.parent_id && c.status === 'done'
    ).length,
    overdue: contests.filter(
      (c) =>
        !c.parent_id &&
        c.due_date &&
        isBefore(new Date(c.due_date), now) &&
        c.status !== 'done' &&
        c.status !== 'cancelled'
    ).length,
    inProgress: contests.filter(
      (c) =>
        !c.parent_id &&
        (c.status === 'in_progress' || c.status === 'review')
    ).length,
    completedThisWeek: contests.filter(
      (c) =>
        !c.parent_id &&
        c.status === 'done' &&
        c.updated_at &&
        isAfter(new Date(c.updated_at), weekStart)
    ).length,
    upcomingDeadlines: contests.filter(
      (c) =>
        !c.parent_id &&
        c.due_date &&
        isAfter(new Date(c.due_date), now) &&
        isBefore(new Date(c.due_date), addDays(now, 7)) &&
        c.status !== 'done' &&
        c.status !== 'cancelled'
    ).length,
    contests: contests.filter(
      (c) => !c.parent_id && c.task_type === 'contest'
    ).length,
    tasks: contests.filter(
      (c) => !c.parent_id && c.task_type !== 'contest'
    ).length,
  };
}

/** Активность по дням (тепловая карта) за последние N дней */
export async function fetchActivityHeatmap(
  days = 84
): Promise<{ date: string; count: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('activity_log')
    .select('created_at')
    .gte('created_at', since.toISOString());

  // Если таблицы нет — считаем по updated_at задач
  if (error) {
    const { data: contests, error: cErr } = await supabase
      .from('contests')
      .select('updated_at')
      .gte('updated_at', since.toISOString());
    if (cErr) throw new Error(cErr.message);
    return bucketByDay(
      (contests ?? []).map((c) => c.updated_at as string),
      days
    );
  }

  return bucketByDay(
    (data ?? []).map((r) => r.created_at as string),
    days
  );
}

function bucketByDay(
  timestamps: string[],
  days: number
): { date: string; count: number }[] {
  const map = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }

  for (const ts of timestamps) {
    const key = new Date(ts).toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }

  return [...map.entries()].map(([date, count]) => ({ date, count }));
}

/** Экспорт задач в CSV */
export function contestsToCsv(contests: Contest[]): string {
  const headers = [
    'id',
    'title',
    'description',
    'status',
    'task_type',
    'priority',
    'progress',
    'due_date',
    'tags',
    'parent_id',
    'recurrence',
    'created_at',
    'updated_at',
  ];

  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [headers.join(',')];
  for (const c of contests) {
    lines.push(
      [
        c.id,
        c.title,
        c.description ?? '',
        c.status,
        c.task_type,
        c.priority,
        c.progress,
        c.due_date ?? '',
        (c.tags ?? []).join('|'),
        c.parent_id ?? '',
        c.recurrence ?? 'none',
        c.created_at,
        c.updated_at,
      ]
        .map(escape)
        .join(',')
    );
  }
  return lines.join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
