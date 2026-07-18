-- Публичный share: не отдавать soft-deleted задачи
-- Сохраняем контракт ответа из 005 (ключ "share")

CREATE OR REPLACE FUNCTION public.get_public_share(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link share_links%ROWTYPE;
  v_contests JSONB;
  v_checklists JSONB;
  v_attachments JSONB;
  v_active_ids uuid[];
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_link
  FROM share_links
  WHERE token = trim(p_token)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_link.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'revoked');
  END IF;

  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF v_link.contest_ids IS NULL OR cardinality(v_link.contest_ids) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty');
  END IF;

  UPDATE share_links
  SET view_count = view_count + 1
  WHERE id = v_link.id;

  SELECT COALESCE(array_agg(c.id), ARRAY[]::uuid[])
  INTO v_active_ids
  FROM contests c
  WHERE c.id = ANY (v_link.contest_ids)
    AND c.user_id = v_link.owner_id
    AND c.deleted_at IS NULL;

  IF cardinality(v_active_ids) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.due_date NULLS LAST, c.created_at DESC), '[]'::jsonb)
  INTO v_contests
  FROM contests c
  WHERE c.id = ANY (v_active_ids);

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'contest_id', ci.contest_id,
        'items', ci.items
      )
    ),
    '[]'::jsonb
  )
  INTO v_checklists
  FROM (
    SELECT
      cl.contest_id,
      jsonb_agg(
        jsonb_build_object(
          'id', cl.id,
          'title', cl.title,
          'is_done', cl.is_done,
          'position', cl.position
        )
        ORDER BY cl.position, cl.created_at
      ) AS items
    FROM checklist_items cl
    WHERE cl.contest_id = ANY (v_active_ids)
      AND cl.user_id = v_link.owner_id
    GROUP BY cl.contest_id
  ) ci;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'contest_id', a.contest_id,
        'file_name', a.file_name,
        'file_type', a.file_type,
        'file_size', a.file_size,
        'file_path', a.file_path,
        'created_at', a.created_at
      )
      ORDER BY a.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_attachments
  FROM attachments a
  INNER JOIN contests c ON c.id = a.contest_id
  WHERE a.contest_id = ANY (v_active_ids)
    AND c.user_id = v_link.owner_id;

  RETURN jsonb_build_object(
    'ok', true,
    'share', jsonb_build_object(
      'title', COALESCE(v_link.title, 'Общий доступ'),
      'access_mode', v_link.access_mode,
      'expires_at', v_link.expires_at,
      'created_at', v_link.created_at,
      'task_count', jsonb_array_length(v_contests)
    ),
    'contests', v_contests,
    'checklists', COALESCE(v_checklists, '[]'::jsonb),
    'attachments', COALESCE(v_attachments, '[]'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.get_public_share(TEXT) IS
  'Public read-only share: only non-deleted owner contests';
