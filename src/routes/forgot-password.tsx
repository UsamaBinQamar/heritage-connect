import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  ApplyMasthead,
  FieldShell,
  Panel,
  inputClass,
  primaryButtonClass,
} from "@/components/apply/ApplyChrome";
import { authErrorMessage } from "@/lib/staff-auth";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset your password | MotherlandMatch" },
      {
        name: "description",
        content: "Reset the password for your MotherlandMatch staff account.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ForgotPasswordPage,
});

const emailOk = (v: string) => /^[^\s@]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(v.trim());

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "sent">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!emailOk(email)) {
      setError("Please check the email address.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      // Supabase answers the same way whether or not the account exists, so
      // this page never reveals who has one.
      const { error: sendError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/set-password` },
      );
      if (sendError) throw sendError;
      setStep("sent");
      setResendIn(60);
    } catch (err) {
      setError(authErrorMessage(err, "We could not send the email just now. Please try again."));
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
            Reset your password.
          </h1>

          {step === "email" ? (
            <form className="mt-5" noValidate onSubmit={(e) => void send(e)}>
              <p className="text-[19px] leading-[1.6] text-charcoal">
                Enter your email and we will send you a link to choose a new password.
              </p>
              <div className="mt-10">
                <FieldShell id="forgot-email" label="Email">
                  <input
                    id="forgot-email"
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
              {error && (
                <p role="alert" className="mt-6 text-[15px] font-medium text-wine-red">
                  {error}
                </p>
              )}
              <div className="mt-10 flex flex-col gap-5 border-t border-sand-deep/70 pt-8 sm:flex-row sm:items-center sm:justify-between">
                <button type="submit" className={primaryButtonClass} disabled={busy}>
                  {busy ? "Sending…" : "Send reset link"}
                </button>
                <Link
                  to="/login"
                  className="text-[15px] font-medium text-burgundy underline underline-offset-4"
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          ) : (
            <>
              <p className="mt-5 text-[19px] leading-[1.6] text-charcoal">
                If there is an account for {email.trim().toLowerCase()}, we have sent it a link to
                choose a new password. The link works once.
              </p>
              {error && (
                <p role="alert" className="mt-6 text-[15px] font-medium text-wine-red">
                  {error}
                </p>
              )}
              <div className="mt-10 flex flex-col gap-5 border-t border-sand-deep/70 pt-8 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  className="text-left text-[15px] font-medium text-burgundy underline underline-offset-4 disabled:text-taupe disabled:no-underline"
                  disabled={busy || resendIn > 0}
                  onClick={() => void send()}
                >
                  {resendIn > 0 ? `Send again in ${resendIn}s` : "Send the email again"}
                </button>
                <Link
                  to="/login"
                  className="text-[15px] font-medium text-burgundy underline underline-offset-4"
                >
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </Panel>
      </div>
    </main>
  );
}
