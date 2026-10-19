-- Live updates: pages subscribe to these tables through Supabase Realtime.
-- Realtime checks each subscriber's row-level security before sending a
-- change, so applicants hear about their own application only and staff
-- about every application. Skipped where the publication does not exist
-- (local PGlite checks).
DO $$
DECLARE t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY['profiles', 'profile_facts', 'profile_preferences',
                           'applicant_matchmaking_notes', 'photos']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
