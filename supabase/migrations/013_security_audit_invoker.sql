-- Fix Security Advisor: view must use caller's RLS (security_invoker),
-- not the view owner's privileges (security definer behavior).

CREATE OR REPLACE VIEW public.security_audit_recent
WITH (security_invoker = true) AS
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

COMMENT ON VIEW public.security_audit_recent IS
  'Recent activity (30d); security_invoker=true so RLS of querying user applies';

REVOKE ALL ON public.security_audit_recent FROM PUBLIC;
GRANT SELECT ON public.security_audit_recent TO authenticated;
