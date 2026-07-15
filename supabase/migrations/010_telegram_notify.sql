-- =============================================
-- Уведомления Telegram (дайджест)
-- =============================================

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS tg_notify_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS tg_digest_hour SMALLINT NOT NULL DEFAULT 9
    CHECK (tg_digest_hour >= 0 AND tg_digest_hour <= 23);

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS tg_last_digest_at TIMESTAMPTZ;

COMMENT ON COLUMN user_preferences.tg_notify_enabled IS 'Присылать дайджест в Telegram';
COMMENT ON COLUMN user_preferences.tg_digest_hour IS 'Час (UTC) для утреннего дайджеста 0–23';
COMMENT ON COLUMN user_preferences.tg_last_digest_at IS 'Когда последний раз отправляли дайджест';
