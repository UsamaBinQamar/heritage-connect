import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** The seven application sections, in order, with the route that owns each. */
export const APPLICATION_SECTIONS = [
  { key: "contact", label: "Contact", to: "/apply" },
  { key: "identity", label: "Identity", to: "/apply/identity" },
  { key: "life", label: "Life", to: "/apply/life" },
  { key: "relationship", label: "Relationship", to: "/apply/relationship" },
  { key: "partner_preferences", label: "Your Match", to: "/apply/match" },
  { key: "photos", label: "Photos", to: "/apply/photos" },
  { key: "consent", label: "Consent", to: "/apply/consent" },
] as const;

export type ApplicationSectionKey = (typeof APPLICATION_SECTIONS)[number]["key"];

export type ApplicationOverview = {
  firstName: string | null;
  applicationStatus: string;
  submittedAt: string | null;
  sections: Record<string, { complete: boolean }>;
  /** Earliest section whose required answers are still missing, if any. */
  resumeSection: ApplicationSectionKey | null;
};

/**
 * This person's own application only. Returns null when the signed-in account
 * has no application yet, so the caller can send them to Contact instead of
 * ever creating a second person.
 */
export const getApplicationOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ApplicationOverview | null> => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, first_name, application_status, application_submitted_at")
      .eq("auth_user_id", context.userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!profile) return null;

    await context.supabase.rpc("recompute_profile_sections", { _profile_id: profile.id });

    const { data: rows } = await context.supabase
      .from("profile_sections")
      .select("section_key, is_complete")
      .eq("profile_id", profile.id);

    const sections: ApplicationOverview["sections"] = {};
    for (const section of APPLICATION_SECTIONS) sections[section.key] = { complete: false };
    for (const row of rows ?? []) {
      if (row.section_key in sections) {
        sections[row.section_key] = { complete: Boolean(row.is_complete) };
      }
    }

    const resume = APPLICATION_SECTIONS.find((s) => !sections[s.key]?.complete);

    return {
      firstName: profile.first_name ?? null,
      applicationStatus: profile.application_status,
      submittedAt: profile.application_submitted_at,
      sections,
      resumeSection: resume ? resume.key : null,
    };
  });
