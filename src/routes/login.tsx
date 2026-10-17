import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  ApplyMasthead,
  FieldShell,
  Panel,
  inputClass,
  primaryButtonClass,
} from "@/components/apply/ApplyChrome";
import { authErrorMessage, destinationAfterSignIn } from "@/lib/staff-auth";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff sign in | MotherlandMatch" },
      { name: "description", content: "Sign in to the MotherlandMatch staff area." },
      { property: "og:title", content: "Staff sign in | MotherlandMatch" },
      { property: "og:description", content: "Sign in to the MotherlandMatch staff area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LoginPage,
});

// The domain part is checked strictly so a stray quote or comma is caught here.
const emailOk = (v: string) => /^[^\s@]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(v.trim());

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Already signed in on this browser: go straight on.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      const to = await destinationAfterSignIn(data.session.user);
      if (!cancelled) await navigate({ to, replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!emailOk(email)) {
      setError("Please check the email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) throw signInError;
      await navigate({ to: await destinationAfterSignIn(data.user), replace: true });
    } catch (err) {
      setError(authErrorMessage(err, "We could not sign you in just now. Please try again."));
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-ivory">
      <ApplyMasthead />
      <div className="mx-auto max-w-[620px] px-6 pt-16 pb-24">
        <Panel>
          <h1 className="font-display text-[40px] leading-[1.05] font-semibold text-charcoal sm:text-[46px]">
            Staff sign in.
          </h1>
          <p className="mt-5 text-[19px] leading-[1.6] text-charcoal">
            Sign in with your email and password.
          </p>

          <form className="mt-10 space-y-8" noValidate onSubmit={(e) => void signIn(e)}>
            <FieldShell id="login-email" label="Email">
              <input
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                className={inputClass}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(undefined);
                }}
              />
            </FieldShell>
            <FieldShell id="login-password" label="Password">
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                className={inputClass}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(undefined);
                }}
              />
            </FieldShell>

            {error && (
              <p role="alert" className="text-[15px] font-medium text-wine-red">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-5 border-t border-sand-deep/70 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <button type="submit" className={primaryButtonClass} disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
              <Link
                to="/forgot-password"
                className="text-[15px] font-medium text-burgundy underline underline-offset-4"
              >
                Forgot your password?
              </Link>
            </div>
          </form>
        </Panel>

        <p className="mt-8 text-center text-[15px] text-taupe">
          Applying to MotherlandMatch?{" "}
          <Link to="/apply" className="font-medium text-burgundy underline underline-offset-4">
            Continue your application
          </Link>
        </p>
      </div>
    </main>
  );
}
