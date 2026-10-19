import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

/**
 * Application steps read and write under the applicant's own session.
 *
 * A missing session on mount is NOT the same as being signed out: the client
 * restores the session asynchronously. So we wait for it (and listen for the
 * restore event) before deciding anything. Only a settled, genuinely absent
 * session sends the person to log in, where they can set a password by email
 * if they never chose one. Nothing is cleared, and no new application is started.
 *
 * A submitted application is locked, so every step except the consent page
 * (which shows the receipt) sends the person there.
 *
 * Returns the session state so a step can retry a save once it is "ready".
 */
export function useApplySession(): "loading" | "ready" | "signed-out" {
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ready" | "signed-out">("loading");

  useEffect(() => {
    let cancelled = false;
    let settled = false;

    const ready = async (userId: string) => {
      if (settled) return;
      settled = true;
      setState("ready");
      if (window.location.pathname === "/apply/consent") return;
      const { data } = await supabase
        .from("profiles")
        .select("application_status")
        .eq("auth_user_id", userId)
        .is("deleted_at", null)
        .maybeSingle();
      if (!cancelled && data && data.application_status !== "draft") {
        void navigate({ to: "/apply/consent", replace: true });
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled || !session) return;
      void ready(session.user.id);
    });

    void (async () => {
      // Give the client time to restore a persisted session before judging.
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const { data } = await supabase.auth.getSession();
        if (cancelled || settled) return;
        if (data.session) {
          void ready(data.session.user.id);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      if (cancelled || settled) return;
      setState("signed-out");
      void navigate({ to: "/login", replace: true });
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return state;
}
