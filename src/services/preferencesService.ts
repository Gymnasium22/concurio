import { supabase } from '@/lib/supabase';
import type { HomeWidgetId, UserPreferences } from '@/types';

const DEFAULT_WIDGETS: HomeWidgetId[] = ['stats', 'deadlines', 'list', 'heatmap'];

export async function fetchPreferences(userId: string): Promise<UserPreferences> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && !/relation|does not exist/i.test(error.message)) {
    throw new Error(error.message);
  }

  if (!data) {
    return {
      user_id: userId,
      widgets: DEFAULT_WIDGETS,
      onboarding_done: false,
      updated_at: new Date().toISOString(),
    };
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
    // local fallback when table missing
    if (/relation|does not exist/i.test(error.message)) {
      const key = `concurio-prefs-${userId}`;
      const prev = JSON.parse(localStorage.getItem(key) || '{}');
      const next = {
        user_id: userId,
        widgets: patch.widgets ?? prev.widgets ?? DEFAULT_WIDGETS,
        onboarding_done: patch.onboarding_done ?? prev.onboarding_done ?? false,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(next));
      return next as UserPreferences;
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
