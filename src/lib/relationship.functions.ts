import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RelationshipValues = {
  looking_for: string;
  marriage_timeline: string;
  willing_to_relocate: string;
  countries_would_relocate_to: string[];
  open_to_long_distance: string;
  countries_would_date_from: string[];
  introduction_style: string;
};

export const EMPTY_RELATIONSHIP: RelationshipValues = {
  looking_for: "",
  marriage_timeline: "",
  willing_to_relocate: "",
  countries_would_relocate_to: [],
  open_to_long_distance: "",
  countries_would_date_from: [],
  introduction_style: "",
};

export const LOOKING_FOR = ["marriage", "marriage_open_to_serious"] as const;
export const MARRIAGE_TIMELINES = [
  "ready_now",
  "within_1_year",
  "within_2_years",
  "unhurried",
] as const;
export const YES_NO_DEPENDS = ["yes", "no", "depends"] as const;
export const INTRODUCTION_STYLES = ["blind_first", "photo_first", "matchmaker_decides"] as const;

function serverPublicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Canonical country options for the geography multi-selects. */
export const listCountries = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ code: string; name: string }[]> => {
    const { data, error } = await serverPublicClient()
      .from("countries")
      .select("code, name")
      .eq("active", true)
      .order("name");
    if (error) {
      console.error("[relationship] listCountries failed", error.message);
      return [];
    }
    return data ?? [];
  },
);

/** Loads the signed-in applicant's saved Relationship values. */
export const getMyRelationship = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RelationshipValues | null> => {
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", context.userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !profile) return null;

    const { data: facts } = await context.supabase
      .from("profile_facts")
      .select(
        "looking_for, marriage_timeline, willing_to_relocate, countries_would_relocate_to, open_to_long_distance, countries_would_date_from, introduction_style",
      )
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (!facts) return EMPTY_RELATIONSHIP;

    return {
      looking_for: facts.looking_for ?? "",
      marriage_timeline: facts.marriage_timeline ?? "",
      willing_to_relocate: facts.willing_to_relocate ?? "",
      countries_would_relocate_to: facts.countries_would_relocate_to ?? [],
      open_to_long_distance: facts.open_to_long_distance ?? "",
      countries_would_date_from: facts.countries_would_date_from ?? [],
      introduction_style: facts.introduction_style ?? "",
    };
  });

const oneOf = (allowed: readonly string[], value: unknown) =>
  allowed.includes(String(value ?? "")) ? String(value) : "";

// The database accepts a country list only with at least one code, so "none
// chosen yet" (autosave right after answering Yes) is stored as null.
const isoList = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const codes = value
    .map((v) => String(v ?? "").toUpperCase())
    .filter((v) => /^[A-Z]{2}$/.test(v))
    .slice(0, 60);
  return codes.length ? codes : null;
};

/**
 * Debounced save of the Relationship section under the applicant's own RLS.
 * Dependent country lists are nulled server-side too when their controlling
 * answer is "no", so a hidden answer can never survive its condition.
 */
export const saveRelationship = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<RelationshipValues>) => {
    const relocate = oneOf(YES_NO_DEPENDS, input.willing_to_relocate);
    const distance = oneOf(YES_NO_DEPENDS, input.open_to_long_distance);
    return {
      looking_for: oneOf(LOOKING_FOR, input.looking_for),
      marriage_timeline: oneOf(MARRIAGE_TIMELINES, input.marriage_timeline),
      willing_to_relocate: relocate,
      countries_would_relocate_to:
        relocate === "yes" || relocate === "depends"
          ? isoList(input.countries_would_relocate_to)
          : null,
      open_to_long_distance: distance,
      countries_would_date_from:
        distance === "yes" || distance === "depends"
          ? isoList(input.countries_would_date_from)
          : null,
      introduction_style: oneOf(INTRODUCTION_STYLES, input.introduction_style),
    };
  })
  .handler(async ({ data, context }) => {
    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", context.userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (profileError || !profile) throw new Error("We could not find your application.");

    const row = {
      profile_id: profile.id,
      looking_for: (data.looking_for || null) as never,
      marriage_timeline: (data.marriage_timeline || null) as never,
      willing_to_relocate: (data.willing_to_relocate || null) as never,
      countries_would_relocate_to: data.countries_would_relocate_to,
      open_to_long_distance: (data.open_to_long_distance || null) as never,
      countries_would_date_from: data.countries_would_date_from,
      introduction_style: (data.introduction_style || null) as never,
    };

    const { error: factsError } = await context.supabase
      .from("profile_facts")
      .upsert(row, { onConflict: "profile_id" });
    if (factsError) {
      console.error("[relationship] facts save failed", factsError.message);
      throw new Error("We could not save that just now. Please try again.");
    }

    const { error: sectionError } = await context.supabase
      .from("profiles")
      .update({ current_section: "relationship" })
      .eq("id", profile.id);
    if (sectionError)
      console.error("[relationship] current_section save failed", sectionError.message);

    const { data: percent } = await context.supabase.rpc("recompute_profile_sections", {
      _profile_id: profile.id,
    });

    return { savedAt: new Date().toISOString(), percent: (percent as number | null) ?? null };
  });
