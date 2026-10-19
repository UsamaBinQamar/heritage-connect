# Session notes: 2026-10-16

What changed while cutting the original MotherlandMatch Lovable project down to Milestone 1, why, how it was checked, and what is still open. Scope and working rules are in [CLAUDE.md](../CLAUDE.md).

## Where things are
- This folder (`heritage-connect/`) is its own git repo: remote `UsamaBinQamar/heritage-connect`, branch `main`. Vercel deploys `main`; the production address is https://heritage-connect-ten.vercel.app.
- The parent folder's `.git` (`heritage-connect-copy/.git`) still holds the original Lovable history (about 400 commits), branch `milestone-1-cleanup` and tag `backup/before-m1-cleanup`. It shows every file as deleted because the files were moved in here; keep it if that history matters.
- Supabase project: `snlapaoqeiduciclzykj`. The old Lovable Cloud project was `ibftndvhbsrctustdgbe`.

## 1. Redundant code removed
49 files, about 8,700 lines.
- **Removed:** the member desk (`/application`, introductions, `/launch`); all nine admin pages (people and roles, memberships, deletions, enquiries, notifications); matchmaker clients, follow-ups, introductions, notifications, photo review, search and shortlist; push notifications and the PWA (`push-sw.js`, `manifest.webmanifest`, the push dispatch API route, the `@block65/webcrypto-web-push` package); and the server functions and components behind them.
- **Kept:** the public site (home, about, how it works, contact, membership), the seven-step application, `/login`, and the staff list and detail pages under `/matchmaker`.
- **Follow-up fixes:** login now lands on `/matchmaker`; the Apply button always goes to `/apply`; transfer and photo review were removed from the staff detail page.

## 2. Environment
- `.env` holds one clean set of values for the new Supabase project, and `supabase/config.toml` points at it.
- `SUPABASE_SERVICE_ROLE_KEY` lives in `.env.local`, which git ignores. TanStack Start loads `.env.local` into `process.env`.
- The key was checked against the live project: it is a `service_role` key for this project, valid until 2036; it can call server-only functions, list storage buckets, use the auth admin API and sign storage URLs. A test draft was created through `upsert_draft_profile` and deleted afterwards; the database was left with zero rows.

## 3. Database
The 30 original migrations (32 tables) were replaced by two:

| Migration | Purpose |
|---|---|
| `20261016120000_milestone1_schema.sql` | Milestone 1 schema: 16 tables, seeds, functions, row-level security, private `member-photos` bucket |
| `20261016130000_restrict_applicant_writes.sql` | Security fix, see below |

Both are applied to the live project (`supabase migration list --linked` shows them locally and remotely).

**Tables kept (16):** `profiles`, `user_roles`, `profile_facts`, `preference_attributes`, `profile_preferences`, `profile_sections`, `applicant_matchmaking_notes`, `consents`, `photos`, `contact_messages`, and the catalogs `countries` (244 rows), `languages` (53), `cultural_backgrounds` (88), `profession_categories` (24), `industries` (20), `religions` (12).

**Tables dropped (16):** assignments, matchmaker notes, review decisions, audit events, draft recovery codes, introductions, introduction feedback, shortlist items, memberships, pricing rules, deletion requests, notifications, push subscriptions, follow-up states, verifications, private settings.

**Model changes**
- Application status: `draft`, `submitted`, `accepted`, `waitlisted`, `declined`.
- One staff role, `staff`. Every staff policy uses `is_staff()`.
- New functions: `list_applications()`, `set_application_status(profile, status)` (staff only, submitted applications only), `grant_staff_access(email)` (service role only).
- The `member-photos` bucket is private. Applicants manage files in their own folder; staff see photos through short-lived signed links minted on the server.

**Security fix.** Supabase grants table-wide privileges on new public tables to `anon` and `authenticated`, so the first migration's column grants narrowed nothing: a signed-in applicant could set their own `application_status` or point a photo row at someone else's file. The second migration revokes table-wide INSERT and UPDATE on `profiles` and UPDATE on `photos`, grants back only the columns applicants may edit, drops direct profile inserts, and requires every photo path to sit in its owner's folder.

**How it was checked**
- Both migrations were run on PGlite with Supabase-like roles, default privileges and stand-in `auth` and `storage` schemas; 41 access checks pass across applicant, staff and signed-out visitor paths.
- Live checks: all 16 tables exist; seed counts match; the dropped tables are gone; visitors cannot call functions, insert profiles, or update profiles or photos.

**Code updated to match:** the staff list no longer has claim or assignment; the staff detail page records a decision with three buttons and no private notes or reasons; `src/integrations/supabase/types.ts` was trimmed to the new schema.

## 4. Site images
The images were Lovable asset pointers (`.asset.json`) whose `/__l5e/assets-v1/...` paths only resolve on Lovable hosting, so they returned 404 on localhost. The five images the site uses (logo lockup, monogram, hero, the "Human Judgment" photo, the About portrait) were downloaded from the old project, checked against the recorded sizes and added to `src/assets/`. Three unused pointers (`hero-couple`, `human-judgment`, `human-judgment-2`) are left in place pending Bernard's decision (see `roadmap.md`).

## 5. Application form: guiding people to what is missing
Applies to all seven steps (contact, identity, life, relationship, your match, photos, consent).
- Continue is never disabled because the form is incomplete; only while saving or sending.
- On Continue, the page scrolls smoothly to the first field with a problem in page order, centres it and moves focus there. Motion is skipped when the visitor prefers reduced motion.
- Fields with a problem get a red left bar and red borders, and a summary next to the button lists each one; clicking an item jumps to that field. Items drop off as they are fixed.
- Errors are tied to their controls with `aria-invalid` and `aria-describedby`; choice groups are labelled by their question.
- The phone error now reads "That number doesn't look right for the country selected."
- Code: new `src/components/apply/field.ts`; changes in `ApplyChrome.tsx`, `ChoiceGroup.tsx`, `MultiSelect.tsx` and the seven `src/routes/apply.*.tsx` files.
- Checked: type check, build, lint (no new errors) and a scan for duplicate ids. Not yet tried in a browser, because the dev server stopped when the project moved into this folder.

## 6. Testing after the Vercel deploy
Not yet run end to end in a browser: the Chrome extension was not connected. What was checked:
- **Vercel:** every public page and every apply step returns 200; unknown paths return 404. The project has the six public Supabase variables but not `SUPABASE_SERVICE_ROLE_KEY`, so the contact step ("send me a link") and attaching the draft after the email link both fail on the live site until it is added.
- **"We could not save your details" on Life (localhost):** the database is not the cause. `supabase/tests/save-replay.mjs` replays the Identity and Life saves as a signed-in applicant on PGlite and every write passes, so the failure came from the request (an expired session or a dev-server reload). If it comes back, the dev-server terminal shows the real reason on a line starting `[life] facts save failed` or `Unauthorized`.
- **Applying again with the same email:** still one application per email (unique index), the verified record is not overwritten, and the email link brings the person back. All sections complete with status `submitted` shows the thank-you page.

What happens when someone leaves halfway (from the code):
- Same browser: they are still signed in, and `/apply` sends them to the first unfinished section.
- New device, through Apply: they type their contact details again with the same email, and the link brings them back to the same application.
- New device, through any later step or "Welcome back": they are sent to `/login`, whose link lands on `/matchmaker` (staff only), so they never reach their form.

## 7. Staff side: who, how they review, how they decide
- **Who:** "staff" is the admin. One access level: Bernard and every matchmaker he adds see and do the same things. Nobody is staff until added.
- **Adding someone:** invite their email under Supabase Authentication → Users, then run `select public.grant_staff_access('their@email.com');` in the SQL editor. It returns `ok`, or `no_auth_user` if the invite step was missed.
- **Reviewing:** staff sign in at `/login` with an email link and land on `/matchmaker`: every submitted application, newest first, with drafts left out. Filters: status and gender. Opening one shows the full application and the private photos through short-lived links.
- **Deciding:** three buttons on the application page: Accept, Waitlist, Decline (`set_application_status`). Drafts cannot be decided. A decision can be changed later. The applicant is not emailed.
- **Against the Milestone 1 scope:** done are the list, details and photos, the decision, and the single staff level. Still to build: staff sign-in with a one-time code (now an email link), staff editing of details and photos, and the full filter set (now only status and gender).

## 8. Log in for everyone, no code to apply, locked after submit (2026-10-17 to 19)
- **Apply with no code:** the contact step calls `startApplication`. For a new email the server creates a confirmed account, saves and binds the draft, and returns a one-time token; the browser exchanges it for a session with `verifyOtp`. No email is sent. If anything fails after the account is created, the account is deleted so the person can try again.
- **Already applied:** an email that already has an account is never signed in from `/apply`. The page says "You've already applied with this email" with Log in and "Set or reset your password". This tells anyone typing an email whether it has applied; spam protection should limit bulk checks.
- **Log in:** `/login` is email and password for applicants and staff. Applicants who never chose a password use Forgot password (`/forgot-password` → email → `/set-password`). Staff created with a temporary password choose their own on first log-in. After log-in, staff go to `/matchmaker` and applicants to their next unfinished section.
- **Header:** the site header shows Log in, or My application / Dashboard when signed in. Application pages show Log in or Sign out. The footer link reads "Log in".
- **Locked after submit:** migration `20261019120000_lock_submitted_applications.sql` (applied to the live project) lets applicants read but not change answers, contact details, consents or photos once the status is not `draft`. Any step then opens the receipt, which shows for every non-draft status and offers an optional "Set a password". `supabase/tests/save-replay.mjs` checks the lock.
- **Removed:** the anonymous `saveContactDraft` (it wrote drafts by email for anyone) and every email-link sign-in.

## Open items

**Milestone 1 work still to build**
1. Staff editing of details and photos in the dashboard.
2. The full filter set.
3. Spam protection on the contact step (it also limits the "already applied" check).

**Decisions**
- Staff and applicants log in with a password instead of the one-time code in the offer; Bernard has been asked to confirm.
- Applicants are not told about a decision. Decide with Bernard whether accept, waitlist or decline should send an email.
- New-application email to hello@motherlandmatch.com: not in the Milestone 1 offer.

**Setup**
- In Supabase, Authentication → URL Configuration: Site URL `https://heritage-connect-ten.vercel.app`, Redirect URLs `https://heritage-connect-ten.vercel.app/**` and `http://localhost:8080/**`.
- Set up custom SMTP: Supabase's built-in email only sends to the project team, so Forgot password does not reach applicants or Bernard until then.
- Turn off public sign-ups in Supabase (Authentication → Sign In / Providers). The app creates accounts on the server only.
- Create staff accounts: Authentication → Add user → Create new user (temporary password, Auto Confirm), then `grant_staff_access`.
- Contact form messages are saved but there is no page to read them; decide whether Milestone 1 needs one.
- `package-lock.json` sits next to `bun.lock`; Lovable uses bun, so keep only one lockfile.
- The GitHub repo is public and `.env` is tracked: never put the service role key in `.env`.

**Waiting on Bernard**
- The three unused image pointers, and the open items in `roadmap.md`.

**Security**
- A migration in the old history contains the old project's push-dispatch secret. This repo has no history, so it stays off GitHub unless the old history is pushed.

## Commands
```bash
npm run dev                                         # dev server on port 8080
supabase link --project-ref snlapaoqeiduciclzykj    # once per machine
supabase db push                                    # apply new migrations
supabase migration list --linked                    # what is applied where
cd supabase/tests && npm install && npm test        # replay the saves on PGlite
```
