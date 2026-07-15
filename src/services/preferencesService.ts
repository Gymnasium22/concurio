import { supabase } from '@/lib/supabase';
import type { HomeWidgetId, UserPreferences } from '@/types';
import { VISUAL_MOCK_USER } from '@/lib/visual-mock';

const DEFAULT_WIDGETS: HomeWidgetId[] = ['stats', 'deadlines', 'list', 'heatmap'];

function localKey(userId: string) {
  return `concurio-prefs-${userId}`;
}

function normalizePrefs(
  userId: string,
  raw: Partial<UserPreferences> & Record<string, unknown>
): UserPreferences {
  return {
    user_id: userId,
    widgets: (raw.widgets as HomeWidgetId[])?.length
      ? (raw.widgets as HomeWidgetId[])
      : DEFAULT_WIDGETS,
    onboarding_done: Boolean(raw.onboarding_done),
    tg_notify_enabled:
      typeof raw.tg_notify_enabled === 'boolean' ? raw.tg_notify_enabled : true,
    tg_digest_hour: typeof raw.tg_digest_hour === 'number' ? raw.tg_digest_hour : 9,
    tg_last_digest_at: (raw.tg_last_digest_at as string | null) ?? null,
    updated_at: (raw.updated_at as string) || new Date().toISOString(),
  };
}

function readLocal(userId: string): UserPreferences {
  try {
    const raw = localStorage.getItem(localKey(userId));
    if (raw) {
      const p = JSON.parse(raw);
      return normalizePrefs(userId, {
        ...p,
        onboarding_done:
          p.onboarding_done || localStorage.getItem('concurio-onboarding-done') === '1',
      });
    }
  } catch {
    /* ignore */
  }
  return normalizePrefs(userId, {
    onboarding_done: localStorage.getItem('concurio-onboarding-done') === '1',
  });
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
    return readLocal(userId);
  }

  if (error || !data) {
    return readLocal(userId);
  }

  return normalizePrefs(userId, data as Record<string, unknown>);
}

export type PreferencesPatch = Partial<
  Pick<
    UserPreferences,
    'widgets' | 'onboarding_done' | 'tg_notify_enabled' | 'tg_digest_hour'
  >
>;

export async function savePreferences(
  userId: string,
  patch: PreferencesPatch
): Promise<UserPreferences> {
  const writeLocal = () => {
    const prev = readLocal(userId);
    const next = normalizePrefs(userId, {
      ...prev,
      ...patch,
      updated_at: new Date().toISOString(),
    });
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
    if (
      /relation|does not exist|JWT|auth|row-level|column|tg_notify/i.test(error.message)
    ) {
      return writeLocal();
    }
    throw new Error(error.message);
  }

  return normalizePrefs(userId, data as Record<string, unknown>);
}

/** Запросить дайджест в Telegram (edge telegram-bot) */
export async function requestTelegramDigest(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Нужно войти в аккаунт');
  }

  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  if (!base) throw new Error('Не задан VITE_SUPABASE_URL');

  const res = await fetch(`${base}/functions/v1/telegram-bot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify({ action: 'digest_me' }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    ok?: boolean;
  };
  if (!res.ok) {
    throw new Error(body.error || `Ошибка ${res.status}`);
  }
}
