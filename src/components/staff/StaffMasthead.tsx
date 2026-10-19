import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";

/** Header for the staff area: the wordmark, Change password and Log out. */
export function StaffMasthead() {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    // Local scope: sign out this browser only, not the person's other devices.
    await supabase.auth.signOut({ scope: "local" });
    await navigate({ to: "/login", replace: true });
  };

  return (
    <header className="border-b border-sand-deep/70 bg-ivory">
      <div className="mx-auto flex min-h-[72px] max-w-[1180px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
        <Link
          to="/matchmaker"
          className="font-display text-[18px] leading-none font-semibold tracking-[0.14em] text-charcoal uppercase sm:text-[22px]"
        >
          Motherland<span className="text-burgundy">Match</span>
        </Link>
        <nav className="flex items-center gap-5 text-[15px] font-medium">
          <Link
            to="/set-password"
            className="text-charcoal underline-offset-4 transition-colors hover:text-burgundy hover:underline"
          >
            Change password
          </Link>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void signOut()}
            className="text-burgundy underline underline-offset-4 disabled:text-taupe"
          >
            {signingOut ? "Logging out…" : "Log out"}
          </button>
        </nav>
      </div>
    </header>
  );
}
