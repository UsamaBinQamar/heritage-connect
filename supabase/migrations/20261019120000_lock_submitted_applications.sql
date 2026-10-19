-- Once an application is submitted, the applicant can still read it but can no
-- longer change it. Staff policies are unchanged. Submission, status changes
-- and the section recompute run as SECURITY DEFINER, so they are unaffected.

-- The signed-in applicant's profile, only while it is still a draft.
CREATE FUNCTION public.current_draft_profile_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles
   WHERE auth_user_id = auth.uid() AND deleted_at IS NULL AND application_status = 'draft'
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.current_draft_profile_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_draft_profile_id() TO authenticated, service_role;

-- profiles: contact fields change only while the application is a draft.
DROP POLICY profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = public.current_draft_profile_id() OR public.is_staff())
  WITH CHECK (id = public.current_draft_profile_id() OR public.is_staff());

-- Answers: read always, write while a draft.
DROP POLICY profile_facts_own ON public.profile_facts;
CREATE POLICY profile_facts_own_read ON public.profile_facts FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id());
CREATE POLICY profile_facts_own_write ON public.profile_facts FOR ALL TO authenticated
  USING (profile_id = public.current_draft_profile_id())
  WITH CHECK (profile_id = public.current_draft_profile_id());

DROP POLICY profile_preferences_own ON public.profile_preferences;
CREATE POLICY profile_preferences_own_read ON public.profile_preferences FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id());
CREATE POLICY profile_preferences_own_write ON public.profile_preferences FOR ALL TO authenticated
  USING (profile_id = public.current_draft_profile_id())
  WITH CHECK (profile_id = public.current_draft_profile_id());

DROP POLICY applicant_notes_own ON public.applicant_matchmaking_notes;
CREATE POLICY applicant_notes_own_read ON public.applicant_matchmaking_notes FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id());
CREATE POLICY applicant_notes_own_write ON public.applicant_matchmaking_notes FOR ALL TO authenticated
  USING (profile_id = public.current_draft_profile_id())
  WITH CHECK (profile_id = public.current_draft_profile_id());

DROP POLICY consents_own_insert ON public.consents;
CREATE POLICY consents_own_insert ON public.consents FOR INSERT TO authenticated
  WITH CHECK (profile_id = public.current_draft_profile_id());

-- Photos: the rows and the files in the applicant's folder.
DROP POLICY photos_own ON public.photos;
CREATE POLICY photos_own_read ON public.photos FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id());
CREATE POLICY photos_own_write ON public.photos FOR ALL TO authenticated
  USING (profile_id = public.current_draft_profile_id())
  WITH CHECK (profile_id = public.current_draft_profile_id());

DROP POLICY member_photos_owner_insert ON storage.objects;
DROP POLICY member_photos_owner_update ON storage.objects;
DROP POLICY member_photos_owner_delete ON storage.objects;
CREATE POLICY member_photos_owner_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'member-photos'
              AND (storage.foldername(name))[1] = public.current_draft_profile_id()::text);
CREATE POLICY member_photos_owner_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'member-photos'
         AND (storage.foldername(name))[1] = public.current_draft_profile_id()::text)
  WITH CHECK (bucket_id = 'member-photos'
              AND (storage.foldername(name))[1] = public.current_draft_profile_id()::text);
CREATE POLICY member_photos_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'member-photos'
         AND (storage.foldername(name))[1] = public.current_draft_profile_id()::text);
