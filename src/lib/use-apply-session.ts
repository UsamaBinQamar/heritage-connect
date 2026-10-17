import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

/**
 * Application steps read and write under the applicant's own session.
 *
 * A missing session on mount is NOT the same as being signed out: the client
 * restores the session asynchronously. So we wait for it (and listen for the
 * restore event) before deciding anything. Only a settled, genuinely absent
 * session sends the person back to the start, where their email brings them
 * back to the same application. Nothing is cleared, and no new application is
 * started. (Sign in at /login is for staff, who use a password.)
 *
 * Returns the session state so a step can retry a save once it is "ready".
 */
export function useApplySession(): "loading" | "ready" | "signed-out" {
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ready" | "signed-out">("loading");

  useEffect(() => {
    let cancelled = false;
    let settled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled || !session) return;
      settled = true;
      setState("ready");
    });

    void (async () => {
      // Give the client time to restore a persisted session before judging.
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const { data } = await supabase.auth.getSession();
        if (cancelled || settled) return;
        if (data.session) {
          settled = true;
          setState("ready");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      if (cancelled || settled) return;
      setState("signed-out");
      void navigate({ to: "/apply", replace: true });
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return state;
}
