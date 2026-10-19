-- Staff decisions carry a reason the applicant can read, and a waitlisted or
-- declined applicant can reopen their application, change it and submit it
-- again. A resubmitted application is pending review like a new one.

ALTER TABLE public.profiles
  ADD COLUMN last_decision public.application_status,
  ADD COLUMN decision_reason text,
  ADD COLUMN decided_at timestamptz,
  ADD COLUMN submission_count integer NOT NULL DEFAULT 0;

UPDATE public.profiles SET submission_count = 1 WHERE application_submitted_at IS NOT NULL;
UPDATE public.profiles SET last_decision = application_status
 WHERE application_status IN ('accepted', 'waitlisted', 'declined');

-- Applicants read their own row (table-wide SELECT) but cannot write these
-- columns: their UPDATE grant lists contact fields only.

-- A reason is required to waitlist or decline, and is shown to the applicant.
DROP FUNCTION public.set_application_status(uuid, public.application_status);
CREATE FUNCTION public.set_application_status(
  _profile_id uuid, _status public.application_status, _reason text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _current public.application_status;
  _clean text := nullif(btrim(coalesce(_reason, '')), '');
BEGIN
  IF NOT public.is_staff() THEN RETURN 'not_permitted'; END IF;
  IF _status NOT IN ('accepted','waitlisted','declined') THEN RETURN 'invalid_status'; END IF;
  IF _status IN ('waitlisted','declined') AND _clean IS NULL THEN RETURN 'reason_required'; END IF;
  IF length(_clean) > 1000 THEN RETURN 'reason_too_long'; END IF;

  SELECT application_status INTO _current FROM public.profiles
   WHERE id = _profile_id AND deleted_at IS NULL
   FOR UPDATE;
  IF _current IS NULL THEN RETURN 'not_found'; END IF;
  IF _current = 'draft' THEN RETURN 'not_submitted'; END IF;

  UPDATE public.profiles
     SET application_status = _status,
         last_decision = _status,
         decision_reason = CASE WHEN _status = 'accepted' THEN NULL ELSE _clean END,
         decided_at = now()
   WHERE id = _profile_id;
  RETURN 'ok';
END; $$;
REVOKE ALL ON FUNCTION public.set_application_status(uuid, public.application_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_application_status(uuid, public.application_status, text)
  TO authenticated, service_role;

-- Same checks as before; each submission is counted so staff can see a resubmission.
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
           submission_count = submission_count + 1
     WHERE id = _profile_id;
  END IF;
  RETURN 'submitted';
END; $$;

-- A waitlisted or declined applicant reopens their application to change it.
-- It returns to draft (editable, out of the staff list) until submitted again.
-- The last decision and its reason stay on record.
CREATE FUNCTION public.reopen_application()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _id uuid := public.current_profile_id();
  _current public.application_status;
BEGIN
  IF _id IS NULL THEN RETURN 'not_found'; END IF;
  SELECT application_status INTO _current FROM public.profiles WHERE id = _id FOR UPDATE;
  IF _current NOT IN ('waitlisted','declined') THEN RETURN 'not_allowed'; END IF;
  UPDATE public.profiles SET application_status = 'draft' WHERE id = _id;
  RETURN 'ok';
END; $$;
REVOKE ALL ON FUNCTION public.reopen_application() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reopen_application() TO authenticated, service_role;
