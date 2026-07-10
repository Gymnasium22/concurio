/**
 * Общий доступ: создание ссылок владельцем + загрузка публичного бандла
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ShareLinkRow {
  id: string;
  token: string;
  title: string | null;
  contest_ids: string[];
  access_mode: string;
  expires_at: string | null;
  revoked_at: string | null;
  view_count: number;
  created_at: string;
}

export interface PublicShareBundle {
  ok: boolean;
  error?: string;
  share?: {
    title: string;
    access_mode: string;
    expires_at: string | null;
    created_at: string;
    task_count: number;
  };
  contests?: Array<Record<string, unknown>>;
  checklists?: Array<{
    contest_id: string;
    items: Array<{
      id: string;
      title: string;
      is_done: boolean;
      position: number;
    }>;
  }>;
  attachments?: Array<{
    id: string;
    contest_id: string;
    file_name: string;
    file_type: string;
    file_size: number | null;
    created_at: string;
    url?: string | null;
  }>;
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Базовый URL приложения на проде (GitHub Pages) */
export function getPublicAppBase(): string {
  const env = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim();
  if (env) return env.replace(/\/?$/, '/');

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // На localhost шарим прод-ссылку, иначе получатель увидит 404
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'https://gymnasium22.github.io/concurio/';
    }
    const base = import.meta.env.BASE_URL || '/';
    return `${window.location.origin}${base.replace(/\/?$/, '/')}`;
  }

  return 'https://gymnasium22.github.io/concurio/';
}

/** Прямая ссылка на SPA (/share/token) — работает после 404.html на GH Pages */
export function buildShareAppUrl(token: string): string {
  return `${getPublicAppBase()}share/${token}`;
}

/**
 * Ссылка для отправки в мессенджеры:
 * Edge Function отдаёт Open Graph превью и редиректит в приложение.
 */
export function buildShareUrl(token: string): string {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(
    /\/$/,
    ''
  );
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1/share-preview?t=${encodeURIComponent(token)}`;
  }
  return buildShareAppUrl(token);
}

export function useMyShareLinks() {
  return useQuery({
    queryKey: ['share-links'],
    queryFn: async (): Promise<ShareLinkRow[]> => {
      const { data, error } = await supabase
        .from('share_links')
        .select('*')
        .is('revoked_at', null)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as ShareLinkRow[];
    },
  });
}

export function useCreateShareLink() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      contestIds: string[];
      title?: string;
      expiresInDays?: number | null;
    }) => {
      // getSession — локально, не бьёт /auth/v1/user (getUser при 403 сбрасывал сессию)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Нужна авторизация. Войдите снова.');
      if (!input.contestIds.length) {
        throw new Error('Выберите хотя бы одну задачу');
      }

      const token = randomToken();
      const expires_at =
        input.expiresInDays && input.expiresInDays > 0
          ? new Date(
              Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000
            ).toISOString()
          : null;

      const { data, error } = await supabase
        .from('share_links')
        .insert({
          token,
          owner_id: user.id,
          title: input.title?.trim() || null,
          contest_ids: input.contestIds,
          access_mode: 'view',
          expires_at,
        })
        .select()
        .single();

      if (error) {
        // Понятная ошибка вместо «разлогина»
        if (error.code === '42501' || error.message.includes('policy')) {
          throw new Error(
            'Нет прав на создание ссылки. Обновите страницу и войдите снова.'
          );
        }
        if (error.message.includes('share_links') || error.code === '42P01') {
          throw new Error(
            'Таблица share_links не найдена. Примените миграции Supabase.'
          );
        }
        throw new Error(error.message);
      }
      return {
        link: data as ShareLinkRow,
        url: buildShareUrl(token),
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['share-links'] });
    },
  });
}

export function useRevokeShareLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('share_links')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['share-links'] });
    },
  });
}

/** Публичная загрузка (anon) через Edge Function + fallback RPC */
export async function fetchPublicShare(token: string): Promise<PublicShareBundle> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // 1) Edge function (signed file URLs)
  if (url && anon) {
    try {
      const res = await fetch(`${url}/functions/v1/public-share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anon,
          Authorization: `Bearer ${anon}`,
        },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json()) as PublicShareBundle;
      if (json?.ok) return json;
      if (res.status !== 404 && json?.error) return json;
    } catch {
      /* fallback */
    }
  }

  // 2) RPC напрямую
  const { data, error } = await supabase.rpc('get_public_share', {
    p_token: token,
  });
  if (error) throw new Error(error.message);
  return data as PublicShareBundle;
}
