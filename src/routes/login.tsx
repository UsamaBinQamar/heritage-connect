import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  ApplyMasthead,
  FieldShell,
  Panel,
  inputClass,
  primaryButtonClass,
} from "@/components/apply/ApplyChrome";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in | MotherlandMatch" },
      {
        name: "description",
        content: "Sign in to continue or check your MotherlandMatch application.",
      },
      { property: "og:title", content: "Sign in | MotherlandMatch" },
      {
        property: "og:description",
        content: "Sign in to continue or check your MotherlandMatch application.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LoginPage,
});

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

function LoginPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "verify">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const send = async () => {
    if (!emailOk(email)) {
      setError("Please enter the email address on your application.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/matchmaker`,
        },
      });
      if (sendError) throw sendError;
      setStep("verify");
      setResendIn(45);
    } catch {
      setError("We could not send an email to that address. Please check it and try again.");
    } finally {
      setBusy(false);
    }
  };


  return (
    <main className="min-h-screen bg-ivory">
      <ApplyMasthead />
      <div className="mx-auto max-w-[620px] px-6 pt-16 pb-24">
        <Panel>
          <h1 className="font-display text-[40px] leading-[1.05] font-semibold text-charcoal sm:text-[46px]">
            Welcome back.
          </h1>

          {step === "email" ? (
            <>
              <p className="mt-5 text-[19px] leading-[1.6] text-charcoal">
                Enter the email address on your application and we will send you a sign-in email.
              </p>
              <div className="mt-10">
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
              </div>
              {error && <p className="mt-6 text-[15px] font-medium text-wine-red">{error}</p>}
              <div className="mt-10 border-t border-sand-deep/70 pt-8">
                <button
                  type="button"
                  className={primaryButtonClass}
                  disabled={busy}
                  onClick={() => void send()}
                >
                  {busy ? "Sending…" : "Send sign-in email"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-5 text-[19px] leading-[1.6] text-charcoal">
                We sent an email to {email.trim().toLowerCase()}. Open it on this device and follow
                the link to continue.
              </p>
              {error && <p className="mt-6 text-[15px] font-medium text-wine-red">{error}</p>}
              <div className="mt-10 flex flex-col gap-5 border-t border-sand-deep/70 pt-8 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  className="text-[15px] font-medium text-burgundy underline underline-offset-4 disabled:text-taupe disabled:no-underline"
                  disabled={busy || resendIn > 0}
                  onClick={() => void send()}
                >
                  {resendIn > 0 ? `Send again in ${resendIn}s` : "Send the email again"}
                </button>
              </div>
            </>
          )}

        </Panel>
      </div>
    </main>
  );
}
