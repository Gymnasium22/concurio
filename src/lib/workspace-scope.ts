/**
 * Область задач: все / личные / конкретный workspace
 */
export type WorkspaceScope = 'all' | 'personal' | (string & {});

export function isWorkspaceUuid(
  scope: WorkspaceScope | null | undefined
): scope is string {
  return Boolean(scope && scope !== 'all' && scope !== 'personal');
}

export function workspaceScopeLabel(
  scope: WorkspaceScope | null | undefined,
  workspaces?: { id: string; name: string }[]
): string {
  if (!scope || scope === 'personal') return 'Личное';
  if (scope === 'all') return 'Все';
  return workspaces?.find((w) => w.id === scope)?.name ?? 'Команда';
}

/** Нормализация из localStorage (раньше null = личное) */
export function normalizeWorkspaceScope(raw: unknown): WorkspaceScope {
  if (raw === 'all') return 'all';
  if (raw === 'personal' || raw == null || raw === '') return 'personal';
  if (typeof raw === 'string' && raw.length > 0) return raw;
  return 'personal';
}
