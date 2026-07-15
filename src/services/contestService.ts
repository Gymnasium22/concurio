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
  workspaceId?: string | null;
  /** trash = only deleted; active = not deleted (default) */
  trash?: boolean;
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
    position: typeof row.position === 'number' ? row.position : 0,
    recurrence: (row.recurrence as Contest['recurrence']) ?? 'none',
    recurrence_until: (row.recurrence_until as string | null) ?? null,
    workspace_id: (row.workspace_id as string | null) ?? null,
    deleted_at: (row.deleted_at as string | null) ?? null,
    completed_at: (row.completed_at as string | null) ?? null,
  };
}

/** Ближайший дедлайн среди незакрытых подзадач + счётчики */
export function computeSubtaskMeta(subtasks: Contest[]): {
  next_stage_due_date: string | null;
  next_stage_title: string | null;
  subtask_count: number;
  subtask_done_count: number;
} {
  const active = subtasks.filter((s) => s.status !== 'cancelled' && !s.deleted_at);
  const open = active.filter((s) => s.status !== 'done');
  const withDue = open
    .filter((s) => s.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  const nearest = withDue[0];
  return {
    next_stage_due_date: nearest?.due_date ?? null,
    next_stage_title: nearest?.title ?? null,
    subtask_count: active.length,
    subtask_done_count: active.filter((s) => s.status === 'done').length,
  };
}

/**
 * Обогатить корневые задачи ближайшим дедлайном этапа и счётчиками.
 */
export async function enrichWithSubtaskMeta(contests: Contest[]): Promise<Contest[]> {
  if (contests.length === 0) return contests;
  const ids = contests.map((c) => c.id);

  let data: Record<string, unknown>[] | null = null;
  const res = await supabase
    .from('contests')
    .select('id,parent_id,title,due_date,status,progress,position,created_at,deleted_at')
    .in('parent_id', ids)
    .is('deleted_at', null);

  if (res.error) {
    // soft-delete колонки может не быть
    if (/deleted_at|column/i.test(res.error.message)) {
      const fallback = await supabase
        .from('contests')
        .select('id,parent_id,title,due_date,status,progress,created_at')
        .in('parent_id', ids);
      if (fallback.error) return contests;
      data = (fallback.data ?? []) as Record<string, unknown>[];
    } else {
      return contests;
    }
  } else {
    data = (res.data ?? []) as Record<string, unknown>[];
  }

  const byParent = new Map<string, Contest[]>();
  for (const row of data) {
    const c = normalizeContest(row);
    if (!c.parent_id) continue;
    const list = byParent.get(c.parent_id) ?? [];
    list.push(c);
    byParent.set(c.parent_id, list);
  }

  return contests.map((parent) => {
    const subs = byParent.get(parent.id) ?? [];
    if (subs.length === 0) {
      return {
        ...parent,
        next_stage_due_date: null,
        next_stage_title: null,
        subtask_count: 0,
        subtask_done_count: 0,
      };
    }
    return { ...parent, ...computeSubtaskMeta(subs) };
  });
}

/**
 * Прогресс родителя = среднее progress незакрытых-как-отменённых подзадач.
 * Статус: все done → done; иначе по среднему %; cancelled родителя не трогаем.
 */
export async function syncProgressFromSubtasks(
  parentId: string
): Promise<{ progress: number; status?: ContestStatus } | null> {
  const { data: parentRow, error: parentErr } = await supabase
    .from('contests')
    .select('status')
    .eq('id', parentId)
    .single();
  if (parentErr) throw new Error(parentErr.message);

  const parentStatus = (parentRow?.status as ContestStatus) || 'todo';
  if (parentStatus === 'cancelled') return null;

  let q = supabase
    .from('contests')
    .select('status,progress,deleted_at')
    .eq('parent_id', parentId);

  const { data: rows, error } = await q;
  if (error) {
    if (/deleted_at|column/i.test(error.message)) {
      const fb = await supabase
        .from('contests')
        .select('status,progress')
        .eq('parent_id', parentId);
      if (fb.error) throw new Error(fb.error.message);
      return applySubtaskProgressSync(parentId, parentStatus, fb.data ?? []);
    }
    throw new Error(error.message);
  }

  return applySubtaskProgressSync(parentId, parentStatus, rows ?? []);
}

async function applySubtaskProgressSync(
  parentId: string,
  parentStatus: ContestStatus,
  rows: { status?: string; progress?: number; deleted_at?: string | null }[]
): Promise<{ progress: number; status?: ContestStatus } | null> {
  const active = rows.filter((r) => !r.deleted_at && r.status !== 'cancelled');
  if (active.length === 0) return null;

  const progress = Math.round(
    active.reduce((sum, r) => sum + (Number(r.progress) || 0), 0) / active.length
  );

  const allDone = active.every((r) => r.status === 'done');
  const anyInProgress = active.some((r) => r.status === 'in_progress');
  const anyReview = active.some((r) => r.status === 'review');
  const anyWork =
    anyInProgress ||
    anyReview ||
    active.some((r) => (Number(r.progress) || 0) > 0 || r.status === 'done');

  let status: ContestStatus;
  if (allDone) {
    status = 'done';
  } else if (anyReview && !anyInProgress && !active.some((r) => r.status === 'todo')) {
    status = 'review';
  } else if (anyWork) {
    status = progress >= 85 ? 'review' : 'in_progress';
  } else {
    status = 'todo';
  }

  // Не откатываем «Готово» родителя только из‑за дробного progress, если все done
  if (allDone) status = 'done';

  const updates: ContestUpdate = {
    progress: allDone ? 100 : Math.min(progress, 99),
    status,
  };
  if (status === 'done' && parentStatus !== 'done') {
    updates.completed_at = new Date().toISOString();
  } else if (status !== 'done' && parentStatus === 'done') {
    updates.completed_at = null;
  }

  const { error: updError } = await supabase
    .from('contests')
    .update(updates)
    .eq('id', parentId);
  if (updError) throw new Error(updError.message);

  return { progress: updates.progress ?? progress, status };
}

/** Следующий position для подзадачи */
export async function nextSubtaskPosition(parentId: string): Promise<number> {
  const { data, error } = await supabase
    .from('contests')
    .select('position')
    .eq('parent_id', parentId)
    .order('position', { ascending: false })
    .limit(1);
  if (error) {
    if (/position|column/i.test(error.message)) return 0;
    throw new Error(error.message);
  }
  return (data?.[0]?.position ?? -1) + 1;
}

/** Переупорядочить подзадачи: orderedIds = id в новом порядке */
export async function reorderSubtasks(
  parentId: string,
  orderedIds: string[]
): Promise<void> {
  await Promise.all(
    orderedIds.map(async (id, position) => {
      const { error } = await supabase
        .from('contests')
        .update({ position })
        .eq('id', id)
        .eq('parent_id', parentId);
      if (error) throw new Error(error.message);
    })
  );
}

export async function fetchContests(filters: ContestListFilters): Promise<Contest[]> {
  let query = supabase.from('contests').select('*');

  if (filters.trash) {
    query = query.not('deleted_at', 'is', null);
  } else {
    // soft-delete: активные (колонка может отсутствовать до миграции 007)
    query = query.is('deleted_at', null);
  }

  if (filters.workspaceId) {
    query = query.eq('workspace_id', filters.workspaceId);
  }

  if (filters.parentId) {
    query = query.eq('parent_id', filters.parentId);
  } else if (filters.rootOnly !== false) {
    query = query.is('parent_id', null);
  }

  if (filters.statusFilter !== 'all') {
    query = query.eq('status', filters.statusFilter);
  } else if (filters.hideCompleted && !filters.trash) {
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

  const serverSort = filters.sortBy === 'priority' ? 'due_date' : filters.sortBy;
  query = query.order(serverSort, {
    ascending: filters.sortOrder === 'asc',
    nullsFirst: false,
  });

  const { data, error } = await query;
  if (error) {
    // Fallback без deleted_at (миграция ещё не применена)
    if (/deleted_at|column/i.test(error.message)) {
      const legacy = await fetchContestsLegacy(filters);
      if (filters.rootOnly !== false && !filters.parentId) {
        return enrichWithSubtaskMeta(legacy);
      }
      return legacy;
    }
    throw new Error(error.message);
  }

  let rows = (data ?? []).map((r) => normalizeContest(r as Record<string, unknown>));

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

  if (filters.rootOnly !== false && !filters.parentId && !filters.trash) {
    return enrichWithSubtaskMeta(rows);
  }
  return rows;
}

/** Старый API без soft-delete колонок */
async function fetchContestsLegacy(filters: ContestListFilters): Promise<Contest[]> {
  let query = supabase.from('contests').select('*');
  if (filters.parentId) query = query.eq('parent_id', filters.parentId);
  else if (filters.rootOnly !== false) query = query.is('parent_id', null);
  if (filters.statusFilter !== 'all') query = query.eq('status', filters.statusFilter);
  else if (filters.hideCompleted) query = query.not('status', 'in', '(done,cancelled)');
  if (filters.taskTypeFilter !== 'all')
    query = query.eq('task_type', filters.taskTypeFilter);
  if (filters.priorityFilter !== 'all')
    query = query.eq('priority', filters.priorityFilter);
  if (filters.searchQuery.trim())
    query = query.ilike('title', `%${filters.searchQuery.trim()}%`);
  const serverSort = filters.sortBy === 'priority' ? 'due_date' : filters.sortBy;
  query = query.order(serverSort, {
    ascending: filters.sortOrder === 'asc',
    nullsFirst: false,
  });
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => normalizeContest(r as Record<string, unknown>));
}

export async function softDeleteContest(id: string): Promise<void> {
  const { error } = await supabase
    .from('contests')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    // fallback hard delete
    if (/deleted_at|column/i.test(error.message)) {
      await deleteContest(id);
      return;
    }
    throw new Error(error.message);
  }
}

export async function restoreContest(id: string): Promise<void> {
  const { error } = await supabase
    .from('contests')
    .update({ deleted_at: null })
    .eq('id', id);
  if (error) throw new Error(error.message);
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
  const tryOrdered = await supabase
    .from('contests')
    .select('*')
    .eq('parent_id', parentId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (tryOrdered.error) {
    if (/position|column/i.test(tryOrdered.error.message)) {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => normalizeContest(r as Record<string, unknown>));
    }
    throw new Error(tryOrdered.error.message);
  }

  let rows = (tryOrdered.data ?? []).map((r) =>
    normalizeContest(r as Record<string, unknown>)
  );
  // soft-delete filter client-side if column present
  rows = rows.filter((r) => !r.deleted_at);
  return rows;
}

export async function createContest(
  input: ContestInsert,
  userId: string
): Promise<Contest> {
  let payload: ContestInsert & { user_id: string } = {
    ...input,
    user_id: userId,
  };

  if (input.parent_id && input.position == null) {
    try {
      payload = {
        ...payload,
        position: await nextSubtaskPosition(input.parent_id),
      };
    } catch {
      /* position column may be missing */
    }
  }

  const { data, error } = await supabase
    .from('contests')
    .insert(payload)
    .select()
    .single();

  if (error) {
    // retry without position if column missing
    if (/position|column/i.test(error.message) && 'position' in payload) {
      const { position: _p, ...rest } = payload as ContestInsert & {
        user_id: string;
        position?: number;
      };
      const retry = await supabase.from('contests').insert(rest).select().single();
      if (retry.error) throw new Error(retry.error.message);
      const created = normalizeContest(retry.data as Record<string, unknown>);
      if (created.parent_id) {
        try {
          await syncProgressFromSubtasks(created.parent_id);
        } catch {
          /* ignore */
        }
      }
      return created;
    }
    throw new Error(error.message);
  }

  const created = normalizeContest(data as Record<string, unknown>);
  if (created.parent_id) {
    try {
      await syncProgressFromSubtasks(created.parent_id);
    } catch {
      /* ignore */
    }
  }
  return created;
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
  const updated = normalizeContest(data as Record<string, unknown>);

  // Автопрогресс родителя при изменении подзадачи
  if (
    updated.parent_id &&
    (updates.status != null ||
      updates.progress != null ||
      updates.due_date !== undefined ||
      updates.deleted_at !== undefined)
  ) {
    try {
      await syncProgressFromSubtasks(updated.parent_id);
    } catch {
      /* ignore */
    }
  }

  return updated;
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
    completed: contests.filter((c) => !c.parent_id && c.status === 'done').length,
    overdue: contests.filter(
      (c) =>
        !c.parent_id &&
        c.due_date &&
        isBefore(new Date(c.due_date), now) &&
        c.status !== 'done' &&
        c.status !== 'cancelled'
    ).length,
    inProgress: contests.filter(
      (c) => !c.parent_id && (c.status === 'in_progress' || c.status === 'review')
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
    contests: contests.filter((c) => !c.parent_id && c.task_type === 'contest').length,
    tasks: contests.filter((c) => !c.parent_id && c.task_type !== 'contest').length,
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

/** Разбор CSV (поддерживает кавычки и ; / ,) */
export function parseCsv(text: string): string[][] {
  const cleaned = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]!;
    const next = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',' || ch === ';') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.trim());
      cell = '';
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
    } else if (ch === '\r') {
      /* skip */
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some((c) => c.length > 0)) rows.push(row);
  return rows;
}

const STATUS_SET = new Set(['todo', 'in_progress', 'review', 'done', 'cancelled']);
const TYPE_SET = new Set(['contest', 'task', 'personal', 'reminder']);
const PRIORITY_SET = new Set(['low', 'medium', 'high', 'urgent']);
const RECUR_SET = new Set(['none', 'daily', 'weekly', 'monthly']);

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\wа-яё]/gi, '');
}

/** Маппинг русских заголовков */
const HEADER_ALIASES: Record<string, string> = {
  title: 'title',
  название: 'title',
  name: 'title',
  description: 'description',
  описание: 'description',
  status: 'status',
  статус: 'status',
  task_type: 'task_type',
  type: 'task_type',
  тип: 'task_type',
  priority: 'priority',
  приоритет: 'priority',
  progress: 'progress',
  прогресс: 'progress',
  due_date: 'due_date',
  deadline: 'due_date',
  дедлайн: 'due_date',
  tags: 'tags',
  теги: 'tags',
  recurrence: 'recurrence',
  повтор: 'recurrence',
};

/**
 * CSV → ContestInsert[]
 * Минимум: колонка title / название
 */
export function csvToContestInserts(text: string): ContestInsert[] {
  const table = parseCsv(text);
  if (table.length < 2) {
    throw new Error('CSV пуст или нет строк данных');
  }

  const rawHeaders = table[0]!.map(normalizeHeader);
  const headers = rawHeaders.map((h) => HEADER_ALIASES[h] ?? h);

  const titleIdx = headers.indexOf('title');
  if (titleIdx < 0) {
    // Если нет заголовка title — считаем первую колонку названием
    // (простой импорт: одна колонка со списком задач)
  }

  const col = (name: string) => headers.indexOf(name);

  const out: ContestInsert[] = [];
  for (let r = 1; r < table.length; r++) {
    const cells = table[r]!;
    const get = (name: string) => {
      const i = col(name);
      if (i < 0) return '';
      return (cells[i] ?? '').trim();
    };

    const title =
      titleIdx >= 0 ? (cells[titleIdx] ?? '').trim() : (cells[0] ?? '').trim();
    if (!title) continue;

    const statusRaw = get('status') || 'todo';
    const typeRaw = get('task_type') || 'task';
    const prioRaw = get('priority') || 'medium';
    const recurRaw = get('recurrence') || 'none';
    const progressRaw = get('progress');
    const dueRaw = get('due_date');
    const tagsRaw = get('tags');

    const status = STATUS_SET.has(statusRaw)
      ? (statusRaw as ContestInsert['status'])
      : 'todo';
    const task_type = TYPE_SET.has(typeRaw)
      ? (typeRaw as ContestInsert['task_type'])
      : 'task';
    const priority = PRIORITY_SET.has(prioRaw)
      ? (prioRaw as ContestInsert['priority'])
      : 'medium';
    const recurrence = RECUR_SET.has(recurRaw)
      ? (recurRaw as ContestInsert['recurrence'])
      : 'none';

    let progress = progressRaw ? Number(progressRaw) : undefined;
    if (progress != null && (Number.isNaN(progress) || progress < 0)) {
      progress = undefined;
    }
    if (progress != null) progress = Math.min(100, Math.round(progress));

    let due_date: string | null = null;
    if (dueRaw) {
      const d = new Date(dueRaw);
      if (!Number.isNaN(d.getTime())) due_date = d.toISOString();
    }

    const tags = tagsRaw
      ? tagsRaw
          .split(/[|,]/)
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 12)
      : [];

    out.push({
      title: title.slice(0, 200),
      description: get('description') || null,
      status,
      task_type,
      priority,
      progress: progress ?? 0,
      due_date,
      tags,
      recurrence,
      telegram_message_links: [],
    });
  }

  if (out.length === 0) {
    throw new Error('Не найдено ни одной строки с названием задачи');
  }
  if (out.length > 200) {
    throw new Error('Слишком много строк (макс. 200 за раз)');
  }
  return out;
}

/** Пакетное создание задач */
export async function importContests(
  inserts: ContestInsert[],
  userId: string
): Promise<number> {
  const rows = inserts.map((input) => ({
    ...input,
    user_id: userId,
  }));

  // чанками по 50
  let created = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const { data, error } = await supabase.from('contests').insert(chunk).select('id');
    if (error) throw new Error(error.message);
    created += data?.length ?? chunk.length;
  }
  return created;
}
