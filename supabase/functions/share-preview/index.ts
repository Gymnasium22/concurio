/**
 * HTML-превью ссылки (Open Graph / Telegram) + редирект в приложение.
 * GET ?t=TOKEN
 * verify_jwt = false
 */
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function htmlPage(opts: {
  title: string;
  description: string;
  appUrl: string;
  siteName?: string;
}): Response {
  const title = escapeHtml(opts.title);
  const description = escapeHtml(opts.description);
  const appUrl = escapeHtml(opts.appUrl);
  const site = escapeHtml(opts.siteName || 'Concurio');

  const body = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${site}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${appUrl}" />
  <meta property="og:locale" content="ru_RU" />

  <!-- Twitter / Telegram -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />

  <meta http-equiv="refresh" content="0;url=${appUrl}" />
  <link rel="canonical" href="${appUrl}" />
  <style>
    body { font-family: system-ui, sans-serif; background: #0c0c14; color: #eee;
      display: flex; min-height: 100vh; align-items: center; justify-content: center;
      margin: 0; padding: 24px; text-align: center; }
    a { color: #a78bfa; }
    .card { max-width: 420px; }
    h1 { font-size: 1.25rem; margin: 0 0 8px; }
    p { opacity: 0.75; font-size: 0.9rem; line-height: 1.45; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${description}</p>
    <p><a href="${appUrl}">Открыть в Concurio →</a></p>
  </div>
  <script>location.replace(${JSON.stringify(opts.appUrl)});</script>
</body>
</html>`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      ...CORS,
    },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  const url = new URL(req.url);
  const token = (url.searchParams.get('t') || url.searchParams.get('token') || '').trim();

  const appBase = (
    Deno.env.get('SHARE_APP_BASE_URL') ||
    'https://gymnasium22.github.io/concurio'
  ).replace(/\/$/, '');

  if (!token || token.length < 8) {
    return htmlPage({
      title: 'Concurio — ссылка недействительна',
      description: 'Токен доступа отсутствует или слишком короткий.',
      appUrl: appBase + '/',
    });
  }

  const appUrl = `${appBase}/share/${encodeURIComponent(token)}`;

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceKey) {
    return htmlPage({
      title: 'Concurio — общий доступ',
      description: 'Откройте ссылку, чтобы посмотреть задачи.',
      appUrl,
    });
  }

  try {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin.rpc('get_public_share', {
      p_token: token,
    });

    if (error || !data?.ok) {
      const err = data?.error || error?.message || 'not_found';
      const map: Record<string, string> = {
        not_found: 'Ссылка не найдена',
        revoked: 'Ссылка отозвана владельцем',
        expired: 'Срок действия ссылки истёк',
        empty: 'В подборке нет задач',
        invalid_token: 'Некорректная ссылка',
      };
      return htmlPage({
        title: 'Concurio — недоступно',
        description: map[err] || String(err),
        appUrl: appBase + '/',
      });
    }

    const shareTitle = (data.share?.title as string) || 'Общий доступ';
    const count = Number(data.share?.task_count ?? data.contests?.length ?? 0);
    const contests = (data.contests || []) as Array<{ title?: string; status?: string }>;
    const names = contests
      .slice(0, 3)
      .map((c) => c.title)
      .filter(Boolean)
      .join(' · ');

    const description =
      count > 0
        ? `${count} ${count === 1 ? 'задача' : count < 5 ? 'задачи' : 'задач'} для просмотра` +
          (names ? `: ${names}` : '') +
          (count > 3 ? '…' : '') +
          '. Без регистрации, только просмотр.'
        : 'Подборка задач Concurio. Только просмотр.';

    return htmlPage({
      title: `${shareTitle} · Concurio`,
      description: description.slice(0, 200),
      appUrl,
    });
  } catch (e) {
    console.error(e);
    return htmlPage({
      title: 'Concurio — общий доступ',
      description: 'Откройте ссылку, чтобы посмотреть задачи.',
      appUrl,
    });
  }
});
