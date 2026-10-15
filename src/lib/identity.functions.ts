import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CatalogItem = { id: string; label: string; grouping?: string | null };
export type IdentityCatalogs = {
  countries: { code: string; name: string }[];
  languages: CatalogItem[];
  culturalBackgrounds: CatalogItem[];
};

export type IdentityValues = {
  date_of_birth: string;
  state_or_region: string;
  city: string;
  nationality: string[];
  country_of_origin: string;
  cultural_backgrounds: string[];
  cultural_background_other_label: string;
  languages: string[];
  height_cm: number | null;
};

export type IdentityLoad = {
  country_of_residence: string;
  contact: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    phone_country: string;
    country_of_residence: string;
    gender: string;
  };
  identity: IdentityValues;
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

/** Public read of the canonical catalogs used by the Identity stage. */
export const listIdentityCatalogs = createServerFn({ method: "GET" }).handler(
  async (): Promise<IdentityCatalogs> => {
    const client = serverPublicClient();
    const [countries, languages, backgrounds] = await Promise.all([
      client.from("countries").select("code, name").eq("active", true).order("name"),
      client.from("languages").select("code, name").eq("active", true).order("name"),
      client
        .from("cultural_backgrounds")
        .select("id, label, grouping")
        .eq("active", true)
        .order("label"),
    ]);
    return {
      countries: countries.data ?? [],
      languages: (languages.data ?? []).map((l) => ({ id: l.code, label: l.name })),
      culturalBackgrounds: (backgrounds.data ?? []).map((b) => ({
        id: b.id,
        label: b.label,
        grouping: b.grouping
          ? b.grouping
              .split("_")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ")
          : null,
      })),
    };
  },
);

const EMPTY_IDENTITY: IdentityValues = {
  date_of_birth: "",
  state_or_region: "",
  city: "",
  nationality: [],
  country_of_origin: "",
  cultural_backgrounds: [],
  cultural_background_other_label: "",
  languages: [],
  height_cm: null,
};

/** Loads the signed-in applicant's saved contact + identity values. */
export const getMyApplication = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IdentityLoad | null> => {
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, email, phone, phone_country, country_of_residence, gender, date_of_birth",
      )
      .eq("auth_user_id", context.userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !profile) return null;

    const { data: facts } = await context.supabase
      .from("profile_facts")
      .select(
        "city, state_or_region, nationality, country_of_origin, cultural_backgrounds, cultural_background_other_label, languages, height_cm",
      )
      .eq("profile_id", profile.id)
      .maybeSingle();

    return {
      country_of_residence: profile.country_of_residence ?? "",
      contact: {
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        phone_country: profile.phone_country ?? "",
        country_of_residence: profile.country_of_residence ?? "",
        gender: profile.gender ?? "",
      },
      identity: {
        ...EMPTY_IDENTITY,
        date_of_birth: profile.date_of_birth ?? "",
        city: facts?.city ?? "",
        state_or_region: facts?.state_or_region ?? "",
        nationality: facts?.nationality ?? [],
        country_of_origin: facts?.country_of_origin ?? "",
        cultural_backgrounds: facts?.cultural_backgrounds ?? [],
        cultural_background_other_label: facts?.cultural_background_other_label ?? "",
        languages: facts?.languages ?? [],
        height_cm: facts?.height_cm ?? null,
      },
    };
  });

const isoCode = (v: unknown) => (/^[A-Z]{2}$/.test(String(v ?? "")) ? String(v) : null);

function cleanTokens(values: unknown, max = 20): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map((v) => String(v ?? "").trim())
        .filter((v) => v.length > 0 && v.length <= 64 && /^[a-z0-9_-]+$/i.test(v)),
    ),
  ).slice(0, max);
}

/** Debounced field-level save of the Identity section, under the applicant's own RLS. */
export const saveIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<IdentityValues>) => {
    const dob = String(input.date_of_birth ?? "").trim();
    const nationality = (Array.isArray(input.nationality) ? input.nationality : [])
      .map(isoCode)
      .filter((v): v is string => Boolean(v))
      .slice(0, 5);
    const height = input.height_cm == null ? null : Number(input.height_cm);
    return {
      date_of_birth: /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : "",
      state_or_region: String(input.state_or_region ?? "").trim().slice(0, 120),
      city: String(input.city ?? "").trim().slice(0, 120),
      nationality,
      country_of_origin: isoCode(input.country_of_origin) ?? "",
      cultural_backgrounds: cleanTokens(input.cultural_backgrounds),
      cultural_background_other_label: String(input.cultural_background_other_label ?? "")
        .trim()
        .slice(0, 80),
      languages: cleanTokens(input.languages),
      height_cm:
        height != null && Number.isFinite(height) && height >= 120 && height <= 220
          ? Math.round(height)
          : null,
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

    if (data.date_of_birth) {
      const { error } = await context.supabase
        .from("profiles")
        .update({ date_of_birth: data.date_of_birth, current_section: "identity" })
        .eq("id", profile.id);
      if (error) {
        console.error("[identity] date_of_birth save failed", error.message);
        throw new Error("We could not save that just now. Please try again.");
      }
    }

    const factsRow = {
      profile_id: profile.id,
      city: data.city || null,
      state_or_region: data.state_or_region || null,
      nationality: data.nationality.length ? data.nationality : null,
      country_of_origin: data.country_of_origin || null,
      cultural_backgrounds: data.cultural_backgrounds.length ? data.cultural_backgrounds : null,
      cultural_background_other_label: data.cultural_backgrounds.includes("other")
        ? data.cultural_background_other_label || null
        : null,
      languages: data.languages.length ? data.languages : null,
      height_cm: data.height_cm,
    };

    const { error: factsError } = await context.supabase
      .from("profile_facts")
      .upsert(factsRow, { onConflict: "profile_id" });
    if (factsError) {
      console.error("[identity] facts save failed", factsError.message);
      throw new Error("We could not save that just now. Please try again.");
    }

    const { data: percent } = await context.supabase.rpc("recompute_profile_sections", {
      _profile_id: profile.id,
    });

    return { savedAt: new Date().toISOString(), percent: (percent as number | null) ?? null };
  });
