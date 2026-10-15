-- Supabase grants table-wide privileges on new public tables to its API roles,
-- so the column grants in the Milestone 1 migration narrowed nothing: an
-- applicant could update any column of their own row, including the
-- application status. Revoking a table-wide privilege also clears the column
-- grants, so the allowed columns are granted again afterwards.

-- profiles: applicants and staff edit contact fields only. The status changes
-- through set_application_status(), and drafts are created on the server.
REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated;
DROP POLICY profiles_insert_self ON public.profiles;
GRANT UPDATE (first_name, last_name, phone, phone_country, country_of_residence,
              gender, date_of_birth, current_section, last_field_saved_at)
  ON public.profiles TO authenticated;

-- photos: only the order changes after upload, and every row points into its
-- owner's folder of the member-photos bucket.
REVOKE UPDATE ON public.photos FROM anon, authenticated;
GRANT UPDATE (sort_order) ON public.photos TO authenticated;
ALTER TABLE public.photos
  ADD CONSTRAINT photos_path_in_owner_folder
  CHECK (split_part(storage_path, '/', 1) = profile_id::text);
