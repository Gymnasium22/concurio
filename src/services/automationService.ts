/**
 * Правила: автотеги / автостатус
 */
import { supabase } from '@/lib/supabase';
import type { AutomationRule, Contest, ContestInsert, ContestUpdate } from '@/types';

export async function fetchAutomationRules(): Promise<AutomationRule[]> {
  const { data, error } = await supabase
    .from('automation_rules')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    if (/relation|does not exist|automation_rules/i.test(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(normalizeRule);
}

function normalizeRule(row: Record<string, unknown>): AutomationRule {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    workspace_id: (row.workspace_id as string | null) ?? null,
    name: (row.name as string) || 'Правило',
    enabled: Boolean(row.enabled),
    trigger_on: (row.trigger_on as AutomationRule['trigger_on']) || 'on_create',
    conditions: (row.conditions as AutomationRule['conditions']) || {},
    actions: (row.actions as AutomationRule['actions']) || {},
    created_at: row.created_at as string,
  };
}

export async function createAutomationRule(
  input: Omit<AutomationRule, 'id' | 'user_id' | 'created_at'>,
  userId: string
): Promise<AutomationRule> {
  const { data, error } = await supabase
    .from('automation_rules')
    .insert({
      user_id: userId,
      name: input.name,
      enabled: input.enabled,
      trigger_on: input.trigger_on,
      conditions: input.conditions,
      actions: input.actions,
      workspace_id: input.workspace_id,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return normalizeRule(data as Record<string, unknown>);
}

export async function deleteAutomationRule(id: string): Promise<void> {
  const { error } = await supabase.from('automation_rules').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

function matches(
  rule: AutomationRule,
  draft: Partial<Contest> & { title?: string }
): boolean {
  if (!rule.enabled) return false;
  const c = rule.conditions || {};
  if (c.title_contains) {
    const t = (draft.title || '').toLowerCase();
    if (!t.includes(c.title_contains.toLowerCase())) return false;
  }
  if (c.task_type && draft.task_type && draft.task_type !== c.task_type) return false;
  if (c.priority && draft.priority && draft.priority !== c.priority) return false;
  if (c.tag) {
    const tags = draft.tags || [];
    if (!tags.map((x) => x.toLowerCase()).includes(c.tag.toLowerCase())) return false;
  }
  return true;
}

/** Правило workspace: null = глобально; иначе только задачи этого workspace */
function ruleAppliesToWorkspace(
  rule: AutomationRule,
  workspaceId: string | null | undefined
): boolean {
  if (rule.workspace_id == null) return true;
  return rule.workspace_id === (workspaceId ?? null);
}

/** Применить правила к insert-данным */
export function applyRulesToInsert(
  rules: AutomationRule[],
  input: ContestInsert,
  trigger: AutomationRule['trigger_on'] = 'on_create'
): ContestInsert {
  const next = { ...input };
  for (const rule of rules) {
    if (rule.trigger_on !== trigger) continue;
    if (!ruleAppliesToWorkspace(rule, next.workspace_id)) continue;
    if (!matches(rule, next)) continue;
    const a = rule.actions || {};
    if (a.add_tags?.length) {
      const tags = new Set([...(next.tags || []), ...a.add_tags]);
      next.tags = [...tags];
    }
    if (a.set_status) next.status = a.set_status;
    if (a.set_priority) next.priority = a.set_priority;
  }
  return next;
}

export function applyRulesToUpdate(
  rules: AutomationRule[],
  current: Contest,
  updates: ContestUpdate
): ContestUpdate {
  const next = { ...updates };
  const merged = { ...current, ...updates };
  for (const rule of rules) {
    if (rule.trigger_on !== 'on_update' && rule.trigger_on !== 'on_status') continue;
    if (rule.trigger_on === 'on_status' && updates.status == null) continue;
    if (!ruleAppliesToWorkspace(rule, merged.workspace_id)) continue;
    if (!matches(rule, merged)) continue;
    const a = rule.actions || {};
    if (a.add_tags?.length) {
      const tags = new Set([...(merged.tags || []), ...a.add_tags]);
      next.tags = [...tags];
    }
    if (a.set_status && updates.status == null) next.status = a.set_status;
    if (a.set_priority) next.priority = a.set_priority;
  }
  return next;
}
