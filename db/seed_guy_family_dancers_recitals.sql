-- Writes data into DB:
-- 1) finds John Guy Smith's family_account_id (by email)
-- 2) creates two recital rows if missing
-- 3) creates Emma/Noah dancers if missing
-- 4) links both dancers to both recitals via recital_ids
-- Safe to run multiple times.

DO $$
DECLARE
  v_user_email text := 'john.guy.smith@example.com';
  v_family_account_id integer;
  v_family_match_count integer;
  v_recital_may_id integer;
  v_recital_sep_id integer;
BEGIN
  SELECT COUNT(DISTINCT u.family_account_id), MIN(u.family_account_id)
  INTO v_family_match_count, v_family_account_id
  FROM users u
  WHERE LOWER(TRIM(COALESCE(u.email, ''))) = LOWER(TRIM(v_user_email))
    AND u.family_account_id IS NOT NULL;

  IF v_family_match_count = 0 THEN
    RAISE EXCEPTION 'No family_account_id found for email %.', v_user_email;
  ELSIF v_family_match_count > 1 THEN
    RAISE EXCEPTION 'Multiple family_account_id values found for email %.', v_user_email;
  END IF;

  INSERT INTO recital (name, day, time, venue)
  SELECT 'Recital - 2026-05-21 6:00 PM', DATE '2026-05-21', TIME '18:00:00', 'TBD'
  WHERE NOT EXISTS (
    SELECT 1
    FROM recital r
    WHERE r.name = 'Recital - 2026-05-21 6:00 PM'
      AND r.day = DATE '2026-05-21'
      AND r.time = TIME '18:00:00'
      AND COALESCE(r.venue, '') = 'TBD'
  );

  INSERT INTO recital (name, day, time, venue)
  SELECT 'Recital - 2026-09-20 8:00 PM', DATE '2026-09-20', TIME '20:00:00', 'TBD'
  WHERE NOT EXISTS (
    SELECT 1
    FROM recital r
    WHERE r.name = 'Recital - 2026-09-20 8:00 PM'
      AND r.day = DATE '2026-09-20'
      AND r.time = TIME '20:00:00'
      AND COALESCE(r.venue, '') = 'TBD'
  );

  SELECT r.id
  INTO v_recital_may_id
  FROM recital r
  WHERE r.name = 'Recital - 2026-05-21 6:00 PM'
    AND r.day = DATE '2026-05-21'
    AND r.time = TIME '18:00:00'
    AND COALESCE(r.venue, '') = 'TBD'
  ORDER BY r.id
  LIMIT 1;

  SELECT r.id
  INTO v_recital_sep_id
  FROM recital r
  WHERE r.name = 'Recital - 2026-09-20 8:00 PM'
    AND r.day = DATE '2026-09-20'
    AND r.time = TIME '20:00:00'
    AND COALESCE(r.venue, '') = 'TBD'
  ORDER BY r.id
  LIMIT 1;

  INSERT INTO dancer (family_account_id, first_name, last_name)
  SELECT v_family_account_id, 'Emma', 'Guy'
  WHERE NOT EXISTS (
    SELECT 1
    FROM dancer d
    WHERE d.family_account_id = v_family_account_id
      AND LOWER(TRIM(COALESCE(d.first_name, ''))) = 'emma'
      AND LOWER(TRIM(COALESCE(d.last_name, ''))) = 'guy'
  );

  INSERT INTO dancer (family_account_id, first_name, last_name)
  SELECT v_family_account_id, 'Noah', 'Guy'
  WHERE NOT EXISTS (
    SELECT 1
    FROM dancer d
    WHERE d.family_account_id = v_family_account_id
      AND LOWER(TRIM(COALESCE(d.first_name, ''))) = 'noah'
      AND LOWER(TRIM(COALESCE(d.last_name, ''))) = 'guy'
  );

  UPDATE dancer d
  SET recital_ids = (
    SELECT ARRAY_AGG(DISTINCT rid ORDER BY rid)
    FROM UNNEST(COALESCE(d.recital_ids, '{}'::integer[]) || ARRAY[v_recital_may_id, v_recital_sep_id]) AS rid
  )
  WHERE d.family_account_id = v_family_account_id
    AND LOWER(TRIM(COALESCE(d.last_name, ''))) = 'guy'
    AND LOWER(TRIM(COALESCE(d.first_name, ''))) IN ('emma', 'noah');

  RAISE NOTICE 'Seed complete for family_account_id=%; may_recital_id=%; sep_recital_id=%',
    v_family_account_id, v_recital_may_id, v_recital_sep_id;
END $$;

-- Quick verify (read-only output after writes)
SELECT COUNT(*)::int AS recital_count FROM recital;

SELECT d.id, d.family_account_id, d.first_name, d.last_name, d.recital_ids
FROM dancer d
WHERE d.family_account_id = (
  SELECT MIN(u.family_account_id)
  FROM users u
  WHERE LOWER(TRIM(COALESCE(u.email, ''))) = LOWER(TRIM('john.guy.smith@example.com'))
    AND u.family_account_id IS NOT NULL
)
ORDER BY d.first_name, d.id;
