-- A reopened application can only be sent again once something in it has
-- changed. On reopen the server stores a fingerprint of the answers as they
-- were sent; submit compares against it and clears it on success.

ALTER TABLE public.profiles
  ADD COLUMN reopened_fingerprint text;

-- Applicants read their own row (table-wide SELECT) but cannot write this
-- column: their UPDATE grant lists contact fields only.

DROP FUNCTION public.reopen_application();
CREATE FUNCTION public.reopen_application(_fingerprint text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _id uuid := public.current_profile_id();
  _current public.application_status;
BEGIN
  IF _id IS NULL THEN RETURN 'not_found'; END IF;
  SELECT application_status INTO _current FROM public.profiles WHERE id = _id FOR UPDATE;
  IF _current NOT IN ('waitlisted','declined') THEN RETURN 'not_allowed'; END IF;
  UPDATE public.profiles
     SET application_status = 'draft',
         reopened_fingerprint = nullif(btrim(coalesce(_fingerprint, '')), '')
   WHERE id = _id;
  RETURN 'ok';
END; $$;
REVOKE ALL ON FUNCTION public.reopen_application(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reopen_application(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_application(_profile_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_status public.application_status;
BEGIN
  IF _profile_id IS DISTINCT FROM public.current_profile_id() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  PERFORM public.recompute_profile_sections(_profile_id);
  IF NOT public.profile_ready_to_submit(_profile_id) THEN
    RAISE EXCEPTION 'application not complete';
  END IF;

  SELECT application_status INTO current_status FROM public.profiles WHERE id = _profile_id FOR UPDATE;
  IF current_status = 'draft' THEN
    UPDATE public.profiles
       SET application_status = 'submitted',
           application_submitted_at = now(),
           submission_count = submission_count + 1,
           reopened_fingerprint = NULL
     WHERE id = _profile_id;
  END IF;
  RETURN 'submitted';
END; $$;
