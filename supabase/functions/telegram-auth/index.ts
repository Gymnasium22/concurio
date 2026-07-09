import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

interface TelegramAuthRequest {
  initData: string;
  bindToUserId?: string;
}

interface TelegramUserPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}

function parseInitData(initData: string): Record<string, string> {
  const params = new URLSearchParams(initData);
  const data: Record<string, string> = {};

  params.forEach((value, key) => {
    if (key !== 'hash') {
      data[key] = value;
    }
  });

  return data;
}

async function createHmacHex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function getTelegramUser(data: Record<string, string>): TelegramUserPayload | null {
  const rawUser = data.user;
  if (!rawUser) return null;

  try {
    return JSON.parse(decodeURIComponent(rawUser)) as TelegramUserPayload;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!botToken || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ success: false, error: 'Server is not configured for Telegram auth' }, 500);
  }

  const body = (await req.json()) as TelegramAuthRequest;
  const initData = body?.initData?.trim();

  if (!initData) {
    return jsonResponse({ success: false, error: 'Missing initData' }, 400);
  }

  const payload = parseInitData(initData);
  const receivedHash = payload.hash;
  delete payload.hash;

  const sortedFields = Object.entries(payload)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const expectedHash = await createHmacHex(botToken, sortedFields);

  if (expectedHash !== receivedHash) {
    return jsonResponse({ success: false, error: 'Invalid Telegram signature' }, 401);
  }

  const authDate = Number(payload.auth_date ?? '0');
  if (Date.now() / 1000 - authDate > 86400) {
    return jsonResponse({ success: false, error: 'Telegram auth data is expired' }, 401);
  }

  const telegramUser = getTelegramUser(payload);
  if (!telegramUser) {
    return jsonResponse({ success: false, error: 'Telegram user data is missing' }, 400);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const email = `tg_${telegramUser.id}@concurio.local`;
  const password = `tg_secure_${telegramUser.id}_concurio`;
  const displayName = [telegramUser.first_name, telegramUser.last_name]
    .filter(Boolean)
    .join(' ') || telegramUser.username || `Telegram ${telegramUser.id}`;

  const metadata = {
    telegram_id: telegramUser.id,
    first_name: telegramUser.first_name,
    last_name: telegramUser.last_name ?? null,
    username: telegramUser.username ?? null,
    display_name: displayName,
    avatar_url: telegramUser.photo_url ?? null,
    auth_provider: 'telegram',
  };

  try {
    if (body?.bindToUserId) {
      const { data: targetUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(body.bindToUserId);

      if (getUserError || !targetUser?.user) {
        throw new Error(getUserError?.message || 'Target user not found');
      }

      const mergedMetadata = {
        ...(targetUser.user.user_metadata ?? {}),
        ...metadata,
      };

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.user.id, {
        user_metadata: mergedMetadata,
      });

      if (updateError) throw updateError;

      return jsonResponse({
        success: true,
        linked: true,
        user: {
          id: targetUser.user.id,
          email: targetUser.user.email,
          display_name: displayName,
          telegram_id: telegramUser.id,
          avatar_url: telegramUser.photo_url ?? undefined,
        },
      });
    }

    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (getUserError && getUserError.message !== 'User not found') {
      throw getUserError;
    }

    let userId: string;

    if (existingUser?.user) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.user.id, {
        user_metadata: metadata,
      });

      if (updateError) throw updateError;
      userId = existingUser.user.id;
    } else {
      const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata,
      });

      if (createError) throw createError;
      userId = createdUser.user.id;
    }

    return jsonResponse({
      success: true,
      credentials: { email, password },
      user: {
        id: userId,
        email,
        display_name: displayName,
        telegram_id: telegramUser.id,
        avatar_url: telegramUser.photo_url ?? undefined,
      },
    });
  } catch (error) {
    console.error('Telegram auth failed', error);
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : 'Telegram auth failed' }, 500);
  }
});
