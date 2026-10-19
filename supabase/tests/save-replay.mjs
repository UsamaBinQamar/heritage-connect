// Replays the application saves as a signed-in applicant on PGlite, against
// the migrations in ../migrations. No Docker and no live database.
//
//   cd supabase/tests && npm install && npm test
//
// Exits with code 1 if any check fails. Lines marked NOTE record current
// behaviour that is still an open decision, and never fail the run.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const migrationsDir = fileURLToPath(new URL("../migrations", import.meta.url));
const db = new PGlite();
let failures = 0;

// Stand-ins for what Supabase provides: API roles, default privileges on new
// public objects, auth.uid() from the request's JWT, and the storage schema.
await db.exec(`
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean);
  CREATE TABLE storage.objects (id uuid DEFAULT gen_random_uuid(), bucket_id text, name text, owner uuid);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS
    $$ SELECT string_to_array(name, '/') $$;
  GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
`);

for (const file of readdirSync(migrationsDir).sort()) {
  await db.exec(readFileSync(join(migrationsDir, file), "utf8"));
  console.log("applied", file);
}

const asServer = () => db.exec("RESET ROLE");
const asApplicant = (uid) =>
  db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${uid}', false);`);

async function expectOk(label, sql, params = []) {
  try {
    const res = await db.query(sql, params);
    console.log("PASS", label);
    return res.rows;
  } catch (error) {
    failures += 1;
    console.log("FAIL", label, "->", error.message);
    return [];
  }
}

async function expectError(label, sql, params = []) {
  try {
    await db.query(sql, params);
    failures += 1;
    console.log("FAIL", label, "-> was allowed");
  } catch (error) {
    console.log("PASS", label, `(${error.message})`);
  }
}

function expectEqual(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(ok ? "PASS" : "FAIL", label, ok ? "" : `-> ${JSON.stringify(actual)}`);
}

// Contact step and email link: draft created on the server, then attached.
const uid = "11111111-1111-1111-1111-111111111111";
const email = "applicant@example.test";
await db.exec(`INSERT INTO auth.users VALUES ('${uid}', '${email}')`);
const [{ id: profileId }] = (
  await db.query(
    `SELECT public.upsert_draft_profile($1, '+447700900123', 'GB', 'Test', 'Applicant', 'GB', 'woman') AS id`,
    [email],
  )
).rows;
await db.query(`SELECT public.attach_draft_to_auth_user($1, $2)`, [profileId, uid]);

// Identity and Life steps, written the way saveIdentity and saveLife write them.
await asApplicant(uid);
await expectOk(
  "identity: date of birth",
  `UPDATE public.profiles SET date_of_birth = '1990-05-01', current_section = 'identity' WHERE id = $1`,
  [profileId],
);
await expectOk(
  "identity: facts upsert",
  `INSERT INTO public.profile_facts (profile_id, city, country_of_origin, height_cm)
   VALUES ($1, 'London', 'GB', 170)
   ON CONFLICT (profile_id) DO UPDATE SET city = EXCLUDED.city,
     country_of_origin = EXCLUDED.country_of_origin, height_cm = EXCLUDED.height_cm`,
  [profileId],
);

const life = {
  education_level: "bachelors",
  field_of_study: null,
  employment_status: "employed",
  job_title: "Engineer",
  profession_category: "engineering",
  industry: "technology",
  has_children: "yes",
  number_of_children: 2,
  children_living_status: "shared_custody",
  wants_children: "open",
  current_legal_status: "divorced",
  marital_history: "previously_divorced",
  smoking: "never",
  drinking: "socially",
  religion: "agnostic",
  denomination_or_faith_tradition: null,
  faith_observance: "somewhat",
};
const cols = Object.keys(life);
await expectOk(
  "life: facts upsert",
  `INSERT INTO public.profile_facts (profile_id, ${cols.join(", ")})
   VALUES ($1, ${cols.map((_, i) => `$${i + 2}`).join(", ")})
   ON CONFLICT (profile_id) DO UPDATE SET ${cols.map((c) => `${c} = EXCLUDED.${c}`).join(", ")}`,
  [profileId, ...Object.values(life)],
);
await expectOk(
  "life: current section",
  `UPDATE public.profiles SET current_section = 'life' WHERE id = $1`,
  [profileId],
);
await expectOk("life: recompute sections", `SELECT public.recompute_profile_sections($1)`, [
  profileId,
]);
const [saved] = await expectOk(
  "life: read back",
  `SELECT religion, faith_observance, number_of_children, city FROM public.profile_facts WHERE profile_id = $1`,
  [profileId],
);
expectEqual("life: identity answers kept after life save", saved, {
  religion: "agnostic",
  faith_observance: "somewhat",
  number_of_children: 2,
  city: "London",
});
await expectError(
  "applicant cannot set their own status",
  `UPDATE public.profiles SET application_status = 'accepted' WHERE id = $1`,
  [profileId],
);

// Relationship: "Yes" to relocating before any country is picked saves as null;
// the database refuses an empty list.
await expectOk(
  "relationship: yes with no countries yet (null)",
  `INSERT INTO public.profile_facts (profile_id, willing_to_relocate, countries_would_relocate_to)
   VALUES ($1, 'yes', NULL)
   ON CONFLICT (profile_id) DO UPDATE SET willing_to_relocate = EXCLUDED.willing_to_relocate,
     countries_would_relocate_to = EXCLUDED.countries_would_relocate_to`,
  [profileId],
);
await expectError(
  "relationship: empty country list refused",
  `UPDATE public.profile_facts SET countries_would_relocate_to = '{}' WHERE profile_id = $1`,
  [profileId],
);

// The same person applies again with the same email, in different case.
await asServer();
const [{ id: againId }] = (
  await db.query(
    `SELECT public.upsert_draft_profile($1, '+447700900999', 'GB', 'Someone', 'Else', 'GB', 'man') AS id`,
    [email.toUpperCase()],
  )
).rows;
expectEqual("apply again: same application returned", againId, profileId);
const [after] = (
  await db.query(`SELECT first_name, phone, gender FROM public.profiles WHERE id = $1`, [profileId])
).rows;
expectEqual("apply again: verified details not overwritten", after, {
  first_name: "Test",
  phone: "+447700900123",
  gender: "woman",
});
const [{ count }] = (
  await db.query(`SELECT count(*)::int AS count FROM public.profiles WHERE lower(email) = $1`, [
    email,
  ])
).rows;
expectEqual("apply again: still one application for the email", count, 1);

// Pending review: the applicant can still change their application.
await db.query(`UPDATE public.profiles SET application_status = 'submitted' WHERE id = $1`, [
  profileId,
]);
await asApplicant(uid);
// Row-level security skips rows it hides, so a blocked UPDATE changes 0 rows.
const changed = async (sql, params) => (await db.query(sql, params)).affectedRows ?? 0;
expectEqual(
  "pending: answers can change",
  await changed(`UPDATE public.profile_facts SET smoking = 'never' WHERE profile_id = $1`, [
    profileId,
  ]),
  1,
);
expectEqual(
  "pending: contact details can change",
  await changed(`UPDATE public.profiles SET first_name = 'Test' WHERE id = $1`, [profileId]),
  1,
);

// Once decided the applicant can read their application but not change it.
await asServer();
await db.query(`UPDATE public.profiles SET application_status = 'accepted' WHERE id = $1`, [
  profileId,
]);
await asApplicant(uid);
expectEqual(
  "decided: answers locked",
  await changed(`UPDATE public.profile_facts SET smoking = 'regularly' WHERE profile_id = $1`, [
    profileId,
  ]),
  0,
);
expectEqual(
  "decided: contact details locked",
  await changed(`UPDATE public.profiles SET first_name = 'Changed' WHERE id = $1`, [profileId]),
  0,
);
await expectError(
  "decided: no new consent rows",
  `INSERT INTO public.consents (profile_id, consent_key, policy_version, accepted)
   VALUES ($1, 'contact_followup', 'v1', true)`,
  [profileId],
);
const readable = await expectOk(
  "decided: applicant can still read their answers",
  `SELECT smoking FROM public.profile_facts WHERE profile_id = $1`,
  [profileId],
);
expectEqual("decided: answers unchanged", readable[0], { smoking: "never" });
await expectOk(
  "decided: sections still recompute",
  `SELECT public.recompute_profile_sections($1)`,
  [profileId],
);
await asServer();
await db.query(`UPDATE public.profiles SET application_status = 'submitted' WHERE id = $1`, [
  profileId,
]);

// Staff decide with a reason; a waitlisted applicant reopens and resubmits.
await asServer();
const staffUid = "22222222-2222-2222-2222-222222222222";
await db.exec(`INSERT INTO auth.users VALUES ('${staffUid}', 'staff@example.test')`);
await db.query(`SELECT public.grant_staff_access('staff@example.test')`);
const decide = async (status, reason) =>
  (
    await db.query(`SELECT public.set_application_status($1, $2, $3) AS r`, [
      profileId,
      status,
      reason,
    ])
  ).rows[0].r;

await asApplicant(uid);
expectEqual("decision: applicants cannot decide", await decide("accepted", null), "not_permitted");
await asApplicant(staffUid);
expectEqual(
  "decision: waitlist needs a reason",
  await decide("waitlisted", "  "),
  "reason_required",
);
expectEqual(
  "decision: waitlist with a reason",
  await decide("waitlisted", "Not yet in your city"),
  "ok",
);

await asApplicant(uid);
const [seen] = await expectOk(
  "decision: applicant reads status and reason",
  `SELECT application_status, last_decision, decision_reason FROM public.profiles WHERE id = $1`,
  [profileId],
);
expectEqual("decision: reason shown to applicant", seen, {
  application_status: "waitlisted",
  last_decision: "waitlisted",
  decision_reason: "Not yet in your city",
});
await expectError(
  "decision: applicant cannot write the reason",
  `UPDATE public.profiles SET decision_reason = 'x' WHERE id = $1`,
  [profileId],
);
expectEqual(
  "resubmit: waitlisted applicant reopens",
  (await db.query(`SELECT public.reopen_application() AS r`)).rows[0].r,
  "ok",
);
expectEqual(
  "resubmit: reopened answers can change again",
  await changed(`UPDATE public.profile_facts SET smoking = 'sometimes' WHERE profile_id = $1`, [
    profileId,
  ]),
  1,
);

await asServer();
await db.query(`UPDATE public.profiles SET application_status = 'submitted' WHERE id = $1`, [
  profileId,
]);
await asApplicant(staffUid);
expectEqual("resubmit: staff accept", await decide("accepted", null), "ok");
await asApplicant(uid);
expectEqual(
  "resubmit: accepted cannot reopen",
  (await db.query(`SELECT public.reopen_application() AS r`)).rows[0].r,
  "not_allowed",
);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
