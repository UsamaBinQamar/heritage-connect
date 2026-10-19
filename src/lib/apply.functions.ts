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

type CleanContact = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_country: string;
  country_of_residence: string;
  gender: string;
};

function cleanContact(input: ContactDraftInput): CleanContact {
  const email = String(input.email ?? "").trim().toLowerCase();
  const phone = String(input.phone ?? "").trim();
  if (!/^[^\s@]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) throw new Error("A valid email is required.");
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
}

function draftArgs(data: CleanContact, email: string) {
  const args: {
    _email: string;
    _phone: string;
    _phone_country?: string;
    _first_name?: string;
    _last_name?: string;
    _country_of_residence?: string;
    _gender?: string;
  } = { _email: email, _phone: data.phone };
  if (data.phone_country) args._phone_country = data.phone_country;
  if (data.first_name) args._first_name = data.first_name;
  if (data.last_name) args._last_name = data.last_name;
  if (data.country_of_residence) args._country_of_residence = data.country_of_residence;
  if (data.gender) args._gender = data.gender;
  return args;
}

export type StartApplicationResult =
  | { status: "started"; tokenHash: string }
  | { status: "exists" };

/**
 * Starts an application with no account step and no code. For a new email the
 * server creates a confirmed account, saves the draft, binds the two and
 * returns a one-time sign-in token that the browser exchanges for a session
 * (no email is sent). An email that already has an account is never signed in
 * from here: the person is told to log in, or to set a password by email.
 */
export const startApplication = createServerFn({ method: "POST" })
  .inputValidator((input: ContactDraftInput) => cleanContact(input))
  .handler(async ({ data }): Promise<StartApplicationResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      email_confirm: true,
    });
    if (createError) {
      if (createError.code === "email_exists" || /already been registered/i.test(createError.message)) {
        return { status: "exists" };
      }
      console.error("[apply] startApplication createUser failed", createError.message);
      throw new Error("We could not start your application just now. Please try again.");
    }

    const userId = created.user.id;
    try {
      const { data: profileId, error: draftError } = await supabaseAdmin.rpc(
        "upsert_draft_profile",
        draftArgs(data, data.email),
      );
      if (draftError) throw draftError;
      const { error: attachError } = await supabaseAdmin.rpc("attach_draft_to_auth_user", {
        _profile_id: profileId as unknown as string,
        _auth_user_id: userId,
      });
      if (attachError) throw attachError;
      const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: data.email,
      });
      if (linkError) throw linkError;
      return { status: "started", tokenHash: link.properties.hashed_token };
    } catch (error) {
      console.error("[apply] startApplication failed", (error as Error).message);
      // Without a session the person could never reach this account, so remove it
      // and let them try again. The draft row, if any, is reused next time.
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => undefined);
      throw new Error("We could not start your application just now. Please try again.");
    }
  });

/**
 * Saves the contact step for a signed-in applicant. The email is the one on
 * the account and cannot be changed here. Applications from before the
 * no-code flow may have no draft yet; one is created and bound.
 */
export const saveMyContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ContactDraftInput) => cleanContact(input))
  .handler(async ({ data, context }) => {
    const claimEmail = String((context.claims as { email?: string }).email ?? "").toLowerCase();
    const { data: profile, error: findError } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", context.userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (findError) {
      console.error("[apply] saveMyContact lookup failed", findError.message);
      throw new Error("We could not save that just now. Please try again.");
    }

    if (!profile) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profileId, error } = await supabaseAdmin.rpc(
        "upsert_draft_profile",
        draftArgs(data, claimEmail),
      );
      const attach = error
        ? { error }
        : await supabaseAdmin.rpc("attach_draft_to_auth_user", {
            _profile_id: profileId as unknown as string,
            _auth_user_id: context.userId,
          });
      if (attach.error) {
        console.error("[apply] saveMyContact draft failed", attach.error.message);
        throw new Error("We could not save that just now. Please try again.");
      }
      return { savedAt: new Date().toISOString() };
    }

    const { error } = await context.supabase
      .from("profiles")
      .update({
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        phone: data.phone,
        phone_country: data.phone_country || null,
        country_of_residence: data.country_of_residence || null,
        gender: (data.gender || null) as never,
        last_field_saved_at: new Date().toISOString(),
      })
      .eq("id", profile.id);
    if (error) {
      console.error("[apply] saveMyContact failed", error.message);
      throw new Error("We could not save that just now. Please try again.");
    }
    await context.supabase.rpc("recompute_profile_sections", { _profile_id: profile.id });
    return { savedAt: new Date().toISOString() };
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
