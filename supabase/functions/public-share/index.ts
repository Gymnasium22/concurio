/**
 * Публичный share: данные + signed URLs для вложений (без логина).
 * verify_jwt = false
 */
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, error: 'Server not configured' }, 500);
  }

  let token = '';
  if (req.method === 'GET') {
    token = new URL(req.url).searchParams.get('token')?.trim() || '';
  } else if (req.method === 'POST') {
    try {
      const body = await req.json();
      token = String(body?.token || '').trim();
    } catch {
      return json({ ok: false, error: 'Invalid JSON' }, 400);
    }
  } else {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  if (!token || token.length < 8) {
    return json({ ok: false, error: 'invalid_token' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.rpc('get_public_share', {
    p_token: token,
  });

  if (error) {
    console.error('get_public_share', error);
    return json({ ok: false, error: error.message }, 500);
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    share?: Record<string, unknown>;
    contests?: unknown[];
    checklists?: unknown[];
    attachments?: Array<{
      id: string;
      contest_id: string;
      file_name: string;
      file_type: string;
      file_size: number | null;
      file_path: string;
      created_at: string;
    }>;
  };

  if (!payload?.ok) {
    return json(payload || { ok: false, error: 'not_found' }, 404);
  }

  // Signed URLs для вложений (1 час)
  const attachments = payload.attachments || [];
  const withUrls = await Promise.all(
    attachments.map(async (a) => {
      const { data: signed } = await admin.storage
        .from('attachments')
        .createSignedUrl(a.file_path, 3600);
      return {
        id: a.id,
        contest_id: a.contest_id,
        file_name: a.file_name,
        file_type: a.file_type,
        file_size: a.file_size,
        created_at: a.created_at,
        url: signed?.signedUrl ?? null,
      };
    })
  );

  return json({
    ok: true,
    share: payload.share,
    contests: payload.contests || [],
    checklists: payload.checklists || [],
    attachments: withUrls,
  });
});
