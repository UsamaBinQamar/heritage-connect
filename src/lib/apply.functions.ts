import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CountryOption = { code: string; name: string };

type ContactDraftInput = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_country: string;
  country_of_residence: string;
  gender: string;
};

const GENDERS = ["woman", "man", "other", "prefer_not_to_say"];

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

/** Public read of the canonical country catalog (anon SELECT policy). */
export const listCountries = createServerFn({ method: "GET" }).handler(
  async (): Promise<CountryOption[]> => {
    const { data, error } = await serverPublicClient()
      .from("countries")
      .select("code, name")
      .eq("active", true)
      .order("name");
    if (error) {
      console.error("[apply] listCountries failed", error.message);
      return [];
    }
    return data ?? [];
  },
);

/**
 * Persists the recoverable draft through the controlled server-side path.
 * The browser never writes the row itself; this handler uses the service role
 * to call upsert_draft_profile(), which is granted to service_role only.
 */
export const saveContactDraft = createServerFn({ method: "POST" })
  .inputValidator((input: ContactDraftInput) => {
    const email = String(input.email ?? "").trim().toLowerCase();
    const phone = String(input.phone ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error("A valid email is required.");
    if (!/^\+[1-9][0-9]{6,14}$/.test(phone)) throw new Error("A valid international number is required.");
    const gender = String(input.gender ?? "");
    return {
      first_name: String(input.first_name ?? "").trim().slice(0, 100),
      last_name: String(input.last_name ?? "").trim().slice(0, 100),
      email: email.slice(0, 255),
      phone,
      phone_country: /^[A-Z]{2}$/.test(input.phone_country ?? "") ? input.phone_country : "",
      country_of_residence: /^[A-Z]{2}$/.test(input.country_of_residence ?? "")
        ? input.country_of_residence
        : "",
      gender: GENDERS.includes(gender) ? gender : "",
    };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const args: {
      _email: string;
      _phone: string;
      _phone_country?: string;
      _first_name?: string;
      _last_name?: string;
      _country_of_residence?: string;
      _gender?: string;
    } = { _email: data.email, _phone: data.phone };
    if (data.phone_country) args._phone_country = data.phone_country;
    if (data.first_name) args._first_name = data.first_name;
    if (data.last_name) args._last_name = data.last_name;
    if (data.country_of_residence) args._country_of_residence = data.country_of_residence;
    if (data.gender) args._gender = data.gender;

    const { data: profileId, error } = await supabaseAdmin.rpc("upsert_draft_profile", args);
    if (error) {
      console.error("[apply] saveContactDraft failed", error.message);
      throw new Error("We could not save that just now. Please try again.");
    }
    return { profileId: profileId as unknown as string, savedAt: new Date().toISOString() };
  });

/**
 * After the one-time code is verified and an Auth session exists, bind the
 * draft to that account. From here ordinary row-level rules apply.
 */
export const attachDraftToAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string }) => ({
    email: String(input.email ?? "").trim().toLowerCase(),
  }))
  .handler(async ({ data, context }) => {
    const claimEmail = String((context.claims as { email?: string }).email ?? "").toLowerCase();
    if (!claimEmail || claimEmail !== data.email) {
      throw new Error("This code does not match the email on the application.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: findError } = await supabaseAdmin
      .from("profiles")
      .select("id, auth_user_id")
      .ilike("email", claimEmail)
      .is("deleted_at", null)
      .maybeSingle();
    if (findError) {
      console.error("[apply] attachDraft lookup failed", findError.message);
      throw new Error("We could not open your application. Please try again.");
    }
    if (!profile) throw new Error("We could not find an application for this email.");

    if (profile.auth_user_id && profile.auth_user_id !== context.userId) {
      throw new Error("This application is already attached to another account.");
    }

    if (!profile.auth_user_id) {
      const { error } = await supabaseAdmin.rpc("attach_draft_to_auth_user", {
        _profile_id: profile.id,
        _auth_user_id: context.userId,
      });
      if (error) {
        console.error("[apply] attachDraft failed", error.message);
        throw new Error("We could not open your application. Please try again.");
      }
    }

    await supabaseAdmin.rpc("recompute_profile_sections", { _profile_id: profile.id });
    return { profileId: profile.id };
  });
