import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const POLICY_VERSION = "draft-v1";
export const CONSENT_SOURCE = "application_consent";

export const REQUIRED_CONSENTS = ["data_processing", "matchmaking_consideration"] as const;
export const OPTIONAL_CONSENTS = ["contact_followup", "photo_use_internal"] as const;
const ALL_CONSENTS = [...REQUIRED_CONSENTS, ...OPTIONAL_CONSENTS] as const;
export type ConsentKey = (typeof ALL_CONSENTS)[number];

export const SECTION_KEYS = [
  "contact",
  "identity",
  "life",
  "relationship",
  "partner_preferences",
  "photos",
  "consent",
] as const;

export type ConsentDesk = {
  profileId: string;
  applicationStatus: string;
  submittedAt: string | null;
  /** Staff's reason for a waitlist or decline, shown to the applicant. */
  decisionReason: string | null;
  sections: Record<string, { percent: number; complete: boolean }>;
  consents: Record<string, boolean>;
};

async function ownProfile(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("profiles")
    .select("id, application_status, application_submitted_at, decision_reason")
    .eq("auth_user_id", context.userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) throw new Error("We could not find your application.");
  return data as {
    id: string;
    application_status: string;
    application_submitted_at: string | null;
    decision_reason: string | null;
  };
}

/**
 * Loads real saved completeness for all seven sections plus the applicant's
 * current answer to each application consent. Consent rows are append-only,
 * so the most recent row per key is the standing answer.
 */
export const getConsentDesk = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConsentDesk> => {
    const profile = await ownProfile(context);

    await context.supabase.rpc("recompute_profile_sections", { _profile_id: profile.id });

    const { data: sectionRows } = await context.supabase
      .from("profile_sections")
      .select("section_key, completeness_percent, is_complete")
      .eq("profile_id", profile.id);

    const sections: ConsentDesk["sections"] = {};
    for (const key of SECTION_KEYS) sections[key] = { percent: 0, complete: false };
    for (const row of sectionRows ?? []) {
      sections[row.section_key] = {
        percent: row.completeness_percent ?? 0,
        complete: Boolean(row.is_complete),
      };
    }

    const { data: consentRows } = await context.supabase
      .from("consents")
      .select("consent_key, accepted, withdrawn_at, created_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: true });

    const consents: Record<string, boolean> = {};
    for (const key of ALL_CONSENTS) consents[key] = false;
    for (const row of consentRows ?? []) {
      if (!(ALL_CONSENTS as readonly string[]).includes(row.consent_key)) continue;
      consents[row.consent_key] = Boolean(row.accepted) && !row.withdrawn_at;
    }

    return {
      profileId: profile.id,
      applicationStatus: profile.application_status,
      submittedAt: profile.application_submitted_at,
      decisionReason: profile.decision_reason,
      sections,
      consents,
    };
  });

/** Records one consent answer as a new, attributable row. */
export const setConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; accepted: boolean }) => {
    const key = String(input?.key ?? "");
    if (!(ALL_CONSENTS as readonly string[]).includes(key)) {
      throw new Error("That agreement is not part of this application.");
    }
    return { key: key as ConsentKey, accepted: Boolean(input?.accepted) };
  })
  .handler(async ({ data, context }) => {
    const profile = await ownProfile(context);
    if (profile.application_status !== "draft" && profile.application_status !== "submitted") {
      throw new Error("Your application has already been submitted.");
    }

    const { error } = await context.supabase.from("consents").insert({
      profile_id: profile.id,
      consent_key: data.key,
      policy_version: POLICY_VERSION,
      accepted: data.accepted,
      accepted_at: data.accepted ? new Date().toISOString() : null,
      source: CONSENT_SOURCE,
    } as never);
    if (error) {
      console.error("[consent] save failed", error.message);
      throw new Error("We could not save that just now. Please try again.");
    }

    await context.supabase.rpc("recompute_profile_sections", { _profile_id: profile.id });
    await context.supabase
      .from("profiles")
      .update({ current_section: "consent" })
      .eq("id", profile.id);

    return { savedAt: new Date().toISOString() };
  });

/**
 * The only path that moves an application to submitted. The guard lives in the
 * database, so a client that skips a section cannot submit.
 */
export const submitApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await ownProfile(context);
    const { error } = await context.supabase.rpc("submit_application", {
      _profile_id: profile.id,
    });
    if (error) {
      console.error("[consent] submit failed", error.message);
      throw new Error("Some parts of your application are still missing.");
    }
    return { ok: true };
  });

/**
 * A waitlisted or declined applicant reopens their application to change it
 * and submit again. It returns to draft; the database refuses any other status.
 */
export const reopenApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: outcome, error } = await context.supabase.rpc("reopen_application");
    if (error || outcome !== "ok") {
      if (error) console.error("[consent] reopen failed", error.message);
      throw new Error("We could not reopen your application just now. Please try again.");
    }
    return { reopened: true };
  });
