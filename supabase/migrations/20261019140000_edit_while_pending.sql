-- Applicants may change their application while it is a draft or pending
-- review. Once staff accept, waitlist or decline it, it is read-only; a
-- waitlisted or declined applicant can still reopen it (reopen_application).
--
-- Every applicant write policy calls this function, so renaming it keeps the
-- policies attached and changing its body changes them all.

ALTER FUNCTION public.current_draft_profile_id() RENAME TO current_editable_profile_id;

CREATE OR REPLACE FUNCTION public.current_editable_profile_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles
   WHERE auth_user_id = auth.uid() AND deleted_at IS NULL
     AND application_status IN ('draft', 'submitted')
   LIMIT 1;
$$;
