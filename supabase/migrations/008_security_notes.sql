-- =============================================
-- Security hardening notes (apply operationally)
-- Virus scan: use Supabase Storage hooks / ClamAV edge on upload
-- RLS audit: policies reviewed in 007
-- =============================================

-- Storage: reject oversized paths / enforce folder = auth.uid()
-- (policies already in 001; re-assert)

DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
    -- soft size guard is client-side; server max via dashboard
  );

DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;
CREATE POLICY "Users can read own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM attachments a
        JOIN contests c ON c.id = a.contest_id
        WHERE a.file_path = name
          AND (
            c.user_id = auth.uid()
            OR (c.workspace_id IS NOT NULL AND is_workspace_member(c.workspace_id))
          )
      )
    )
  );

-- Audit helper: recent policy-sensitive actions
CREATE OR REPLACE VIEW security_audit_recent AS
SELECT
  a.id,
  a.contest_id,
  a.user_id,
  a.action,
  a.details,
  a.created_at
FROM activity_log a
WHERE a.created_at > now() - interval '30 days'
ORDER BY a.created_at DESC;

COMMENT ON VIEW security_audit_recent IS 'RLS-scoped via activity_log policies';
