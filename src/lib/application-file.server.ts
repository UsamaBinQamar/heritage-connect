import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import type { ApplicationFile } from "@/lib/matchmaker.functions";

/**
 * Reads one whole application with the caller's own client, so row-level
 * security decides what comes back: staff may read any application, an
 * applicant only their own. Photo links are signed here for ten minutes,
 * and only for photo rows the caller was allowed to read.
 */
export async function loadApplicationFile(
  client: SupabaseClient<Database>,
  which: { id: string } | { authUserId: string },
): Promise<ApplicationFile | null> {
  let query = client
    .from("profiles")
    .select(
      "id, first_name, last_name, email, phone, phone_country, country_of_residence, gender, date_of_birth, application_status, application_submitted_at, last_decision, decision_reason, decided_at, submission_count",
    )
    .is("deleted_at", null);
  query = "id" in which ? query.eq("id", which.id) : query.eq("auth_user_id", which.authUserId);
  const { data: profile } = await query.maybeSingle();
  if (!profile) return null;

  const [{ data: facts }, { data: prefs }, { data: notes }, { data: photoRows }] =
    await Promise.all([
      client.from("profile_facts").select("*").eq("profile_id", profile.id).maybeSingle(),
      client
        .from("profile_preferences")
        .select(
          "attribute_key, attribute_value, attribute_value_json, weight, preference_attributes(section)",
        )
        .eq("profile_id", profile.id),
      client
        .from("applicant_matchmaking_notes")
        .select("id, body, created_at")
        .eq("profile_id", profile.id)
        .order("created_at"),
      client
        .from("photos")
        .select("id, storage_path, sort_order")
        .eq("profile_id", profile.id)
        .order("sort_order"),
    ]);

  const photos = await Promise.all(
    (photoRows ?? []).map(async (row) => {
      const { data: signed } = await supabaseAdmin.storage
        .from("member-photos")
        .createSignedUrl(row.storage_path, 600);
      return { id: row.id, url: signed?.signedUrl ?? null, sort_order: row.sort_order };
    }),
  );

  return {
    profile,
    facts: facts ?? null,
    preferences: (prefs ?? []).map((p) => ({
      attribute_key: p.attribute_key,
      value: p.attribute_value,
      json: p.attribute_value_json,
      weight: p.weight,
      section: (p.preference_attributes as { section?: string } | null)?.section ?? "other",
    })),
    notes: (notes ?? []).map((n) => ({ id: n.id, body: n.body, created_at: n.created_at })),
    photos,
  };
}
