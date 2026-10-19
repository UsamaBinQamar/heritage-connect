import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { destinationAfterSignIn, useAccount } from "@/lib/account";
import headerLockup from "@/assets/motherlandmatch-lockup.png";
import monogram from "@/assets/motherlandmatch-monogram.png";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/membership", label: "Membership" },
] as const;

export function Wordmark({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <Link
      to="/"
      className={`font-display text-[22px] leading-none font-semibold tracking-[0.14em] uppercase ${
        tone === "light" ? "text-ivory" : "text-charcoal"
      }`}
    >
      Motherland<span className={tone === "light" ? "text-gold" : "text-burgundy"}>Match</span>
    </Link>
  );
}

function HeaderLogo() {
  return (
    <Link to="/" aria-label="MotherlandMatch home" className="flex shrink-0 items-center">
      {/* Desktop / tablet: full horizontal lockup image */}
      <img src={headerLockup} alt="MotherlandMatch" className="hidden h-auto w-[260px] md:block" />
      {/* Mobile: small line-M monogram + solid-color wordmark on one row.
          Never icon-only — the name always shows. Type shrinks at the
          narrowest widths so the M, name, and menu never collide. */}
      <span className="flex shrink-0 items-center gap-2 md:hidden">
        <img src={monogram} alt="" aria-hidden className="h-[25px] w-auto min-[380px]:h-[27px]" />
        <span className="font-display text-[15px] font-semibold leading-none tracking-[0.06em] uppercase min-[380px]:text-[16px] min-[440px]:text-[17px]">
          <span className="text-charcoal">Motherland</span>
          <span className="text-burgundy">Match</span>
        </span>
      </span>
    </Link>
  );
}

export function ApplyLink({ className, children }: { className: string; children: ReactNode }) {
  return (
    <Link to="/apply" search={{}} className={className}>
      {children}
    </Link>
  );
}

export const ctaPrimary =
  "inline-flex h-[56px] items-center justify-center rounded-[10px] bg-burgundy px-8 text-[16px] font-semibold text-ivory transition-colors duration-300 hover:bg-wine";

export const ctaQuietLight =
  "inline-flex h-[56px] items-center justify-center rounded-[10px] border border-ivory/45 px-8 text-[16px] font-medium text-ivory transition-colors duration-300 hover:border-ivory hover:bg-ivory/10";

export const ctaQuietDark =
  "inline-flex h-[56px] items-center justify-center rounded-[10px] border border-sand-deep px-8 text-[16px] font-medium text-charcoal transition-colors duration-300 hover:bg-sand";

/** Log in when signed out; a way back in for applicants and staff when signed in. */
function AccountLink({ className, onClick }: { className: string; onClick?: () => void }) {
  const { state } = useAccount();
  const navigate = useNavigate();
  if (state === "loading") return null;
  if (state === "staff") {
    return (
      <Link to="/matchmaker" onClick={onClick} className={className}>
        Dashboard
      </Link>
    );
  }
  if (state === "applicant") {
    return (
      <Link
        to="/apply"
        search={{}}
        className={className}
        onClick={(event) => {
          // Go straight to the right page (next section, or the receipt) instead
          // of opening the contact step and redirecting from there.
          event.preventDefault();
          onClick?.();
          void supabase.auth.getSession().then(async ({ data }) => {
            if (!data.session) return navigate({ to: "/login" });
            return navigate({ to: await destinationAfterSignIn(data.session.user) });
          });
        }}
      >
        My application
      </Link>
    );
  }
  return (
    <Link to="/login" onClick={onClick} className={className}>
      Log in
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-sand-deep/70 bg-ivory/95 backdrop-blur">
      <div className="mx-auto flex h-[76px] max-w-[1200px] items-center justify-between gap-4 px-6 md:gap-6">
        <HeaderLogo />

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-charcoal font-semibold" }}
              inactiveProps={{ className: "text-charcoal hover:text-charcoal" }}
              className="text-[15px] transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <AccountLink className="text-[15px] font-medium text-burgundy transition-colors hover:text-wine" />
          <ApplyLink className="inline-flex h-[46px] items-center justify-center rounded-[999px] bg-burgundy px-6 text-[15px] font-semibold text-ivory transition-colors duration-300 hover:bg-wine">
            Apply Now
          </ApplyLink>
        </nav>

        <button
          type="button"
          aria-expanded={open}
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-sand-deep text-charcoal md:hidden"
        >
          <span className="sr-only">Menu</span>
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden>
            <path d="M0 1h20M0 7h20M0 13h20" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-sand-deep/70 bg-ivory md:hidden">
          <nav aria-label="Main" className="mx-auto flex max-w-[1200px] flex-col gap-1 px-6 py-4">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="py-2.5 text-[17px] text-charcoal"
              >
                {item.label}
              </Link>
            ))}
            <AccountLink
              onClick={() => setOpen(false)}
              className="py-2.5 text-[17px] font-medium text-burgundy"
            />
            <ApplyLink className="mt-3 inline-flex h-[52px] items-center justify-center rounded-[10px] bg-burgundy px-6 text-[16px] font-semibold text-ivory">
              Apply Now
            </ApplyLink>
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-sand-deep/70 bg-sand">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark />
          <p className="mt-5 max-w-[38ch] text-[16px] text-taupe">
            Private matchmaking for Africans, people of African descent, and the global African
            diaspora seeking marriage-minded partnership.
          </p>
        </div>

        <div>
          <p className="text-[13px] font-semibold tracking-[0.22em] text-gold uppercase">Site</p>
          <ul className="mt-4 space-y-2.5 text-[16px] text-charcoal">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="transition-colors hover:text-burgundy">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/contact" className="transition-colors hover:text-burgundy">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[13px] font-semibold tracking-[0.22em] text-gold uppercase">
            Your application
          </p>
          <ul className="mt-4 space-y-2.5 text-[16px] text-charcoal">
            <li>
              <ApplyLink className="transition-colors hover:text-burgundy">
                Begin your application
              </ApplyLink>
            </li>
            <li>
              <Link to="/login" className="transition-colors hover:text-burgundy">
                Log in
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-sand-deep/70">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-6 py-6 text-[14px] text-taupe sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MotherlandMatch</p>
          <p>Applications are handled privately by MotherlandMatch.</p>
        </div>
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Thin champagne rule used as jewelry above a section eyebrow. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-[13px] font-semibold tracking-[0.22em] text-gold uppercase">
      <span aria-hidden className="h-px w-10 bg-gold/70" />
      {children}
    </p>
  );
}
