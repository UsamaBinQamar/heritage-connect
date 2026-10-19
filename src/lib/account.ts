import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { APPLICATION_SECTIONS } from "@/lib/application.functions";

/**
 * Everyone logs in with email and password at /login.
 * - Staff receive a temporary password and choose their own on first sign-in.
 * - Applicants start with no password: the contact step signs them in on that
 *   browser. To come back elsewhere they set one with "Forgot password".
 */

export type AccountState = "loading" | "signed-out" | "applicant" | "staff";

/** Who is signed in on this browser, kept current as they log in or out. */
export function useAccount() {
  const navigate = useNavigate();
  const [state, setState] = useState<AccountState>("loading");

  useEffect(() => {
    let cancelled = false;
    const check = async (signedIn: boolean) => {
      if (!signedIn) {
        if (!cancelled) setState("signed-out");
        return;
      }
      const { data: staff } = await supabase.rpc("is_staff");
      if (!cancelled) setState(staff === true ? "staff" : "applicant");
    };
    void supabase.auth.getSession().then(({ data }) => check(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") void check(Boolean(session));
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const wasStaff = state === "staff";
    // Local scope: sign out this browser only, not the person's other devices.
    await supabase.auth.signOut({ scope: "local" });
    await navigate({ to: wasStaff ? "/login" : "/", replace: true });
  }, [navigate, state]);

  return { state, signOut };
}

export const MIN_PASSWORD_LENGTH = 8;

/** Set in the user's metadata once they have chosen their own password. */
export function hasChosenPassword(user: User | null | undefined): boolean {
  return user?.user_metadata?.["password_set"] === true;
}

export type AccountHome =
  "/matchmaker" | "/set-password" | (typeof APPLICATION_SECTIONS)[number]["to"];

/**
 * Where to go straight after logging in, worked out here with direct queries
 * so the person lands on the right page in one step instead of passing
 * through /apply. Staff go to the dashboard (or to choose a password first);
 * applicants to their first unfinished section, or the receipt once submitted.
 */
export async function destinationAfterSignIn(user: User): Promise<AccountHome> {
  const [staff, profile] = await Promise.all([
    supabase.rpc("is_staff"),
    supabase
      .from("profiles")
      .select("id, application_status")
      .eq("auth_user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);
  if (staff.data === true) return hasChosenPassword(user) ? "/matchmaker" : "/set-password";
  if (!profile.data) return "/apply";
  if (profile.data.application_status !== "draft") return "/apply/consent";

  const { data: rows } = await supabase
    .from("profile_sections")
    .select("section_key, is_complete")
    .eq("profile_id", profile.data.id);
  const done = new Set((rows ?? []).filter((r) => r.is_complete).map((r) => r.section_key));
  return APPLICATION_SECTIONS.find((s) => !done.has(s.key))?.to ?? "/apply/consent";
}

export type PasswordProblem = { field: "password" | "confirm"; message: string };

export function passwordProblem(password: string, confirm: string): PasswordProblem | undefined {
  if (password.length < MIN_PASSWORD_LENGTH)
    return { field: "password", message: `Please use at least ${MIN_PASSWORD_LENGTH} characters.` };
  if (password !== confirm) return { field: "confirm", message: "The two passwords do not match." };
  return undefined;
}

type AuthFailure = { code?: string; status?: number };

export function authErrorCode(error: unknown): string | undefined {
  return ((error ?? {}) as AuthFailure).code;
}

/** Plain wording for the Supabase Auth errors people can actually hit. */
export function authErrorMessage(error: unknown, fallback: string): string {
  const { code, status } = (error ?? {}) as AuthFailure;
  switch (code) {
    case "invalid_credentials":
      return "That email and password do not match.";
    case "email_not_confirmed":
      return "This account has not been confirmed yet.";
    case "same_password":
      return "That is your current password. Please choose a different one.";
    case "weak_password":
      return "That password is too easy to guess. Please choose a longer one.";
    case "reauthentication_needed":
      return "For your security, please reset your password by email instead.";
    case "over_email_send_rate_limit":
      return "Too many emails have been sent. Please wait a few minutes and try again.";
  }
  if (status === 429) return "Too many attempts. Please wait a minute and try again.";
  return fallback;
}

/**
 * A reset link that falls back to the Site URL (because the address was not
 * on Supabase's redirect list) still signs the person in. Send them on to
 * choose their password instead of leaving them on the home page.
 */
export function usePasswordRecoveryRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/set-password") {
        void navigate({ to: "/set-password" });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);
}
