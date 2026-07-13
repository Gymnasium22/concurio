import { supabase } from '@/lib/supabase';
import type { HomeWidgetId, UserPreferences } from '@/types';
import { VISUAL_MOCK_USER } from '@/lib/visual-mock';

const DEFAULT_WIDGETS: HomeWidgetId[] = ['stats', 'deadlines', 'list', 'heatmap'];

function localKey(userId: string) {
  return `concurio-prefs-${userId}`;
}

function readLocal(userId: string): UserPreferences {
  try {
    const raw = localStorage.getItem(localKey(userId));
    if (raw) {
      const p = JSON.parse(raw);
      return {
        user_id: userId,
        widgets: p.widgets?.length ? p.widgets : DEFAULT_WIDGETS,
        onboarding_done: Boolean(
          p.onboarding_done || localStorage.getItem('concurio-onboarding-done') === '1'
        ),
        updated_at: p.updated_at || new Date().toISOString(),
      };
    }
  } catch {
    /* ignore */
  }
  return {
    user_id: userId,
    widgets: DEFAULT_WIDGETS,
    onboarding_done: localStorage.getItem('concurio-onboarding-done') === '1',
    updated_at: new Date().toISOString(),
  };
}

export async function fetchPreferences(userId: string): Promise<UserPreferences> {
  if (VISUAL_MOCK_USER || userId.startsWith('00000000') || userId === 'local') {
    return readLocal(userId);
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && !/relation|does not exist|JWT|auth/i.test(error.message)) {
    // soft fail → local
    return readLocal(userId);
  }

  if (error || !data) {
    return readLocal(userId);
  }

  return {
    user_id: data.user_id,
    widgets: (data.widgets as HomeWidgetId[])?.length
      ? (data.widgets as HomeWidgetId[])
      : DEFAULT_WIDGETS,
    onboarding_done: Boolean(data.onboarding_done),
    updated_at: data.updated_at,
  };
}

export async function savePreferences(
  userId: string,
  patch: Partial<Pick<UserPreferences, 'widgets' | 'onboarding_done'>>
): Promise<UserPreferences> {
  const writeLocal = () => {
    const prev = readLocal(userId);
    const next: UserPreferences = {
      user_id: userId,
      widgets: patch.widgets ?? prev.widgets ?? DEFAULT_WIDGETS,
      onboarding_done: patch.onboarding_done ?? prev.onboarding_done ?? false,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(localKey(userId), JSON.stringify(next));
    if (next.onboarding_done) {
      localStorage.setItem('concurio-onboarding-done', '1');
    }
    return next;
  };

  if (VISUAL_MOCK_USER || userId.startsWith('00000000') || userId === 'local') {
    return writeLocal();
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    if (/relation|does not exist|JWT|auth|row-level/i.test(error.message)) {
      return writeLocal();
    }
    throw new Error(error.message);
  }

  return {
    user_id: data.user_id,
    widgets: data.widgets as HomeWidgetId[],
    onboarding_done: Boolean(data.onboarding_done),
    updated_at: data.updated_at,
  };
}
