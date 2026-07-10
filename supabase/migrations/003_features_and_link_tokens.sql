-- =============================================
-- Link tokens (привязка Telegram к email-аккаунту)
-- + telegram_identities (какой TG → какой auth user)
-- + чек-листы, комментарии, timeline
-- =============================================

-- Связка Telegram ID → Supabase user (источник истины для логина)
CREATE TABLE IF NOT EXISTS telegram_identities (
  telegram_id BIGINT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_identities_user ON telegram_identities(user_id);

ALTER TABLE telegram_identities ENABLE ROW LEVEL SECURITY;

-- Пользователь может видеть только свою привязку (запись — service role / edge)
DROP POLICY IF EXISTS "Users view own telegram identity" ON telegram_identities;
CREATE POLICY "Users view own telegram identity"
  ON telegram_identities FOR SELECT
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS account_link_tokens (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_link_tokens_user ON account_link_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_link_tokens_expires ON account_link_tokens(expires_at);

ALTER TABLE account_link_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users create own link tokens" ON account_link_tokens;
CREATE POLICY "Users create own link tokens"
  ON account_link_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own link tokens" ON account_link_tokens;
CREATE POLICY "Users view own link tokens"
  ON account_link_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Edge Function (service role) updates used_at; no user UPDATE policy needed

-- Чек-листы
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checklist_contest ON checklist_items(contest_id);

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own checklist" ON checklist_items;
CREATE POLICY "Users manage own checklist"
  ON checklist_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Комментарии
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_contest ON task_comments(contest_id);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own comments" ON task_comments;
CREATE POLICY "Users manage own comments"
  ON task_comments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Timeline / activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_contest ON activity_log(contest_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own activity" ON activity_log;
CREATE POLICY "Users manage own activity"
  ON activity_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
