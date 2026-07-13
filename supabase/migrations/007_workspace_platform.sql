-- =============================================
-- Workspace, soft-delete, automations, preferences
-- + completed_at for lead-time analytics
-- =============================================

-- Soft delete + metrics
ALTER TABLE contests
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

CREATE INDEX IF NOT EXISTS idx_contests_deleted_at ON contests(deleted_at)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contests_workspace ON contests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contests_completed_at ON contests(completed_at)
  WHERE completed_at IS NOT NULL;

-- Auto completed_at when status becomes done
CREATE OR REPLACE FUNCTION contests_set_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS DISTINCT FROM 'done') THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  ELSIF NEW.status IS DISTINCT FROM 'done' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contests_completed_at ON contests;
CREATE TRIGGER trg_contests_completed_at
  BEFORE UPDATE OF status ON contests
  FOR EACH ROW
  EXECUTE FUNCTION contests_set_completed_at();

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'viewer')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ws_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_ws_invites_token ON workspace_invites(token);

ALTER TABLE contests
  DROP CONSTRAINT IF EXISTS contests_workspace_id_fkey;
ALTER TABLE contests
  ADD CONSTRAINT contests_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;

-- Preferences (widgets, onboarding)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  widgets JSONB NOT NULL DEFAULT '["stats","deadlines","list","heatmap"]'::jsonb,
  onboarding_done BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automation rules
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  trigger_on TEXT NOT NULL DEFAULT 'on_create'
    CHECK (trigger_on IN ('on_create', 'on_update', 'on_status')),
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_user ON automation_rules(user_id);

-- Mentions log (optional denormalized)
CREATE TABLE IF NOT EXISTS comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_workspace_member(ws UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members m
    WHERE m.workspace_id = ws AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION workspace_role(ws UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.role FROM workspace_members m
  WHERE m.workspace_id = ws AND m.user_id = auth.uid()
  LIMIT 1;
$$;

DROP POLICY IF EXISTS "ws select members" ON workspaces;
CREATE POLICY "ws select members" ON workspaces FOR SELECT
  USING (owner_id = auth.uid() OR is_workspace_member(id));

DROP POLICY IF EXISTS "ws insert owner" ON workspaces;
CREATE POLICY "ws insert owner" ON workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "ws update owner" ON workspaces;
CREATE POLICY "ws update owner" ON workspaces FOR UPDATE
  USING (owner_id = auth.uid() OR workspace_role(id) = 'owner');

DROP POLICY IF EXISTS "ws delete owner" ON workspaces;
CREATE POLICY "ws delete owner" ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "wsm select" ON workspace_members;
CREATE POLICY "wsm select" ON workspace_members FOR SELECT
  USING (user_id = auth.uid() OR is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "wsm manage owner" ON workspace_members;
CREATE POLICY "wsm manage owner" ON workspace_members FOR ALL
  USING (
    workspace_role(workspace_id) = 'owner'
    OR EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  )
  WITH CHECK (
    workspace_role(workspace_id) = 'owner'
    OR EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "wsi select" ON workspace_invites;
CREATE POLICY "wsi select" ON workspace_invites FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_workspace_member(workspace_id)
  );

DROP POLICY IF EXISTS "wsi insert" ON workspace_invites;
CREATE POLICY "wsi insert" ON workspace_invites FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (workspace_role(workspace_id) IN ('owner', 'member')
      OR EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()))
  );

DROP POLICY IF EXISTS "wsi update" ON workspace_invites;
CREATE POLICY "wsi update" ON workspace_invites FOR UPDATE
  USING (created_by = auth.uid() OR is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "prefs own" ON user_preferences;
CREATE POLICY "prefs own" ON user_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "rules own" ON automation_rules;
CREATE POLICY "rules own" ON automation_rules FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "mentions own" ON comment_mentions;
CREATE POLICY "mentions own" ON comment_mentions FOR SELECT
  USING (mentioned_user_id = auth.uid());

-- Contests: owner OR workspace member; soft-delete still visible to owner
DROP POLICY IF EXISTS "Users can view own contests" ON contests;
DROP POLICY IF EXISTS "Users can create own contests" ON contests;
DROP POLICY IF EXISTS "Users can update own contests" ON contests;
DROP POLICY IF EXISTS "Users can delete own contests" ON contests;

CREATE POLICY "Users can view accessible contests"
  ON contests FOR SELECT
  USING (
    user_id = auth.uid()
    OR (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
  );

CREATE POLICY "Users can create contests"
  ON contests FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      workspace_id IS NULL
      OR is_workspace_member(workspace_id)
    )
  );

CREATE POLICY "Users can update accessible contests"
  ON contests FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (
      workspace_id IS NOT NULL
      AND workspace_role(workspace_id) IN ('owner', 'member')
    )
  );

CREATE POLICY "Users can delete own contests"
  ON contests FOR DELETE
  USING (user_id = auth.uid());

-- Attachments: via contest access
DROP POLICY IF EXISTS "Users can view own attachments" ON attachments;
DROP POLICY IF EXISTS "Users can create own attachments" ON attachments;
DROP POLICY IF EXISTS "Users can delete own attachments" ON attachments;

CREATE POLICY "Users can view accessible attachments"
  ON attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contests c
      WHERE c.id = attachments.contest_id
        AND (
          c.user_id = auth.uid()
          OR (c.workspace_id IS NOT NULL AND is_workspace_member(c.workspace_id))
        )
    )
  );

CREATE POLICY "Users can create attachments on accessible"
  ON attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contests c
      WHERE c.id = attachments.contest_id
        AND (
          c.user_id = auth.uid()
          OR (
            c.workspace_id IS NOT NULL
            AND workspace_role(c.workspace_id) IN ('owner', 'member')
          )
        )
    )
  );

CREATE POLICY "Users can delete own-side attachments"
  ON attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM contests c
      WHERE c.id = attachments.contest_id
        AND (
          c.user_id = auth.uid()
          OR (
            c.workspace_id IS NOT NULL
            AND workspace_role(c.workspace_id) IN ('owner', 'member')
          )
        )
    )
  );

COMMENT ON COLUMN contests.deleted_at IS 'Soft-delete; null = active';
COMMENT ON TABLE automation_rules IS 'Auto tags/status rules (client + future edge)';
COMMENT ON TABLE workspaces IS 'Team workspace; roles via workspace_members';
