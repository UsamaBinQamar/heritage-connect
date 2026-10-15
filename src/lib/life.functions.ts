import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CatalogItem = { id: string; label: string };

export type LifeCatalogs = {
  professionCategories: CatalogItem[];
  industries: CatalogItem[];
  religions: CatalogItem[];
};

export type LifeValues = {
  education_level: string;
  field_of_study: string;
  employment_status: string;
  job_title: string;
  profession_category: string;
  industry: string;
  has_children: string;
  number_of_children: number | null;
  children_living_status: string;
  wants_children: string;
  current_legal_status: string;
  marital_history: string;
  smoking: string;
  drinking: string;
  religion: string;
  denomination_or_faith_tradition: string;
  faith_observance: string;
};

export const EMPTY_LIFE: LifeValues = {
  education_level: "",
  field_of_study: "",
  employment_status: "",
  job_title: "",
  profession_category: "",
  industry: "",
  has_children: "",
  number_of_children: null,
  children_living_status: "",
  wants_children: "",
  current_legal_status: "",
  marital_history: "",
  smoking: "",
  drinking: "",
  religion: "",
  denomination_or_faith_tradition: "",
  faith_observance: "",
};

export const EDUCATION_LEVELS = [
  "secondary",
  "vocational",
  "bachelors",
  "masters",
  "doctorate",
  "other",
] as const;
export const EMPLOYMENT_STATUSES = [
  "employed",
  "self_employed",
  "business_owner",
  "student",
  "not_working",
  "other",
] as const;
export const WANTS_CHILDREN = ["yes", "no", "open", "not_sure"] as const;
export const LEGAL_STATUSES = [
  "single",
  "divorced",
  "widowed",
  "legally_separated",
  "other",
] as const;
export const MARITAL_HISTORIES = [
  "never_married",
  "previously_divorced",
  "previously_widowed",
  "other",
] as const;
export const SMOKING = ["never", "sometimes", "regularly"] as const;
export const DRINKING = ["never", "socially", "regularly"] as const;
export const FAITH_OBSERVANCE = ["not_important", "somewhat", "important", "central"] as const;
export const CHILDREN_LIVING_STATUS = [
  "living_with_me",
  "shared_custody",
  "living_elsewhere",
  "grown_independent",
] as const;

/** Job title is only meaningful for these working statuses. */
export const JOB_TITLE_STATUSES = ["employed", "self_employed", "business_owner"];

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

/** Public read of the canonical catalogs used by the Life stage. */
export const listLifeCatalogs = createServerFn({ method: "GET" }).handler(
  async (): Promise<LifeCatalogs> => {
    const client = serverPublicClient();
    const [professions, industries, religions] = await Promise.all([
      client.from("profession_categories").select("id, label").eq("active", true).order("label"),
      client.from("industries").select("id, label").eq("active", true).order("label"),
      client.from("religions").select("id, label").eq("active", true).order("label"),
    ]);
    return {
      professionCategories: professions.data ?? [],
      industries: industries.data ?? [],
      religions: religions.data ?? [],
    };
  },
);

/** Loads the signed-in applicant's saved Life values. */
export const getMyLife = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LifeValues | null> => {
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
        "education_level, field_of_study, employment_status, job_title, profession_category, industry, has_children, number_of_children, children_living_status, wants_children, current_legal_status, marital_history, smoking, drinking, religion, denomination_or_faith_tradition, faith_observance",
      )
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (!facts) return EMPTY_LIFE;

    return {
      education_level: facts.education_level ?? "",
      field_of_study: facts.field_of_study ?? "",
      employment_status: facts.employment_status ?? "",
      job_title: facts.job_title ?? "",
      profession_category: facts.profession_category ?? "",
      industry: facts.industry ?? "",
      has_children: facts.has_children ?? "",
      number_of_children: facts.number_of_children ?? null,
      children_living_status: facts.children_living_status ?? "",
      wants_children: facts.wants_children ?? "",
      current_legal_status: facts.current_legal_status ?? "",
      marital_history: facts.marital_history ?? "",
      smoking: facts.smoking ?? "",
      drinking: facts.drinking ?? "",
      religion: facts.religion ?? "",
      denomination_or_faith_tradition: facts.denomination_or_faith_tradition ?? "",
      faith_observance: facts.faith_observance ?? "",
    };
  });

const oneOf = (allowed: readonly string[], value: unknown) =>
  allowed.includes(String(value ?? "")) ? String(value) : "";

const token = (value: unknown, max = 64) => {
  const v = String(value ?? "").trim();
  return v.length > 0 && v.length <= max && /^[a-z0-9_-]+$/i.test(v) ? v : "";
};

/**
 * Debounced save of the Life section under the applicant's own RLS.
 * Dependent values are normalised server-side too, so a hidden answer can
 * never survive a change to the answer that controls it.
 */
export const saveLife = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<LifeValues>) => {
    const employment = oneOf(EMPLOYMENT_STATUSES, input.employment_status);
    const hasChildren = oneOf(["no", "yes"], input.has_children);
    const count = input.number_of_children == null ? null : Number(input.number_of_children);

    return {
      education_level: oneOf(EDUCATION_LEVELS, input.education_level),
      field_of_study: String(input.field_of_study ?? "").trim().slice(0, 120),
      employment_status: employment,
      job_title: JOB_TITLE_STATUSES.includes(employment)
        ? String(input.job_title ?? "").trim().slice(0, 120)
        : "",
      profession_category: token(input.profession_category),
      industry: token(input.industry),
      has_children: hasChildren,
      number_of_children:
        hasChildren === "yes" && count != null && Number.isFinite(count) && count >= 0 && count <= 20
          ? Math.round(count)
          : null,
      children_living_status:
        hasChildren === "yes" ? oneOf(CHILDREN_LIVING_STATUS, input.children_living_status) : "",
      wants_children: oneOf(WANTS_CHILDREN, input.wants_children),
      current_legal_status: oneOf(LEGAL_STATUSES, input.current_legal_status),
      marital_history: oneOf(MARITAL_HISTORIES, input.marital_history),
      smoking: oneOf(SMOKING, input.smoking),
      drinking: oneOf(DRINKING, input.drinking),
      religion: token(input.religion),
      denomination_or_faith_tradition: String(input.denomination_or_faith_tradition ?? "")
        .trim()
        .slice(0, 120),
      faith_observance: oneOf(FAITH_OBSERVANCE, input.faith_observance),
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
      education_level: (data.education_level || null) as never,
      field_of_study: data.field_of_study || null,
      employment_status: (data.employment_status || null) as never,
      job_title: data.job_title || null,
      profession_category: data.profession_category || null,
      industry: data.industry || null,
      has_children: (data.has_children || null) as never,
      number_of_children: data.number_of_children,
      children_living_status: data.children_living_status || null,
      wants_children: (data.wants_children || null) as never,
      current_legal_status: (data.current_legal_status || null) as never,
      marital_history: (data.marital_history || null) as never,
      smoking: (data.smoking || null) as never,
      drinking: (data.drinking || null) as never,
      religion: data.religion || null,
      denomination_or_faith_tradition: data.denomination_or_faith_tradition || null,
      faith_observance: (data.faith_observance || null) as never,
    };

    const { error: factsError } = await context.supabase
      .from("profile_facts")
      .upsert(row, { onConflict: "profile_id" });
    if (factsError) {
      console.error("[life] facts save failed", factsError.message);
      throw new Error("We could not save that just now. Please try again.");
    }

    const { error: sectionError } = await context.supabase
      .from("profiles")
      .update({ current_section: "life" })
      .eq("id", profile.id);
    if (sectionError) console.error("[life] current_section save failed", sectionError.message);

    const { data: percent } = await context.supabase.rpc("recompute_profile_sections", {
      _profile_id: profile.id,
    });

    return { savedAt: new Date().toISOString(), percent: (percent as number | null) ?? null };
  });
