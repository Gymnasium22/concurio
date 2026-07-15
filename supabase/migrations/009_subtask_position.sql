-- =============================================
-- Порядок подзадач (position) + индексы
-- =============================================

ALTER TABLE contests
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_contests_parent_position
  ON contests (parent_id, position)
  WHERE parent_id IS NOT NULL;

COMMENT ON COLUMN contests.position IS 'Порядок среди соседей (подзадачи одного parent_id)';
