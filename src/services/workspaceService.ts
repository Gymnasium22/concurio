/**
 * Workspace: создание, участники, инвайты
 */
import { supabase } from '@/lib/supabase';
import type { Workspace, WorkspaceInvite, WorkspaceMember, WorkspaceRole } from '@/types';

export async function fetchMyWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    if (/relation|does not exist|workspaces/i.test(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as Workspace[];
}

export async function createWorkspace(name: string, userId: string): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .insert({ name: name.trim(), owner_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await supabase.from('workspace_members').insert({
    workspace_id: data.id,
    user_id: userId,
    role: 'owner' as WorkspaceRole,
  });

  return data as Workspace;
}

export async function fetchMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId);
  if (error) throw new Error(error.message);
  return (data ?? []) as WorkspaceMember[];
}

export async function createInvite(
  workspaceId: string,
  userId: string,
  role: 'member' | 'viewer' = 'member',
  email?: string
): Promise<WorkspaceInvite> {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const expires_at = new Date(Date.now() + 7 * 86400000).toISOString();
  const { data, error } = await supabase
    .from('workspace_invites')
    .insert({
      workspace_id: workspaceId,
      token,
      role,
      email: email?.trim() || null,
      created_by: userId,
      expires_at,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as WorkspaceInvite;
}

export async function acceptInvite(token: string, userId: string): Promise<void> {
  const { data: inv, error } = await supabase
    .from('workspace_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!inv) throw new Error('Приглашение не найдено');
  if (inv.accepted_at) throw new Error('Уже принято');
  if (new Date(inv.expires_at) < new Date()) throw new Error('Срок истёк');

  const { error: mErr } = await supabase.from('workspace_members').upsert({
    workspace_id: inv.workspace_id,
    user_id: userId,
    role: inv.role,
  });
  if (mErr) throw new Error(mErr.message);

  await supabase
    .from('workspace_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', inv.id);
}

export async function fetchWorkspaceActivity(workspaceId: string, limit = 40) {
  // activity через contests в workspace
  const { data: contests, error: cErr } = await supabase
    .from('contests')
    .select('id')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .limit(200);
  if (cErr) throw new Error(cErr.message);
  const ids = (contests ?? []).map((c) => c.id);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .in('contest_id', ids)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
