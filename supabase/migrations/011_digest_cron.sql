-- =============================================
-- Расписание дайджеста Telegram (pg_cron + pg_net)
-- Секрет x-cron-secret задаётся отдельно (не в git).
-- См. scripts/setup-digest-cron.mjs или docs в README.
-- =============================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Таблица для секрета cron (только service_role / SQL editor)
CREATE TABLE IF NOT EXISTS app_private_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_private_config ENABLE ROW LEVEL SECURITY;
-- нет политик для authenticated → доступ только service_role / postgres

COMMENT ON TABLE app_private_config IS 'Служебные ключи (cron secret и т.п.), не для клиента';
