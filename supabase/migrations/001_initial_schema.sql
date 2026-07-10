-- =============================================
-- Concurio — Database Schema (Supabase / PostgreSQL)
-- Идемпотентная версия (можно применять повторно)
-- =============================================

CREATE TABLE IF NOT EXISTS contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'cancelled')),
  progress INT NOT NULL DEFAULT 0
    CHECK (progress >= 0 AND progress <= 100),
  telegram_message_links TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contests_user_id ON contests(user_id);
CREATE INDEX IF NOT EXISTS idx_contests_status ON contests(status);
CREATE INDEX IF NOT EXISTS idx_contests_due_date ON contests(due_date);
CREATE INDEX IF NOT EXISTS idx_attachments_contest_id ON attachments(contest_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contests_updated_at ON contests;
CREATE TRIGGER contests_updated_at
  BEFORE UPDATE ON contests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own contests" ON contests;
CREATE POLICY "Users can view own contests"
  ON contests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own contests" ON contests;
CREATE POLICY "Users can create own contests"
  ON contests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own contests" ON contests;
CREATE POLICY "Users can update own contests"
  ON contests FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own contests" ON contests;
CREATE POLICY "Users can delete own contests"
  ON contests FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own attachments" ON attachments;
CREATE POLICY "Users can view own attachments"
  ON attachments FOR SELECT
  USING (
    contest_id IN (SELECT id FROM contests WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create own attachments" ON attachments;
CREATE POLICY "Users can create own attachments"
  ON attachments FOR INSERT
  WITH CHECK (
    contest_id IN (SELECT id FROM contests WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own attachments" ON attachments;
CREATE POLICY "Users can delete own attachments"
  ON attachments FOR DELETE
  USING (
    contest_id IN (SELECT id FROM contests WHERE user_id = auth.uid())
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;
CREATE POLICY "Users can read own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
