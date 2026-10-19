import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import {
  ApplyMasthead,
  FieldShell,
  Panel,
  inputClass,
  primaryButtonClass,
  quietButtonClass,
} from "@/components/apply/ApplyChrome";
import {
  MIN_PASSWORD_LENGTH,
  authErrorCode,
  authErrorMessage,
  destinationAfterSignIn,
  hasChosenPassword,
  passwordProblem,
  type PasswordProblem,
} from "@/lib/account";

export const Route = createFileRoute("/set-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Choose a password | MotherlandMatch" },
      {
        name: "description",
        content: "Choose the password for your MotherlandMatch account.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SetPasswordPage,
});

/**
 * One page for three arrivals: a staff member's first sign-in with a temporary password, a
 * reset link from the email, and "Change password" in the staff area. Each
 * one needs a session; the reset link creates it from the URL.
 */
function SetPasswordPage() {
  // Expired or reused links come back with the reason in the URL fragment.
  const [linkFailed] = useState(() => /(^|[#&])error(_code)?=/.test(window.location.hash));
  const [state, setState] = useState<"checking" | "ready" | "no-session" | "saved">(
    linkFailed ? "no-session" : "checking",
  );
  const [user, setUser] = useState<User | null>(null);
  const [home, setHome] = useState<"/matchmaker" | "/set-password" | "/apply">("/apply");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [problem, setProblem] = useState<PasswordProblem | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [offerReset, setOfferReset] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (linkFailed) return;
    let cancelled = false;
    void (async () => {
      // The client reads a reset link's session from the URL while it starts;
      // allow a moment for a session restored from storage as well.
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          setUser(data.session.user);
          const to = await destinationAfterSignIn(data.session.user);
          if (cancelled) return;
          setHome(to);
          setState("ready");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      if (!cancelled) setState("no-session");
    })();
    return () => {
      cancelled = true;
    };
  }, [linkFailed]);

  const firstTime = !hasChosenPassword(user);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const found = passwordProblem(password, confirm);
    setProblem(found);
    if (found) return;
    setBusy(true);
    setError(undefined);
    setOfferReset(false);
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        password,
        data: { password_set: true },
      });
      if (updateError) throw updateError;
      setHome(await destinationAfterSignIn(data.user));
      setState("saved");
    } catch (err) {
      setError(
        authErrorMessage(err, "We could not save your password just now. Please try again."),
      );
      setOfferReset(authErrorCode(err) === "reauthentication_needed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-ivory">
      <ApplyMasthead />
      <div className="mx-auto max-w-[620px] px-6 pt-16 pb-24">
        <Panel>
          {state === "checking" && <p className="text-[17px] text-taupe">One moment.</p>}

          {state === "no-session" && (
            <>
              <h1 className="font-display text-[36px] leading-tight font-semibold text-charcoal">
                This link has expired.
              </h1>
              <p className="mt-5 text-[19px] leading-[1.6] text-charcoal">
                Reset links work once and only for a short time. Ask for a new one, or sign in if
                you know your password.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link to="/forgot-password" className={primaryButtonClass}>
                  Send a new link
                </Link>
                <Link to="/login" className={quietButtonClass}>
                  Back to sign in
                </Link>
              </div>
            </>
          )}

          {state === "saved" && (
            <>
              <h1 className="font-display text-[36px] leading-tight font-semibold text-charcoal">
                Your password is saved.
              </h1>
              <p className="mt-5 text-[19px] leading-[1.6] text-charcoal">
                From now on, sign in with your email and this password.
              </p>
              <div className="mt-10">
                <Link to={home} replace className={primaryButtonClass}>
                  Continue
                </Link>
              </div>
            </>
          )}

          {state === "ready" && (
            <form noValidate onSubmit={(e) => void save(e)}>
              <h1 className="font-display text-[40px] leading-[1.05] font-semibold text-charcoal sm:text-[46px]">
                {firstTime ? "Choose your password." : "Choose a new password."}
              </h1>
              <p className="mt-5 text-[19px] leading-[1.6] text-charcoal">
                {firstTime
                  ? `You will sign in with ${user?.email ?? "your email"} and this password from now on.`
                  : `For ${user?.email ?? "your account"}.`}
              </p>

              {/* Lets password managers file the new password under the right account. */}
              <input
                type="email"
                name="email"
                autoComplete="username"
                value={user?.email ?? ""}
                readOnly
                hidden
              />

              <div className="mt-10 space-y-8">
                <FieldShell
                  id="new-password"
                  label="New password"
                  helper={`At least ${MIN_PASSWORD_LENGTH} characters.`}
                  error={problem?.field === "password" ? problem.message : undefined}
                >
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    className={inputClass}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setProblem(undefined);
                      setError(undefined);
                    }}
                  />
                </FieldShell>
                <FieldShell
                  id="confirm-password"
                  label="Type it again"
                  error={problem?.field === "confirm" ? problem.message : undefined}
                >
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    className={inputClass}
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      setProblem(undefined);
                      setError(undefined);
                    }}
                  />
                </FieldShell>
              </div>

              {error && (
                <p role="alert" className="mt-6 text-[15px] font-medium text-wine-red">
                  {error}{" "}
                  {offerReset && (
                    <Link to="/forgot-password" className="underline underline-offset-4">
                      Send a reset link
                    </Link>
                  )}
                </p>
              )}

              <div className="mt-10 flex flex-col gap-5 border-t border-sand-deep/70 pt-8 sm:flex-row sm:items-center sm:justify-between">
                <button type="submit" className={primaryButtonClass} disabled={busy}>
                  {busy ? "Saving…" : "Save password"}
                </button>
                {!firstTime && home !== "/set-password" && (
                  <Link
                    to={home}
                    className="text-[15px] font-medium text-burgundy underline underline-offset-4"
                  >
                    Cancel
                  </Link>
                )}
              </div>
            </form>
          )}
        </Panel>
      </div>
    </main>
  );
}
