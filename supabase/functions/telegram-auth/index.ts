import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

interface TelegramAuthRequest {
  initData: string;
  bindToUserId?: string;
  linkToken?: string;
}

interface TelegramUserPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

/** Web Crypto HMAC-SHA256 → ArrayBuffer */
async function hmac(
  key: ArrayBuffer | Uint8Array | string,
  data: string
): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const keyData =
    typeof key === 'string'
      ? enc.encode(key)
      : key instanceof Uint8Array
        ? key
        : new Uint8Array(key);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Telegram Mini App validation.
 * Пробуем несколько вариантов data-check-string (с/без signature),
 * т.к. клиенты Telegram и libs расходятся с docs.
 *
 * secret_key = HMAC_SHA256(key="WebAppData", data=bot_token)
 * hash = hex(HMAC_SHA256(key=secret_key, data=data_check_string))
 *
 * Как @telegram-apps/init-data-node: createHmac(data, key) =
 *   node createHmac('sha256', key).update(data)
 */
async function validateInitData(
  initData: string,
  botToken: string
): Promise<{
  valid: boolean;
  data: Record<string, string>;
  error?: string;
  debug?: Record<string, unknown>;
}> {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) {
    return { valid: false, data: {}, error: 'Missing hash in initData' };
  }

  // Все поля кроме hash (для ответа user берём без signature)
  const allExceptHash: Record<string, string> = {};
  const withoutSignature: Record<string, string> = {};
  params.forEach((value, key) => {
    if (key === 'hash') return;
    allExceptHash[key] = value;
    if (key !== 'signature') {
      withoutSignature[key] = value;
    }
  });

  const buildCheck = (fields: Record<string, string>) =>
    Object.keys(fields)
      .sort()
      .map((k) => `${k}=${fields[k]}`)
      .join('\n');

  // Как в @telegram-apps: hashToken = HMAC(key=WebAppData, data=token)
  const secretKey = await hmac('WebAppData', botToken);
  const secretAlt = await hmac(botToken, 'WebAppData');

  const candidates: { name: string; check: string; secret: ArrayBuffer }[] = [
    { name: 'no-sig+WebAppData', check: buildCheck(withoutSignature), secret: secretKey },
    { name: 'with-sig+WebAppData', check: buildCheck(allExceptHash), secret: secretKey },
    { name: 'no-sig+alt', check: buildCheck(withoutSignature), secret: secretAlt },
    { name: 'with-sig+alt', check: buildCheck(allExceptHash), secret: secretAlt },
  ];

  // raw encoded values (only hash excluded)
  const encodedNoSig: Record<string, string> = {};
  const encodedWithSig: Record<string, string> = {};
  for (const part of initData.split('&')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const k = part.slice(0, i);
    const v = part.slice(i + 1);
    if (k === 'hash') continue;
    encodedWithSig[k] = v;
    if (k !== 'signature') encodedNoSig[k] = v;
  }
  candidates.push(
    { name: 'enc-no-sig', check: buildCheck(encodedNoSig), secret: secretKey },
    { name: 'enc-with-sig', check: buildCheck(encodedWithSig), secret: secretKey }
  );

  const tried: Record<string, string> = {};
  for (const c of candidates) {
    const calc = toHex(await hmac(c.secret, c.check));
    tried[c.name] = calc.slice(0, 12);
    if (calc === hash) {
      console.log('Telegram initData validated via', c.name);
      return { valid: true, data: withoutSignature };
    }
  }

  // Точный алгоритм @telegram-apps/init-data-node validate()
  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key === 'hash') return;
    pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const libCheck = pairs.join('\n');
  const libHash = toHex(await hmac(secretKey, libCheck));
  tried['lib-exact'] = libHash.slice(0, 12);
  if (libHash === hash) {
    console.log('Telegram initData validated via lib-exact');
    return { valid: true, data: withoutSignature };
  }

  // --- Ed25519 third-party (поле signature) ---
  // message = `${botId}:WebAppData\n` + sorted pairs WITHOUT hash and signature
  const signature = params.get('signature');
  const botIdStr = botToken.includes(':') ? botToken.split(':')[0] : '';
  if (signature && botIdStr) {
    try {
      const ok3rd = await validateTelegram3rd(initData, botIdStr);
      if (ok3rd) {
        console.log('Telegram initData validated via Ed25519 signature (3rd)');
        return { valid: true, data: withoutSignature };
      }
      tried['ed25519-3rd'] = 'fail';
    } catch (e) {
      tried['ed25519-3rd'] = e instanceof Error ? e.message.slice(0, 40) : 'error';
      console.warn('Ed25519 validate failed', e);
    }
  }

  const botId = botIdStr || '?';
  console.error('Telegram signature mismatch', {
    botIdFromToken: botId,
    fieldKeys: Object.keys(allExceptHash).sort(),
    authDate: withoutSignature.auth_date,
    hashPrefix: hash.slice(0, 12),
    tried,
    tokenLen: botToken.length,
  });

  return {
    valid: false,
    data: withoutSignature,
    debug: { botIdFromToken: botId, tried },
    error:
      'Подпись Telegram не совпала. Проверьте TELEGRAM_BOT_TOKEN (тот же бот, что Mini App).',
  };
}

/** Telegram production Ed25519 public key (hex) for 3rd-party initData signature */
const TG_ED25519_PUBLIC_KEY_HEX =
  'e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d';

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Base64 / base64url → bytes (Telegram signature) */
function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad =
    normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const bin = atob(normalized + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * 3rd-party validation: Ed25519 over `${botId}:WebAppData\n` + pairs
 * @see https://core.telegram.org/bots/webapps#validating-data-for-third-party-use
 * @see @telegram-apps/init-data-node validate3rd
 */
async function validateTelegram3rd(
  initData: string,
  botId: string
): Promise<boolean> {
  const params = new URLSearchParams(initData);
  const signature = params.get('signature');
  if (!signature) return false;

  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key === 'hash' || key === 'signature') return;
    pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const message = `${botId}:WebAppData\n${pairs.join('\n')}`;

  const publicKey = await crypto.subtle.importKey(
    'raw',
    hexToBytes(TG_ED25519_PUBLIC_KEY_HEX),
    'Ed25519',
    false,
    ['verify']
  );

  const sigBytes = base64ToBytes(signature);
  const dataBytes = new TextEncoder().encode(message);

  return crypto.subtle.verify('Ed25519', publicKey, sigBytes, dataBytes);
}

function getTelegramUser(data: Record<string, string>): TelegramUserPayload | null {
  const rawUser = data.user;
  if (!rawUser) return null;
  try {
    return JSON.parse(rawUser) as TelegramUserPayload;
  } catch {
    try {
      return JSON.parse(decodeURIComponent(rawUser)) as TelegramUserPayload;
    } catch {
      return null;
    }
  }
}

function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function resolveBotIdentity(botToken: string): Promise<{
  ok: boolean;
  username?: string;
  id?: number;
  error?: string;
}> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const json = await res.json();
    if (!json.ok) {
      return { ok: false, error: json.description || 'getMe failed' };
    }
    return {
      ok: true,
      username: json.result?.username,
      id: json.result?.id,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'network error',
    };
  }
}

async function findUserByEmail(
  supabaseAdmin: SupabaseClient,
  email: string
): Promise<{ id: string; email?: string } | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const response = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      }
    );
    if (response.ok) {
      const payload = await response.json();
      const users = payload?.users ?? (Array.isArray(payload) ? payload : []);
      const match = users.find(
        (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (match?.id) return { id: match.id, email: match.email };
    }
  } catch {
    /* fall through */
  }

  for (let page = 1; page <= 5; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) break;
    const match = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (match) return { id: match.id, email: match.email ?? undefined };
    if (data.users.length < 200) break;
  }
  return null;
}

async function linkTelegramIdentity(
  supabaseAdmin: SupabaseClient,
  telegramId: number,
  userId: string
) {
  const { error } = await supabaseAdmin.from('telegram_identities').upsert(
    {
      telegram_id: telegramId,
      user_id: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'telegram_id' }
  );
  if (error) throw new Error(`telegram_identities: ${error.message}`);
}

async function resolveLinkedUserId(
  supabaseAdmin: SupabaseClient,
  telegramId: number
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('telegram_identities')
    .select('user_id')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  if (error) return null;
  return data?.user_id ?? null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { ...CORS_HEADERS, 'Access-Control-Max-Age': '86400' },
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  const botTokenRaw = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!botTokenRaw || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      {
        success: false,
        error: 'Не задан TELEGRAM_BOT_TOKEN или ключи Supabase в Secrets',
      },
      500
    );
  }

  // Убрать кавычки/пробелы/BOM, которые портят HMAC
  const botToken = botTokenRaw
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^["']|["']$/g, '');

  let body: TelegramAuthRequest;
  try {
    body = (await req.json()) as TelegramAuthRequest;
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const initData = body?.initData?.trim();
  if (!initData) {
    return jsonResponse({ success: false, error: 'Missing initData' }, 400);
  }

  const validation = await validateInitData(initData, botToken);
  if (!validation.valid) {
    const bot = await resolveBotIdentity(botToken);
    let error = validation.error || 'Invalid signature';

    if (!bot.ok) {
      error = `Токен в Secrets невалиден: ${bot.error}. Обновите TELEGRAM_BOT_TOKEN.`;
    } else {
      error =
        `Подпись не совпала. Secrets = @${bot.username} (id ${bot.id}). ` +
        `Открывайте Mini App только из этого бота. ` +
        `Если бот верный — перевыпустите токен в BotFather и обновите Secret.`;
    }

    return jsonResponse({ success: false, error, bot }, 401);
  }

  const authDate = Number(validation.data.auth_date ?? '0');
  if (!authDate || Date.now() / 1000 - authDate > 86400 * 2) {
    return jsonResponse(
      {
        success: false,
        error: 'Данные Telegram устарели. Закройте Mini App и откройте снова.',
      },
      401
    );
  }

  const telegramUser = getTelegramUser(validation.data);
  if (!telegramUser?.id) {
    return jsonResponse(
      { success: false, error: 'Telegram user data is missing' },
      400
    );
  }

  const startParam =
    validation.data.start_param?.trim() || body.linkToken?.trim() || '';
  let linkTokenFromStart: string | null = null;
  if (startParam.startsWith('link_')) {
    linkTokenFromStart = startParam.slice('link_'.length);
  } else if (body.linkToken) {
    linkTokenFromStart = body.linkToken.replace(/^link_/, '');
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tgFallbackEmail = `tg_${telegramUser.id}@concurio.local`;
  const displayName =
    [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') ||
    telegramUser.username ||
    `Telegram ${telegramUser.id}`;

  const tgMetadata = {
    telegram_id: telegramUser.id,
    first_name: telegramUser.first_name,
    last_name: telegramUser.last_name ?? null,
    username: telegramUser.username ?? null,
    display_name: displayName,
    avatar_url: telegramUser.photo_url ?? null,
    auth_provider: 'telegram',
  };

  try {
    const bindToken = linkTokenFromStart || null;
    const bindUserId = body.bindToUserId || null;

    if (bindToken || bindUserId) {
      let targetUserId = bindUserId;

      if (bindToken) {
        const { data: tokenRow, error: tokenError } = await supabaseAdmin
          .from('account_link_tokens')
          .select('*')
          .eq('token', bindToken)
          .maybeSingle();

        if (tokenError) throw new Error(tokenError.message);
        if (!tokenRow) {
          return jsonResponse(
            {
              success: false,
              error:
                'Ссылка привязки недействительна. В браузере нажмите «Привязать» снова.',
            },
            400
          );
        }
        if (tokenRow.used_at) {
          return jsonResponse(
            { success: false, error: 'Ссылка уже использована.' },
            400
          );
        }
        if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
          return jsonResponse(
            { success: false, error: 'Ссылка истекла (15 мин).' },
            400
          );
        }
        targetUserId = tokenRow.user_id;
      }

      if (!targetUserId) {
        return jsonResponse({ success: false, error: 'Target user missing' }, 400);
      }

      const { data: targetUser, error: getUserError } =
        await supabaseAdmin.auth.admin.getUserById(targetUserId);
      if (getUserError || !targetUser?.user) {
        throw new Error(getUserError?.message || 'Target user not found');
      }

      await linkTelegramIdentity(supabaseAdmin, telegramUser.id, targetUser.user.id);

      const mergedMetadata = {
        ...(targetUser.user.user_metadata ?? {}),
        ...tgMetadata,
        display_name:
          (targetUser.user.user_metadata?.display_name as string) || displayName,
      };

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUser.user.id,
        { user_metadata: mergedMetadata }
      );
      if (updateError) throw updateError;

      if (bindToken) {
        await supabaseAdmin
          .from('account_link_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('token', bindToken);
      }

      return jsonResponse({
        success: true,
        linked: true,
        user: {
          id: targetUser.user.id,
          email: targetUser.user.email,
          display_name: mergedMetadata.display_name,
          telegram_id: telegramUser.id,
          avatar_url: telegramUser.photo_url ?? undefined,
        },
      });
    }

    /**
     * Выдать клиенту способ войти БЕЗ сброса email-пароля.
     * - реальный email → magiclink token_hash (verifyOtp)
     * - tg_*@concurio.local → детерминированный пароль (только tg-аккаунты)
     */
    async function issueClientAuth(
      userId: string,
      email: string,
      metadata: Record<string, unknown>
    ) {
      const isSynthetic = email.toLowerCase().endsWith('@concurio.local');

      if (!isSynthetic) {
        // НЕ трогаем password — иначе ломается вход по email
        const { error: updateError } =
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            email_confirm: true,
            user_metadata: metadata,
          });
        if (updateError) throw updateError;

        const { data: linkData, error: linkError } =
          await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email,
          });
        if (linkError) throw linkError;

        const tokenHash = linkData?.properties?.hashed_token;
        if (!tokenHash) {
          throw new Error('generateLink did not return hashed_token');
        }

        return {
          auth_method: 'otp' as const,
          email,
          token_hash: tokenHash,
        };
      }

      // Синтетический tg-аккаунт — можно обновлять пароль
      const password = `tg_secure_${telegramUser.id}_concurio_v2`;
      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
          user_metadata: metadata,
        });
      if (updateError) throw updateError;

      return {
        auth_method: 'password' as const,
        email,
        password,
      };
    }

    // Login
    const linkedUserId = await resolveLinkedUserId(
      supabaseAdmin,
      telegramUser.id
    );

    if (linkedUserId) {
      const { data: linkedUser, error: linkedErr } =
        await supabaseAdmin.auth.admin.getUserById(linkedUserId);
      if (linkedErr || !linkedUser?.user) {
        throw new Error(linkedErr?.message || 'Linked user not found');
      }

      const loginEmail = linkedUser.user.email || tgFallbackEmail;
      const meta = {
        ...(linkedUser.user.user_metadata ?? {}),
        ...tgMetadata,
        display_name:
          (linkedUser.user.user_metadata?.display_name as string) ||
          displayName,
      };

      const auth = await issueClientAuth(linkedUserId, loginEmail, meta);

      return jsonResponse({
        success: true,
        ...auth,
        // backward-compat: credentials only for password method
        credentials:
          auth.auth_method === 'password'
            ? { email: auth.email, password: auth.password! }
            : undefined,
        user: {
          id: linkedUserId,
          email: loginEmail,
          display_name: meta.display_name as string,
          telegram_id: telegramUser.id,
          avatar_url: telegramUser.photo_url ?? undefined,
        },
      });
    }

    const loginEmail = tgFallbackEmail;
    let userId: string;
    const existing = await findUserByEmail(supabaseAdmin, loginEmail);

    if (existing) {
      userId = existing.id;
    } else {
      const bootstrapPassword = randomPassword();
      const { data: createdUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: loginEmail,
          password: bootstrapPassword,
          email_confirm: true,
          user_metadata: tgMetadata,
        });

      if (createError) {
        if (
          createError.message?.toLowerCase().includes('already') ||
          createError.message?.toLowerCase().includes('registered')
        ) {
          const again = await findUserByEmail(supabaseAdmin, loginEmail);
          if (!again) throw createError;
          userId = again.id;
        } else {
          throw createError;
        }
      } else {
        userId = createdUser.user.id;
      }
    }

    await linkTelegramIdentity(supabaseAdmin, telegramUser.id, userId);
    const auth = await issueClientAuth(userId, loginEmail, tgMetadata);

    return jsonResponse({
      success: true,
      ...auth,
      credentials:
        auth.auth_method === 'password'
          ? { email: auth.email, password: auth.password! }
          : undefined,
      user: {
        id: userId,
        email: loginEmail,
        display_name: displayName,
        telegram_id: telegramUser.id,
        avatar_url: telegramUser.photo_url ?? undefined,
      },
    });
  } catch (error) {
    console.error('Telegram auth failed', error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Telegram auth failed',
      },
      500
    );
  }
});
