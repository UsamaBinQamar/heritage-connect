# MotherlandMatch: project notes

Client project for Bernard (MotherlandMatch, a private, human-led matchmaking house). This repo is the Milestone 1 build, cut down from the original Lovable project. Lovable rules are in [AGENTS.md](AGENTS.md); the full record of the 2026-10-16 cleanup is in [docs/session-notes-2026-10-16.md](docs/session-notes-2026-10-16.md).

## Scope

**Milestone 1**
- Application with no account and no code: contact, identity, life, relationship, partner preferences, consents, at least one private photo. Spam protection on the form.
- Staff sign in with email and a one-time code. One access level for all staff. (Built as email and password; Bernard asked to confirm.)
- All applications in one place, private photos visible to signed-in staff only.
- Status: accepted, waitlisted or declined.
- Staff edit details, and add, replace or remove photos.
- Filters. Who they are: gender, age, country, city, height, education, faith, children, marital status, smoking, drinking. What they want: partner gender, age range, long distance, countries they would date from, open to a partner with children, faith preference.
- Same design as the current website.

**Milestone 2:** deletion. Staff delete an application; that must remove the photos from storage and the personal details.

**Out of scope:** member login, introductions, automatic payments. Anything from the original handoff beyond this is redundant here. Bernard wants functionality on the existing design, not rebuilds.

## Stack
- TanStack Start, React 19 and Tailwind v4 through `@lovable.dev/vite-tanstack-config`. Do not add plugins it already includes (see the comment in `vite.config.ts`).
- Supabase project `snlapaoqeiduciclzykj`. Lovable uses `bun.lock`.

## Working rules
- **Secrets:** server-only keys (`SUPABASE_SERVICE_ROLE_KEY`) live in `.env.local`, which git ignores. `.env` is tracked and holds public values only. Deployed environments get the key from the host's environment variables.
- **Database:** migrations live in `supabase/migrations`. Never edit one that has been applied; add a new migration and run `supabase db push`. Check what is applied with `supabase migration list --linked`.
- **No Docker:** do not start Docker or `supabase start`. To check SQL locally, run it on PGlite (`@electric-sql/pglite`) with stand-in `auth` and `storage` schemas.
- **Supabase grants:** new public tables get table-wide privileges for `anon` and `authenticated`. A column-level `GRANT` narrows nothing unless the table-wide privilege is revoked first (see `20261016130000_restrict_applicant_writes.sql`).
- **Accounts:** everyone logs in at `/login` with email and password (`src/lib/account.ts`). Applicants start with no password: the contact step creates a confirmed account on the server and signs them in on that browser (`startApplication`). An email that already has an account is told to log in, never signed in from `/apply`. Forgot password lets anyone set one.
- **Staff access:** one role, `staff`. Create the user under Supabase Authentication → Add user → Create new user (temporary password, Auto Confirm), then run `select public.grant_staff_access('name@example.com');` in the SQL editor. They choose their own password on first log-in.
- **Editable while pending:** applicants can change their application while it is `draft` or `submitted` (pending review). Once staff accept, waitlist or decline it, it is read-only; waitlisted or declined applicants can reopen it with `reopen_application()`. Applicant write policies use `current_editable_profile_id()`: new applicant-writable tables need the same split, read with `current_profile_id()`, write with `current_editable_profile_id()`.
- **Images:** keep real files in `src/assets/`. Lovable's `.asset.json` pointers (`/__l5e/assets-v1/...`) only resolve on Lovable hosting and 404 everywhere else.
- **Forms:** wrap each field in `FieldShell` (its `id` matches the error key). On Continue, flag errors, call `revealField(orderByPage(keys))` from `src/components/apply/field.ts` and render `ErrorSummary`. Do not disable Continue for validation; disable it only while saving or sending.
- **Dev server:** run `npm run dev` from this folder (port 8080).
