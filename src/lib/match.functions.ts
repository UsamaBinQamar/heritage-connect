import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const WEIGHTS = [
  "must_have",
  "strong_preference",
  "nice_to_have",
  "does_not_matter",
] as const;
export type Weight = (typeof WEIGHTS)[number];

export const GEOGRAPHY_MODES = ["specific", "anywhere", "exclude_only"] as const;
export const EDUCATION_LEVELS = [
  "secondary",
  "vocational",
  "bachelors",
  "masters",
  "doctorate",
] as const;
export const EMPLOYMENT_STATUSES = [
  "employed",
  "self_employed",
  "business_owner",
  "student",
  "not_working",
] as const;
export const FAITH_OBSERVANCE = ["not_important", "somewhat", "important", "central"] as const;
export const HAS_CHILDREN = ["no", "yes", "either"] as const;
export const WANTS_CHILDREN = ["yes", "no", "open", "either"] as const;
export const MARITAL_HISTORY = ["never_married", "divorced", "widowed"] as const;
export const SMOKING = ["never", "sometimes_ok", "any"] as const;
export const DRINKING = ["never", "socially_ok", "any"] as const;
export const RELOCATION = ["must_relocate_ok", "must_live_near_me", "flexible"] as const;
export const LONG_DISTANCE = ["ok", "not_ok", "short_term_ok"] as const;
export const MARRIAGE_TIMELINE = [
  "ready_now",
  "within_1_year",
  "within_2_years",
  "unhurried",
] as const;

export type MatchValues = {
  partner_gender: string;

  partner_age_min: number | null;
  partner_age_max: number | null;
  partner_age_weight: Weight;

  partner_height_min: number | null;
  partner_height_max: number | null;
  partner_height_weight: Weight;

  partner_geography_mode: string;
  partner_countries: string[];
  partner_countries_weight: Weight;
  partner_countries_excluded: string[];
  partner_cities: string[];

  partner_nationalities: string[];
  partner_nationalities_weight: Weight;
  partner_cultural_backgrounds: string[];
  partner_cultural_backgrounds_weight: Weight;
  partner_languages: string[];
  partner_languages_weight: Weight;

  partner_education_min: string;
  partner_education_min_weight: Weight;
  partner_employment_status: string[];
  partner_employment_status_weight: Weight;
  partner_profession_category: string[];
  partner_industry: string[];
  partner_religion: string[];
  partner_religion_weight: Weight;
  partner_faith_observance_min: string;
  partner_faith_observance_min_weight: Weight;

  partner_has_children: string;
  partner_has_children_weight: Weight;
  partner_max_existing_children: number | null;
  partner_wants_children: string;
  partner_marital_history: string[];
  partner_marital_history_weight: Weight;
  partner_smoking: string;
  partner_drinking: string;
  partner_relocation: string;
  partner_long_distance: string;
  partner_marriage_timeline: string;

  note: string;
};

export const EMPTY_MATCH: MatchValues = {
  partner_gender: "",
  partner_age_min: null,
  partner_age_max: null,
  partner_age_weight: "strong_preference",
  partner_height_min: null,
  partner_height_max: null,
  partner_height_weight: "strong_preference",
  partner_geography_mode: "",
  partner_countries: [],
  partner_countries_weight: "strong_preference",
  partner_countries_excluded: [],
  partner_cities: [],
  partner_nationalities: [],
  partner_nationalities_weight: "strong_preference",
  partner_cultural_backgrounds: [],
  partner_cultural_backgrounds_weight: "strong_preference",
  partner_languages: [],
  partner_languages_weight: "strong_preference",
  partner_education_min: "",
  partner_education_min_weight: "strong_preference",
  partner_employment_status: [],
  partner_employment_status_weight: "strong_preference",
  partner_profession_category: [],
  partner_industry: [],
  partner_religion: [],
  partner_religion_weight: "strong_preference",
  partner_faith_observance_min: "",
  partner_faith_observance_min_weight: "strong_preference",
  partner_has_children: "",
  partner_has_children_weight: "strong_preference",
  partner_max_existing_children: null,
  partner_wants_children: "",
  partner_marital_history: [],
  partner_marital_history_weight: "strong_preference",
  partner_smoking: "",
  partner_drinking: "",
  partner_relocation: "",
  partner_long_distance: "",
  partner_marriage_timeline: "",
  note: "",
};

export type MatchCatalogs = {
  countries: { id: string; label: string }[];
  languages: { id: string; label: string }[];
  cultural_backgrounds: { id: string; label: string; grouping: string | null }[];
  religions: { id: string; label: string }[];
  profession_categories: { id: string; label: string }[];
  industries: { id: string; label: string }[];
};

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

function prettyGroup(value: string | null): string | null {
  if (!value) return null;
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Canonical catalogs used by the Your Match controls. */
export const listMatchCatalogs = createServerFn({ method: "GET" }).handler(
  async (): Promise<MatchCatalogs> => {
    const db = serverPublicClient();
    const [countries, languages, cultural, religions, professions, industries] = await Promise.all([
      db.from("countries").select("code, name").eq("active", true).order("name"),
      db.from("languages").select("code, name").eq("active", true).order("name"),
      db
        .from("cultural_backgrounds")
        .select("id, label, grouping")
        .eq("active", true)
        .order("label"),
      db.from("religions").select("id, label").eq("active", true).order("label"),
      db.from("profession_categories").select("id, label").eq("active", true).order("label"),
      db.from("industries").select("id, label").eq("active", true).order("label"),
    ]);

    return {
      countries: (countries.data ?? []).map((c) => ({ id: c.code, label: c.name })),
      languages: (languages.data ?? []).map((l) => ({ id: l.code, label: l.name })),
      cultural_backgrounds: (cultural.data ?? []).map((c) => ({
        id: c.id,
        label: c.label,
        grouping: prettyGroup(c.grouping),
      })),
      religions: (religions.data ?? []).map((r) => ({ id: r.id, label: r.label })),
      profession_categories: (professions.data ?? []).map((p) => ({ id: p.id, label: p.label })),
      industries: (industries.data ?? []).map((i) => ({ id: i.id, label: i.label })),
    };
  },
);

type PrefRow = {
  attribute_key: string;
  attribute_value: string | null;
  attribute_value_json: unknown;
  weight: Weight;
};

const asWeight = (value: unknown, fallback: Weight = "strong_preference"): Weight =>
  (WEIGHTS as readonly string[]).includes(String(value)) ? (value as Weight) : fallback;

const asStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((v) => String(v)).filter(Boolean) : [];

function rangeOf(value: unknown): [number | null, number | null] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const min = typeof record["min"] === "number" ? (record["min"] as number) : null;
    const max = typeof record["max"] === "number" ? (record["max"] as number) : null;
    return [min, max];
  }
  return [null, null];
}

/** Loads saved partner preferences plus the applicant's own note. */
export const getMyMatch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MatchValues | null> => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", context.userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!profile) return null;

    const { data: prefs } = await context.supabase
      .from("profile_preferences")
      .select("attribute_key, attribute_value, attribute_value_json, weight")
      .eq("profile_id", profile.id);

    const { data: notes } = await context.supabase
      .from("applicant_matchmaking_notes")
      .select("body")
      .eq("profile_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    const map = new Map<string, PrefRow>();
    for (const row of (prefs ?? []) as PrefRow[]) map.set(row.attribute_key, row);

    const values: MatchValues = { ...EMPTY_MATCH, note: notes?.[0]?.body ?? "" };
    const scalar = (key: string) => map.get(key)?.attribute_value ?? "";
    const list = (key: string) => asStrings(map.get(key)?.attribute_value_json);
    const weight = (key: string) => asWeight(map.get(key)?.weight);

    values.partner_gender = list("partner_gender")[0] ?? scalar("partner_gender");

    const [ageMin, ageMax] = rangeOf(map.get("partner_age_range")?.attribute_value_json);
    values.partner_age_min = ageMin;
    values.partner_age_max = ageMax;
    values.partner_age_weight = weight("partner_age_range");

    const [hMin, hMax] = rangeOf(map.get("partner_height_range")?.attribute_value_json);
    values.partner_height_min = hMin;
    values.partner_height_max = hMax;
    values.partner_height_weight = weight("partner_height_range");

    values.partner_geography_mode = scalar("partner_geography_mode");
    values.partner_countries = list("partner_countries");
    values.partner_countries_weight = weight("partner_countries");
    values.partner_countries_excluded = list("partner_countries_excluded");
    values.partner_cities = list("partner_cities");

    values.partner_nationalities = list("partner_nationalities");
    values.partner_nationalities_weight = weight("partner_nationalities");
    values.partner_cultural_backgrounds = list("partner_cultural_backgrounds");
    values.partner_cultural_backgrounds_weight = weight("partner_cultural_backgrounds");
    values.partner_languages = list("partner_languages");
    values.partner_languages_weight = weight("partner_languages");

    values.partner_education_min = scalar("partner_education_min");
    values.partner_education_min_weight = weight("partner_education_min");
    values.partner_employment_status = list("partner_employment_status");
    values.partner_employment_status_weight = weight("partner_employment_status");
    values.partner_profession_category = list("partner_profession_category");
    values.partner_industry = list("partner_industry");
    values.partner_religion = list("partner_religion");
    values.partner_religion_weight = weight("partner_religion");
    values.partner_faith_observance_min = scalar("partner_faith_observance_min");
    values.partner_faith_observance_min_weight = weight("partner_faith_observance_min");

    values.partner_has_children = scalar("partner_has_children");
    values.partner_has_children_weight = weight("partner_has_children");
    const maxKids = map.get("partner_max_existing_children")?.attribute_value;
    values.partner_max_existing_children = maxKids == null ? null : Number(maxKids);
    values.partner_wants_children = scalar("partner_wants_children");
    values.partner_marital_history = list("partner_marital_history");
    values.partner_marital_history_weight = weight("partner_marital_history");
    values.partner_smoking = scalar("partner_smoking");
    values.partner_drinking = scalar("partner_drinking");
    values.partner_relocation = scalar("partner_relocation");
    values.partner_long_distance = scalar("partner_long_distance");
    values.partner_marriage_timeline = scalar("partner_marriage_timeline");

    return values;
  });

const oneOf = (allowed: readonly string[], value: unknown) =>
  allowed.includes(String(value ?? "")) ? String(value) : "";

const someOf = (allowed: readonly string[], value: unknown) =>
  asStrings(value).filter((v) => allowed.includes(v));

const isoList = (value: unknown, cap = 40) =>
  asStrings(value)
    .map((v) => v.toUpperCase())
    .filter((v) => /^[A-Z]{2}$/.test(v))
    .slice(0, cap);

const tokenList = (value: unknown, cap = 20) =>
  asStrings(value)
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && v.length <= 60)
    .slice(0, cap);

const intOrNull = (value: unknown, min: number, max: number): number | null => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < min || rounded > max) return null;
  return rounded;
};

/**
 * Writes Layer B (structured preferences) and Layer C (the applicant's own
 * note). Preferences are stored one canonical key per row; a
 * "does_not_matter" weight is a real answer stored with no value, and a value
 * saved without a weight defaults to strong_preference. Nothing is ever
 * promoted to must_have on the applicant's behalf.
 */
export const saveMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<MatchValues>) => {
    const mode = oneOf(GEOGRAPHY_MODES, input.partner_geography_mode);
    const hasChildren = oneOf(HAS_CHILDREN, input.partner_has_children);

    return {
      partner_gender: oneOf(["woman", "man"], input.partner_gender),

      partner_age_min: intOrNull(input.partner_age_min, 20, 80),
      partner_age_max: intOrNull(input.partner_age_max, 20, 80),
      partner_age_weight: asWeight(input.partner_age_weight),

      partner_height_min: intOrNull(input.partner_height_min, 120, 220),
      partner_height_max: intOrNull(input.partner_height_max, 120, 220),
      partner_height_weight: asWeight(input.partner_height_weight),

      partner_geography_mode: mode,
      // Geography dependents can never outlive their mode.
      partner_countries: mode === "specific" ? isoList(input.partner_countries) : [],
      partner_countries_weight: asWeight(input.partner_countries_weight),
      partner_countries_excluded:
        mode === "anywhere" ? [] : isoList(input.partner_countries_excluded),
      partner_cities: mode === "specific" ? tokenList(input.partner_cities) : [],

      partner_nationalities: isoList(input.partner_nationalities),
      partner_nationalities_weight: asWeight(input.partner_nationalities_weight),
      partner_cultural_backgrounds: tokenList(input.partner_cultural_backgrounds, 12),
      partner_cultural_backgrounds_weight: asWeight(input.partner_cultural_backgrounds_weight),
      partner_languages: tokenList(input.partner_languages, 12),
      partner_languages_weight: asWeight(input.partner_languages_weight),

      partner_education_min: oneOf(EDUCATION_LEVELS, input.partner_education_min),
      partner_education_min_weight: asWeight(input.partner_education_min_weight),
      partner_employment_status: someOf(EMPLOYMENT_STATUSES, input.partner_employment_status),
      partner_employment_status_weight: asWeight(input.partner_employment_status_weight),
      partner_profession_category: tokenList(input.partner_profession_category, 12),
      partner_industry: tokenList(input.partner_industry, 12),
      partner_religion: tokenList(input.partner_religion, 12),
      partner_religion_weight: asWeight(input.partner_religion_weight),
      partner_faith_observance_min: oneOf(FAITH_OBSERVANCE, input.partner_faith_observance_min),
      partner_faith_observance_min_weight: asWeight(input.partner_faith_observance_min_weight),

      partner_has_children: hasChildren,
      partner_has_children_weight: asWeight(input.partner_has_children_weight),
      partner_max_existing_children:
        hasChildren === "yes" || hasChildren === "either"
          ? intOrNull(input.partner_max_existing_children, 0, 10)
          : null,
      partner_wants_children: oneOf(WANTS_CHILDREN, input.partner_wants_children),
      partner_marital_history: someOf(MARITAL_HISTORY, input.partner_marital_history),
      partner_marital_history_weight: asWeight(input.partner_marital_history_weight),
      partner_smoking: oneOf(SMOKING, input.partner_smoking),
      partner_drinking: oneOf(DRINKING, input.partner_drinking),
      partner_relocation: oneOf(RELOCATION, input.partner_relocation),
      partner_long_distance: oneOf(LONG_DISTANCE, input.partner_long_distance),
      partner_marriage_timeline: oneOf(MARRIAGE_TIMELINE, input.partner_marriage_timeline),

      note: String(input.note ?? "").slice(0, 2000),
    };
  })
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", context.userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!profile) throw new Error("We could not find your application.");

    type Insert = {
      profile_id: string;
      attribute_key: string;
      attribute_value: string | null;
      attribute_value_json: unknown;
      weight: Weight;
    };

    const rows: Insert[] = [];
    const clear: string[] = [];

    const push = (
      key: string,
      value: { text?: string | null; json?: unknown },
      weight: Weight,
      opts: { weighted: boolean },
    ) => {
      const hasValue =
        (value.text != null && value.text !== "") ||
        (value.json != null &&
          (!Array.isArray(value.json) || (value.json as unknown[]).length > 0));

      if (opts.weighted && weight === "does_not_matter") {
        // "Does not matter" is a real, stored answer with no value.
        rows.push({
          profile_id: profile.id,
          attribute_key: key,
          attribute_value: null,
          attribute_value_json: null,
          weight: "does_not_matter",
        });
        return;
      }
      if (!hasValue) {
        clear.push(key);
        return;
      }
      rows.push({
        profile_id: profile.id,
        attribute_key: key,
        attribute_value: value.text ?? null,
        attribute_value_json: value.json ?? null,
        weight: opts.weighted ? weight : "must_have",
      });
    };

    const unweighted = { weighted: false };
    const weighted = { weighted: true };
    const fixed: Weight = "must_have";

    // Constraints and configuration carry no applicant-chosen weight.
    push("partner_gender", { json: data.partner_gender ? [data.partner_gender] : [] }, fixed, unweighted);
    push("partner_geography_mode", { text: data.partner_geography_mode }, fixed, unweighted);
    push("partner_countries_excluded", { json: data.partner_countries_excluded }, fixed, unweighted);
    push("partner_cities", { json: data.partner_cities }, fixed, unweighted);
    push("partner_profession_category", { json: data.partner_profession_category }, fixed, unweighted);
    push("partner_industry", { json: data.partner_industry }, fixed, unweighted);
    push("partner_max_existing_children", {
      text: data.partner_max_existing_children == null ? null : String(data.partner_max_existing_children),
    }, fixed, unweighted);
    push("partner_wants_children", { text: data.partner_wants_children }, fixed, unweighted);
    push("partner_smoking", { text: data.partner_smoking }, fixed, unweighted);
    push("partner_drinking", { text: data.partner_drinking }, fixed, unweighted);
    push("partner_relocation", { text: data.partner_relocation }, fixed, unweighted);
    push("partner_long_distance", { text: data.partner_long_distance }, fixed, unweighted);
    push("partner_marriage_timeline", { text: data.partner_marriage_timeline }, fixed, unweighted);

    // Weighted preferences.
    push(
      "partner_age_range",
      {
        json:
          data.partner_age_min != null && data.partner_age_max != null
            ? { min: data.partner_age_min, max: data.partner_age_max }
            : null,
      },
      data.partner_age_weight,
      weighted,
    );
    push(
      "partner_height_range",
      {
        json:
          data.partner_height_min != null && data.partner_height_max != null
            ? { min: data.partner_height_min, max: data.partner_height_max }
            : null,
      },
      data.partner_height_weight,
      weighted,
    );
    push("partner_countries", { json: data.partner_countries }, data.partner_countries_weight, weighted);
    push(
      "partner_nationalities",
      { json: data.partner_nationalities },
      data.partner_nationalities_weight,
      weighted,
    );
    push(
      "partner_cultural_backgrounds",
      { json: data.partner_cultural_backgrounds },
      data.partner_cultural_backgrounds_weight,
      weighted,
    );
    push("partner_languages", { json: data.partner_languages }, data.partner_languages_weight, weighted);
    push(
      "partner_education_min",
      { text: data.partner_education_min },
      data.partner_education_min_weight,
      weighted,
    );
    push(
      "partner_employment_status",
      { json: data.partner_employment_status },
      data.partner_employment_status_weight,
      weighted,
    );
    push("partner_religion", { json: data.partner_religion }, data.partner_religion_weight, weighted);
    push(
      "partner_faith_observance_min",
      { text: data.partner_faith_observance_min },
      data.partner_faith_observance_min_weight,
      weighted,
    );
    push(
      "partner_has_children",
      { text: data.partner_has_children },
      data.partner_has_children_weight,
      weighted,
    );
    push(
      "partner_marital_history",
      { json: data.partner_marital_history },
      data.partner_marital_history_weight,
      weighted,
    );

    if (clear.length > 0) {
      const { error } = await context.supabase
        .from("profile_preferences")
        .delete()
        .eq("profile_id", profile.id)
        .in("attribute_key", clear);
      if (error) console.error("[match] clear failed", error.message);
    }

    if (rows.length > 0) {
      const { error } = await context.supabase
        .from("profile_preferences")
        .upsert(rows as never, { onConflict: "profile_id,attribute_key" });
      if (error) {
        console.error("[match] preference save failed", error.message);
        throw new Error("We could not save that just now. Please try again.");
      }
    }

    // Layer C: the applicant's own note, kept apart from preferences.
    const { data: existingNote } = await context.supabase
      .from("applicant_matchmaking_notes")
      .select("id")
      .eq("profile_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    const noteId = existingNote?.[0]?.id;
    if (data.note.trim()) {
      if (noteId) {
        await context.supabase
          .from("applicant_matchmaking_notes")
          .update({ body: data.note })
          .eq("id", noteId);
      } else {
        await context.supabase
          .from("applicant_matchmaking_notes")
          .insert({ profile_id: profile.id, body: data.note });
      }
    } else if (noteId) {
      await context.supabase.from("applicant_matchmaking_notes").delete().eq("id", noteId);
    }

    await context.supabase
      .from("profiles")
      .update({ current_section: "partner_preferences" })
      .eq("id", profile.id);

    const { data: percent } = await context.supabase.rpc("recompute_profile_sections", {
      _profile_id: profile.id,
    });

    return { savedAt: new Date().toISOString(), percent: (percent as number | null) ?? null };
  });
