-- =============================================
-- Concurio — Tasks upgrade (конкурсы + обычные задачи)
-- =============================================

-- Тип задачи: конкурс / обычная / личная / напоминание
ALTER TABLE contests
  ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'contest'
    CHECK (task_type IN ('contest', 'task', 'personal', 'reminder'));

-- Приоритет
ALTER TABLE contests
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Теги (простой массив строк)
ALTER TABLE contests
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Цвет карточки (опционально, hex или token)
ALTER TABLE contests
  ADD COLUMN IF NOT EXISTS color TEXT;

-- Индексы
CREATE INDEX IF NOT EXISTS idx_contests_task_type ON contests(task_type);
CREATE INDEX IF NOT EXISTS idx_contests_priority ON contests(priority);

-- Комментарии
COMMENT ON COLUMN contests.task_type IS 'contest | task | personal | reminder';
COMMENT ON COLUMN contests.priority IS 'low | medium | high | urgent';
