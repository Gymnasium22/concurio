/**
 * Telegram bot: webhook + дайджест «что делать»
 *
 * Secrets: TELEGRAM_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: TELEGRAM_WEBHOOK_SECRET, CRON_SECRET, MINI_APP_URL
 *
 * Webhook: POST update from Telegram
 * App:    POST { action: "digest_me" } + Authorization: Bearer <user jwt>
 * Cron:   POST { action: "digest_all" } + header x-cron-secret
 */
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret, x-telegram-bot-api-secret-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ContestRow = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  parent_id: string | null;
  deleted_at: string | null;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function env(name: string): string {
  return Deno.env.get(name)?.trim() || '';
}

function adminClient() {
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL / SERVICE_ROLE missing');
  return createClient(url, key);
}

async function tgApi(method: string, body: Record<string, unknown>) {
  const token = env('TELEGRAM_BOT_TOKEN');
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN missing');
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error('tgApi error', method, data);
  }
  return data;
}

function miniAppBase(): string {
  return (
    env('MINI_APP_URL') ||
    env('SHARE_APP_BASE_URL') ||
    'https://gymnasium22.github.io/concurio/'
  ).replace(/\/?$/, '/');
}

function botUsername(): string {
  return (env('TELEGRAM_BOT_USERNAME') || 'concurio_bot').replace(/^@/, '');
}

function openAppKeyboard(contests?: ContestRow[]) {
  const bot = botUsername();
  const rows: { text: string; url: string }[][] = [];
  for (const c of (contests ?? []).slice(0, 3)) {
    const title =
      c.title.length > 36 ? `${c.title.slice(0, 34)}…` : c.title;
    rows.push([
      {
        text: `→ ${title}`,
        url: `https://t.me/${bot}/app?startapp=contest_${c.id}`,
      },
    ]);
  }
  rows.push([
    {
      text: '📱 Открыть Concurio',
      url: `https://t.me/${bot}/app`,
    },
  ]);
  return { inline_keyboard: rows };
}

function isOpen(c: ContestRow): boolean {
  return (
    !c.deleted_at &&
    c.status !== 'done' &&
    c.status !== 'cancelled' &&
    !c.parent_id
  );
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function bucket(contests: ContestRow[]) {
  const now = new Date();
  const weekEnd = new Date(startOfDay(now));
  weekEnd.setDate(weekEnd.getDate() + 7);

  const overdue: ContestRow[] = [];
  const today: ContestRow[] = [];
  const review: ContestRow[] = [];
  const soon: ContestRow[] = [];

  for (const c of contests.filter(isOpen)) {
    if (c.status === 'review') review.push(c);
    if (!c.due_date) continue;
    const d = new Date(c.due_date);
    if (d < startOfDay(now) && !isSameDay(d, now)) overdue.push(c);
    else if (isSameDay(d, now)) today.push(c);
    else if (d > now && d < weekEnd) soon.push(c);
  }

  const byDue = (a: ContestRow, b: ContestRow) =>
    new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime();
  overdue.sort(byDue);
  today.sort(byDue);
  soon.sort(byDue);

  return { overdue, today, review, soon };
}

function lineList(items: ContestRow[], limit = 5): string {
  if (items.length === 0) return '—';
  return items
    .slice(0, limit)
    .map((c) => {
      const due = c.due_date
        ? new Date(c.due_date).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
          })
        : '';
      return `• ${c.title}${due ? ` (${due})` : ''}`;
    })
    .join('\n') + (items.length > limit ? `\n…ещё ${items.length - limit}` : '');
}

function buildDigestText(contests: ContestRow[], name?: string): string {
  const b = bucket(contests);
  const hi = name ? `Привет, ${name}!\n\n` : '';
  const total =
    b.overdue.length + b.today.length + b.review.length + b.soon.length;

  if (total === 0) {
    return (
      hi +
      '☀️ *Дайджест Concurio*\n\n' +
      'Сейчас спокойно — нет горящих дедлайнов.\n' +
      'Можно завести новый конкурс по шаблону в приложении.'
    );
  }

  const parts = [
    hi + '📋 *Дайджест Concurio*',
    '',
    b.overdue.length
      ? `🔴 *Просрочено (${b.overdue.length})*\n${lineList(b.overdue)}`
      : null,
    b.today.length
      ? `🔥 *Сегодня (${b.today.length})*\n${lineList(b.today)}`
      : null,
    b.review.length
      ? `👁 *На проверке (${b.review.length})*\n${lineList(b.review)}`
      : null,
    b.soon.length
      ? `🗓 *Скоро (${b.soon.length})*\n${lineList(b.soon)}`
      : null,
    '',
    '_Откройте приложение, чтобы отметить этапы._',
  ].filter(Boolean);

  return parts.join('\n');
}

async function loadUserContests(userId: string): Promise<ContestRow[]> {
  const sb = adminClient();
  const { data, error } = await sb
    .from('contests')
    .select('id,title,status,due_date,parent_id,deleted_at')
    .eq('user_id', userId)
    .is('parent_id', null);

  if (error) {
    // fallback without deleted_at
    if (/deleted_at|column/i.test(error.message)) {
      const fb = await sb
        .from('contests')
        .select('id,title,status,due_date,parent_id')
        .eq('user_id', userId)
        .is('parent_id', null);
      if (fb.error) throw new Error(fb.error.message);
      return (fb.data ?? []).map((r) => ({
        ...(r as ContestRow),
        deleted_at: null,
      }));
    }
    throw new Error(error.message);
  }
  return (data ?? []) as ContestRow[];
}

async function resolveUserIdByTelegram(
  telegramId: number
): Promise<string | null> {
  const sb = adminClient();
  const { data } = await sb
    .from('telegram_identities')
    .select('user_id')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function isNotifyEnabled(userId: string): Promise<boolean> {
  const sb = adminClient();
  const { data } = await sb
    .from('user_preferences')
    .select('tg_notify_enabled')
    .eq('user_id', userId)
    .maybeSingle();
  // default true if no row / column missing
  if (data == null) return true;
  if (typeof data.tg_notify_enabled === 'boolean') return data.tg_notify_enabled;
  return true;
}

async function markDigestSent(userId: string) {
  const sb = adminClient();
  await sb.from('user_preferences').upsert(
    {
      user_id: userId,
      tg_last_digest_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
}

async function sendDigestToTelegram(
  chatId: number,
  userId: string,
  firstName?: string
) {
  const contests = await loadUserContests(userId);
  const text = buildDigestText(contests, firstName);
  const b = bucket(contests);
  const hotList = [...b.overdue, ...b.today, ...b.review].slice(0, 3);
  await tgApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    reply_markup: openAppKeyboard(hotList.length ? hotList : contests.filter(isOpen).slice(0, 3)),
    disable_web_page_preview: true,
  });
  try {
    await markDigestSent(userId);
  } catch (e) {
    console.warn('markDigestSent', e);
  }
}

async function handleTelegramUpdate(update: Record<string, unknown>) {
  const message = update.message as
    | {
        chat?: { id?: number };
        from?: { id?: number; first_name?: string };
        text?: string;
      }
    | undefined;

  if (!message?.chat?.id || !message.from?.id) {
    return json({ ok: true, skipped: true });
  }

  const chatId = message.chat.id;
  const tgId = message.from.id;
  const text = (message.text || '').trim();
  const cmd = text.split(/\s+/)[0]?.toLowerCase().replace(/@\w+$/, '') || '';

  if (cmd === '/start' || cmd === '/help') {
    await tgApi('sendMessage', {
      chat_id: chatId,
      text:
        '👋 *Concurio* — пульт конкурсов и задач.\n\n' +
        'Команды:\n' +
        '/today — дайджест (просрочено / сегодня / проверка)\n' +
        '/hot — только горящее\n' +
        '/help — справка\n\n' +
        'Чтобы бот знал ваши задачи, один раз войдите в Mini App через этого бота.',
      parse_mode: 'Markdown',
      reply_markup: openAppKeyboard(),
    });
    return json({ ok: true });
  }

  const userId = await resolveUserIdByTelegram(tgId);
  if (!userId) {
    await tgApi('sendMessage', {
      chat_id: chatId,
      text:
        'Сначала откройте приложение и войдите — так аккаунт свяжется с Telegram.\n\n' +
        'После входа снова напишите /today',
      reply_markup: openAppKeyboard(),
    });
    return json({ ok: true, linked: false });
  }

  if (cmd === '/today' || cmd === '/digest') {
    await sendDigestToTelegram(chatId, userId, message.from.first_name);
    return json({ ok: true, action: 'today' });
  }

  if (cmd === '/hot') {
    const contests = await loadUserContests(userId);
    const b = bucket(contests);
    const hot = [...b.overdue, ...b.today];
    const textMsg =
      hot.length === 0
        ? '🔥 Сейчас ничего не горит.'
        : `🔥 *Горящее (${hot.length})*\n\n${lineList(hot, 10)}`;
    await tgApi('sendMessage', {
      chat_id: chatId,
      text: textMsg,
      parse_mode: 'Markdown',
      reply_markup: openAppKeyboard(hot),
    });
    return json({ ok: true, action: 'hot' });
  }

  // any other text → short tip
  await tgApi('sendMessage', {
    chat_id: chatId,
    text: 'Напишите /today для дайджеста или откройте приложение.',
    reply_markup: openAppKeyboard(),
  });
  return json({ ok: true });
}

async function handleDigestMe(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401);
  }
  const jwt = authHeader.slice(7);
  const sbUser = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY') || env('SUPABASE_SERVICE_ROLE_KEY'), {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const {
    data: { user },
    error,
  } = await sbUser.auth.getUser(jwt);
  if (error || !user) return json({ error: 'Unauthorized' }, 401);

  const sb = adminClient();
  const { data: ident } = await sb
    .from('telegram_identities')
    .select('telegram_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!ident?.telegram_id) {
    return json(
      {
        error:
          'Telegram не привязан. Войдите через Mini App или привяжите в профиле.',
      },
      400
    );
  }

  await sendDigestToTelegram(
    Number(ident.telegram_id),
    user.id,
    (user.user_metadata?.first_name as string) || undefined
  );
  return json({ ok: true, sent: true });
}

function isServiceRoleAuth(req: Request): boolean {
  const auth = req.headers.get('Authorization') || '';
  const header = req.headers.get('x-cron-secret') || '';
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceKey && (auth === `Bearer ${serviceKey}` || header === serviceKey)) {
    return true;
  }
  if (!auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

async function handleDigestAll(req: Request) {
  const secret = env('CRON_SECRET');
  const header = req.headers.get('x-cron-secret') || '';

  const okCron = Boolean(secret && header === secret);
  const okService = isServiceRoleAuth(req);

  if (!okCron && !okService) {
    return json({ error: 'Forbidden' }, 403);
  }

  const sb = adminClient();
  const { data: identities, error } = await sb
    .from('telegram_identities')
    .select('telegram_id,user_id');
  if (error) return json({ error: error.message }, 500);

  let sent = 0;
  let skipped = 0;
  const hourUtc = new Date().getUTCHours();

  for (const row of identities ?? []) {
    const userId = row.user_id as string;
    const tgId = Number(row.telegram_id);

    const { data: pref } = await sb
      .from('user_preferences')
      .select('tg_notify_enabled,tg_digest_hour,tg_last_digest_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (pref && pref.tg_notify_enabled === false) {
      skipped++;
      continue;
    }

    const wantHour =
      typeof pref?.tg_digest_hour === 'number' ? pref.tg_digest_hour : 9;
    // если вызывают не «в свой час» — всё равно шлём при ручном cron без фильтра?
    // Для cron каждый час: только совпадение часа UTC
    if (req.headers.get('x-cron-hourly') === '1' && wantHour !== hourUtc) {
      skipped++;
      continue;
    }

    // не чаще 1 раза в 20 часов
    if (pref?.tg_last_digest_at) {
      const last = new Date(pref.tg_last_digest_at).getTime();
      if (Date.now() - last < 20 * 60 * 60 * 1000) {
        skipped++;
        continue;
      }
    }

    try {
      await sendDigestToTelegram(tgId, userId);
      sent++;
    } catch (e) {
      console.error('digest user', userId, e);
    }
  }

  return json({ ok: true, sent, skipped });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'POST only' }, 405);
  }

  try {
    // Telegram webhook secret (optional)
    const whSecret = env('TELEGRAM_WEBHOOK_SECRET');
    const whHeader = req.headers.get('x-telegram-bot-api-secret-token');

    const raw = await req.text();
    let body: Record<string, unknown> = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    // App / cron actions
    if (body.action === 'digest_me') {
      return await handleDigestMe(req.headers.get('Authorization'));
    }
    if (body.action === 'digest_all') {
      return await handleDigestAll(req);
    }
    if (body.action === 'setup_webhook') {
      if (!isServiceRoleAuth(req)) {
        return json({ error: 'Forbidden' }, 403);
      }
      const base = env('SUPABASE_URL').replace(/\/$/, '');
      const hookUrl = `${base}/functions/v1/telegram-bot`;
      const secret = env('TELEGRAM_WEBHOOK_SECRET');
      const payload: Record<string, unknown> = {
        url: hookUrl,
        allowed_updates: ['message'],
        drop_pending_updates: true,
      };
      if (secret) payload.secret_token = secret;
      const result = await tgApi('setWebhook', payload);
      const info = await tgApi('getWebhookInfo', {});
      return json({ ok: true, setWebhook: result, webhookInfo: info, hookUrl });
    }

    // Telegram update (has update_id)
    if (typeof body.update_id === 'number' || body.message || body.callback_query) {
      if (whSecret && whHeader !== whSecret) {
        return json({ error: 'Bad webhook secret' }, 401);
      }
      return await handleTelegramUpdate(body);
    }

    return json({ error: 'Unknown payload' }, 400);
  } catch (e) {
    console.error(e);
    return json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      500
    );
  }
});
