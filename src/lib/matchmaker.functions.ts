import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ApplicationRow = {
  profile_id: string;
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  country_of_residence: string | null;
  city: string | null;
  state_or_region: string | null;
  application_status: string;
  submitted_at: string | null;
};

/** Throws unless the signed-in person holds staff access. */
async function requireStaff(context: { supabase: any }): Promise<void> {
  const { data: staff } = await context.supabase.rpc("is_staff");
  if (!staff) throw new Error("This area is for MotherlandMatch staff.");
}

/** Every submitted application, newest first. */
export const listApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ApplicationRow[]> => {
    await requireStaff(context);
    const { data, error } = await context.supabase.rpc("list_applications");
    if (error) throw new Error("We could not load the applications just now.");
    return ((data ?? []) as any[]).map((r) => ({
      profile_id: r.profile_id,
      first_name: r.first_name,
      last_name: r.last_name,
      gender: r.gender,
      date_of_birth: r.date_of_birth,
      country_of_residence: r.country_of_residence,
      city: r.city,
      state_or_region: r.state_or_region,
      application_status: r.application_status,
      submitted_at: r.submitted_at,
    }));
  });

export type ApplicationFile = {
  profile: Record<string, any>;
  facts: Record<string, any> | null;
  preferences: {
    attribute_key: string;
    value: string | null;
    json: any;
    weight: string;
    section: string;
  }[];
  notes: { id: string; body: string; created_at: string }[];
  photos: { id: string; url: string | null; sort_order: number }[];
};

/** Read-only file for one applicant. Never lists anyone else. */
export const getApplicationFile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { profile_id: string }) => ({
    profile_id: String(input?.profile_id ?? ""),
  }))
  .handler(async ({ data, context }): Promise<ApplicationFile> => {
    await requireStaff(context);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, email, phone, phone_country, country_of_residence, gender, date_of_birth, application_status, application_submitted_at, last_decision, decision_reason, decided_at, submission_count",
      )
      .eq("id", data.profile_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!profile) throw new Error("That application could not be found.");

    const [{ data: facts }, { data: prefs }, { data: notes }, { data: photoRows }] =
      await Promise.all([
        context.supabase
          .from("profile_facts")
          .select("*")
          .eq("profile_id", profile.id)
          .maybeSingle(),
        context.supabase
          .from("profile_preferences")
          .select(
            "attribute_key, attribute_value, attribute_value_json, weight, preference_attributes(section)",
          )
          .eq("profile_id", profile.id),
        context.supabase
          .from("applicant_matchmaking_notes")
          .select("id, body, created_at")
          .eq("profile_id", profile.id)
          .order("created_at"),
        context.supabase
          .from("photos")
          .select("id, storage_path, sort_order")
          .eq("profile_id", profile.id)
          .order("sort_order"),
      ]);

    // Signed links are minted server-side for signed-in staff only.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const photos: ApplicationFile["photos"] = [];
    for (const row of (photoRows ?? []) as any[]) {
      const { data: signed } = await supabaseAdmin.storage
        .from("member-photos")
        .createSignedUrl(row.storage_path, 600);
      photos.push({ id: row.id, url: signed?.signedUrl ?? null, sort_order: row.sort_order });
    }

    return {
      profile,
      facts: (facts as any) ?? null,
      preferences: ((prefs ?? []) as any[]).map((p) => ({
        attribute_key: p.attribute_key,
        value: p.attribute_value,
        json: p.attribute_value_json,
        weight: p.weight,
        section: p.preference_attributes?.section ?? "other",
      })),
      notes: ((notes ?? []) as any[]).map((n) => ({
        id: n.id,
        body: n.body,
        created_at: n.created_at,
      })),
      photos,
    };
  });

export const DECISIONS = [
  { value: "accepted", label: "Accept" },
  { value: "waitlisted", label: "Waitlist" },
  { value: "declined", label: "Decline" },
] as const;

/**
 * Accepts, waitlists or declines a submitted application. Waitlist and
 * decline need a reason, which the applicant sees. The database re-checks
 * staff access and the reason, and refuses drafts and any other status.
 */
export const setApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { profile_id: string; status: string; reason?: string }) => ({
    profile_id: String(input?.profile_id ?? ""),
    status: String(input?.status ?? ""),
    reason: String(input?.reason ?? "")
      .trim()
      .slice(0, 1000),
  }))
  .handler(async ({ data, context }): Promise<{ outcome: string }> => {
    await requireStaff(context);
    const { data: outcome, error } = await context.supabase.rpc("set_application_status", {
      _profile_id: data.profile_id,
      _status: data.status as never,
      _reason: data.reason,
    });
    if (error) throw new Error("We could not update that status just now.");
    return { outcome: String(outcome) };
  });
