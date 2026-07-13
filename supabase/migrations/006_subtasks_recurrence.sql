-- =============================================
-- Подзадачи (parent_id) + повторяющиеся задачи
-- =============================================

ALTER TABLE contests
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES contests(id) ON DELETE CASCADE;

ALTER TABLE contests
  ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'none'
    CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly'));

ALTER TABLE contests
  ADD COLUMN IF NOT EXISTS recurrence_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_contests_parent_id ON contests(parent_id);
CREATE INDEX IF NOT EXISTS idx_contests_recurrence ON contests(recurrence)
  WHERE recurrence IS DISTINCT FROM 'none';

COMMENT ON COLUMN contests.parent_id IS 'Родительская задача (подзадача), null = корень';
COMMENT ON COLUMN contests.recurrence IS 'none | daily | weekly | monthly';
COMMENT ON COLUMN contests.recurrence_until IS 'До какой даты повторять (опционально)';
