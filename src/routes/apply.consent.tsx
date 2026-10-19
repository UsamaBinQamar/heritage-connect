import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";

import {
  ApplyMasthead,
  ApplyProgress,
  ErrorSummary,
  Panel,
  primaryButtonClass,
  quietButtonClass,
} from "@/components/apply/ApplyChrome";
import { revealField } from "@/components/apply/field";
import {
  getConsentDesk,
  reopenApplication,
  setConsent,
  submitApplication,
  type ConsentDesk,
} from "@/lib/consent.functions";
import { useApplySession } from "@/lib/use-apply-session";
import { useLiveRefresh } from "@/lib/realtime";
import { getMyApplicationFile } from "@/lib/application.functions";
import type { ApplicationFile } from "@/lib/matchmaker.functions";
import { ApplicationSummary } from "@/components/application/ApplicationSummary";
import { hasChosenPassword } from "@/lib/account";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/apply/consent")({
  head: () => ({
    meta: [
      { title: "Apply — Review and submit | MotherlandMatch" },
      {
        name: "description",
        content: "Confirm your agreements and submit your MotherlandMatch application.",
      },
      { property: "og:title", content: "Apply — Review and submit | MotherlandMatch" },
      {
        property: "og:description",
        content: "Confirm your agreements and submit your MotherlandMatch application.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConsentStage,
  errorComponent: StageProblem,
  notFoundComponent: StageProblem,
});

function StageProblem() {
  return (
    <main className="min-h-screen bg-ivory">
      <ApplyMasthead />
      <div className="mx-auto max-w-[760px] px-6 py-20">
        <Panel>
          <h1 className="font-display text-[36px] leading-tight font-semibold text-charcoal">
            This step didn&rsquo;t load
          </h1>
          <p className="mt-4 text-[17px] text-charcoal">
            Please refresh the page. Anything you had already saved is kept.
          </p>
        </Panel>
      </div>
    </main>
  );
}

const SECTION_REVIEW = [
  { key: "contact", label: "Contact", to: "/apply", search: { edit: 1 } },
  { key: "identity", label: "Identity", to: "/apply/identity" },
  { key: "life", label: "Life", to: "/apply/life" },
  { key: "relationship", label: "Relationship", to: "/apply/relationship" },
  { key: "partner_preferences", label: "Your Match", to: "/apply/match" },
  { key: "photos", label: "Photos", to: "/apply/photos" },
  { key: "consent", label: "Consent", to: "/apply/consent" },
] as const;

const CONSENT_ROWS = [
  {
    key: "data_processing",
    required: true,
    label:
      "I agree that MotherlandMatch may process the information in this application to review my profile and provide matchmaking services.",
  },
  {
    key: "matchmaking_consideration",
    required: true,
    label:
      "I agree that MotherlandMatch may use the information in my application to consider me for potential introductions.",
  },
  {
    key: "contact_followup",
    required: false,
    label: "MotherlandMatch may contact me about this application if it is incomplete.",
  },
  {
    key: "photo_use_internal",
    required: false,
    label: "MotherlandMatch may use my photos internally for matchmaking review.",
  },
] as const;

/** Short names for the required agreements, listed when Submit cannot proceed. */
const CONSENT_LABELS: Record<string, string> = {
  data_processing: "Agreement to process your application",
  matchmaking_consideration: "Agreement to be considered for introductions",
};

/** What the applicant sees once their application has left draft. */
const RECEIPT: Record<string, { label: string; title: string; body: string }> = {
  submitted: {
    label: "Pending review",
    title: "Thank you for taking the time to apply.",
    body: "Your application has been received. A MotherlandMatch matchmaker will review it carefully and we\u2019ll be in touch.",
  },
  accepted: {
    label: "Accepted",
    title: "Your application has been accepted.",
    body: "Welcome to MotherlandMatch. A matchmaker will be in touch with you personally about the next steps.",
  },
  waitlisted: {
    label: "Waitlisted",
    title: "You\u2019re on our waitlist.",
    body: "Thank you for your patience. We have kept your application and will be in touch when we can take it further.",
  },
  declined: {
    label: "Not accepted",
    title: "We\u2019re unable to accept your application right now.",
    body: "Thank you for applying to MotherlandMatch. We have read your application carefully.",
  },
};

function ConsentStage() {
  useApplySession();
  const navigate = useNavigate();
  const router = useRouter();
  const load = useServerFn(getConsentDesk);
  const save = useServerFn(setConsent);
  const submit = useServerFn(submitApplication);
  const reopen = useServerFn(reopenApplication);
  const loadFile = useServerFn(getMyApplicationFile);
  const [file, setFile] = useState<ApplicationFile | null>(null);
  const [reopening, setReopening] = useState(false);

  const [desk, setDesk] = useState<ConsentDesk | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);

  // Accepted, waitlisted and declined applications are submitted too: all of
  // them show the receipt, and none can be changed or sent again.
  const refresh = useCallback(async () => {
    const next = await load();
    setDesk(next);
    setSubmitted(next.applicationStatus !== "draft");
  }, [load]);

  // Waitlisted or declined: reopen to change answers, then submit again from here.
  const onReopen = async () => {
    setReopening(true);
    setError(null);
    try {
      await reopen();
      await refresh();
      window.scrollTo({ top: 0 });
    } catch (err) {
      console.error(err);
      setError("We could not reopen your application just now. Please try again.");
    } finally {
      setReopening(false);
    }
  };

  // A staff decision (status and reason) appears without a refresh.
  useLiveRefresh(
    desk?.profileId ? [{ table: "profiles", filter: `id=eq.${desk.profileId}` }] : null,
    () => {
      void refresh().catch((err) => console.error(err));
      if (submitted) {
        void loadFile()
          .then(setFile)
          .catch((err) => console.error(err));
      }
    },
  );

  // Once submitted, show what was sent, read-only.
  useEffect(() => {
    if (!submitted) return;
    void loadFile()
      .then(setFile)
      .catch((err) => console.error(err));
  }, [submitted, loadFile]);

  // Applicants start without a password; offer one so they can check back later.
  useEffect(() => {
    if (!submitted) return;
    void supabase.auth
      .getUser()
      .then(({ data }) => setNeedsPassword(!hasChosenPassword(data.user)));
  }, [submitted]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refresh();
      } catch (first) {
        // A session restored a moment ago can miss the first call; try once more.
        console.error(first);
        await new Promise((resolve) => setTimeout(resolve, 800));
        try {
          if (!cancelled) await refresh();
        } catch (err) {
          console.error(err);
          if (!cancelled) setError("We could not load your application just now.");
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const toggle = async (key: string, accepted: boolean) => {
    if (!desk) return;
    setDesk({ ...desk, consents: { ...desk.consents, [key]: accepted } });
    setError(null);
    setMessage("Saving…");
    try {
      await save({ data: { key, accepted } });
      await refresh();
      setMessage("Saved");
    } catch (err) {
      console.error(err);
      setMessage(null);
      setError("We could not save that just now. Please try again.");
      await refresh().catch(() => undefined);
    }
  };

  const onSubmit = async () => {
    setAttempted(true);
    if (summary.length > 0) {
      revealField(summary.map((item) => item.id));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submit({});
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError("Some parts of your application are still missing.");
      await refresh().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const consents = desk?.consents ?? {};
  const percent =
    ((Number(Boolean(consents["data_processing"])) +
      Number(Boolean(consents["matchmaking_consideration"]))) /
      2) *
    100;

  const sections = desk?.sections ?? {};
  // Consent has its own rows below, so only the other six sections count here.
  const earlierSectionsComplete = SECTION_REVIEW.filter((s) => s.key !== "consent").every(
    (s) => sections[s.key]?.complete,
  );
  const missingConsents = CONSENT_ROWS.filter((row) => row.required && !consents[row.key]);
  const summary = attempted
    ? [
        ...(earlierSectionsComplete
          ? []
          : [{ id: "sections", label: "Sections marked “Something is missing”" }]),
        ...missingConsents.map((row) => ({
          id: `consent-${row.key}`,
          label: CONSENT_LABELS[row.key] ?? row.key,
        })),
      ]
    : [];

  // Until we know the status, show neither the form nor the receipt.
  if (!loaded) {
    return (
      <main className="min-h-screen bg-ivory">
        <ApplyMasthead />
        <div className="mx-auto max-w-[760px] px-6 pt-16 pb-24 sm:pt-24">
          <Panel>
            <p className="text-[17px] text-taupe">One moment.</p>
          </Panel>
        </div>
      </main>
    );
  }

  if (submitted) {
    const status = desk?.applicationStatus ?? "submitted";
    const view = RECEIPT[status] ?? RECEIPT["submitted"]!;
    const canResubmit = status === "waitlisted" || status === "declined";
    return (
      <main className="min-h-screen bg-ivory">
        <ApplyMasthead />
        <div className="mx-auto max-w-[760px] px-6 pt-16 pb-24 sm:pt-24">
          <Panel>
            <p className="inline-flex rounded-[999px] bg-sand px-4 py-1.5 text-[14px] font-medium text-charcoal">
              Status: {view.label}
            </p>
            <h1 className="mt-6 font-display text-[44px] leading-[1.05] font-semibold text-charcoal sm:text-[52px]">
              {view.title}
            </h1>
            <p className="mt-6 max-w-[46ch] text-[19px] leading-[1.6] text-charcoal">{view.body}</p>

            {canResubmit && desk?.decisionReason && (
              <div className="mt-8 rounded-[10px] border border-sand-deep bg-white p-6">
                <p className="text-[14px] font-medium tracking-[0.12em] text-taupe uppercase">
                  From your matchmaker
                </p>
                <p className="mt-3 text-[17px] leading-[1.6] whitespace-pre-wrap text-charcoal">
                  {desk.decisionReason}
                </p>
              </div>
            )}

            {canResubmit && (
              <div className="mt-8">
                <p className="text-[16px] leading-[1.6] text-charcoal">
                  You can update your answers and send your application again. It will be reviewed
                  afresh.
                </p>
                <button
                  type="button"
                  disabled={reopening}
                  onClick={() => void onReopen()}
                  className={`${primaryButtonClass} mt-5`}
                >
                  {reopening ? "Opening…" : "Update and resubmit"}
                </button>
                {error && <p className="mt-4 text-[15px] font-medium text-wine-red">{error}</p>}
              </div>
            )}

            {needsPassword && (
              <div className="mt-10 rounded-[10px] border border-sand-deep bg-white p-6">
                <p className="text-[17px] font-semibold text-charcoal">Want to check back later?</p>
                <p className="mt-2 text-[16px] leading-[1.6] text-charcoal">
                  Set a password and you can log in from any device. This is optional.
                </p>
                <Link to="/set-password" className={`${primaryButtonClass} mt-5`}>
                  Set a password
                </Link>
              </div>
            )}
            <div className="mt-12">
              <Link to="/" className={quietButtonClass}>
                Return home
              </Link>
            </div>
          </Panel>

          <section className="mt-14">
            <h2 className="font-display text-[32px] leading-tight font-semibold text-charcoal">
              Your application
            </h2>
            <p className="mt-3 text-[16px] leading-[1.6] text-taupe">
              {status === "submitted"
                ? "This is what you sent. You can still change it until a matchmaker reviews it."
                : canResubmit
                  ? "This is what you sent. To change it, choose Update and resubmit above."
                  : "This is what you sent. It can no longer be changed."}
            </p>
            <div className="mt-8 grid gap-6">
              {file ? (
                <ApplicationSummary
                  file={file}
                  audience="applicant"
                  editable={status === "submitted"}
                />
              ) : (
                <p className="text-[16px] text-taupe">Loading your answers.</p>
              )}
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ivory">
      <ApplyMasthead />

      <div className="mx-auto max-w-[860px] px-6 pt-12 pb-24 sm:pt-16">
        <p className="text-[13px] font-medium tracking-[0.18em] text-taupe uppercase">
          Your application
        </p>
        <div className="mt-5">
          <ApplyProgress current="consent" percent={percent} />
        </div>

        <div className="mt-10">
          <Panel>
            <h1 className="font-display text-[40px] leading-[1.05] font-semibold text-charcoal sm:text-[46px]">
              Review and submit.
            </h1>
            <p className="mt-5 max-w-[48ch] text-[19px] leading-[1.6] text-charcoal">
              Please confirm the items below. You can go back and change any section first.
            </p>

            <section className="mt-12">
              <h2 className="font-display text-[24px] font-semibold text-charcoal">
                Your seven sections
              </h2>
              <ul
                data-field="sections"
                className="mt-5 divide-y divide-sand-deep/70 border-y border-sand-deep/70"
              >
                {SECTION_REVIEW.map((section) => {
                  const complete = Boolean(sections[section.key]?.complete);
                  return (
                    <li
                      key={section.key}
                      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4"
                    >
                      <span className="text-[17px] font-medium text-charcoal">{section.label}</span>
                      {complete ? (
                        <span className="text-[16px] text-charcoal">Complete</span>
                      ) : section.key === "consent" ? (
                        <span className="text-[16px] font-medium text-wine-red">
                          Still to confirm below
                        </span>
                      ) : (
                        <span className="flex items-center gap-4">
                          <span className="text-[16px] font-medium text-wine-red">
                            Something is missing
                          </span>
                          <Link
                            to={section.to}
                            search={("search" in section ? section.search : {}) as never}
                            className="text-[16px] font-medium text-burgundy underline underline-offset-4"
                          >
                            Go to {section.label}
                          </Link>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="mt-12">
              <h2 className="font-display text-[24px] font-semibold text-charcoal">
                Your agreements
              </h2>
              <div className="mt-5 space-y-4">
                {CONSENT_ROWS.map((row) => {
                  const checked = Boolean(consents[row.key]);
                  const flagged = attempted && row.required && !checked;
                  return (
                    <label
                      key={row.key}
                      data-field={`consent-${row.key}`}
                      htmlFor={`consent-${row.key}`}
                      className={`flex cursor-pointer gap-4 rounded-[16px] border bg-card px-5 py-5 transition-colors ${
                        checked
                          ? "border-burgundy"
                          : flagged
                            ? "border-wine-red hover:bg-sand/40"
                            : "border-sand-deep hover:bg-sand/40"
                      }`}
                    >
                      <input
                        id={`consent-${row.key}`}
                        type="checkbox"
                        checked={checked}
                        disabled={!loaded}
                        aria-invalid={flagged || undefined}
                        onChange={(e) => void toggle(row.key, e.target.checked)}
                        className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-burgundy)]"
                      />
                      <span>
                        <span className="block text-[17px] leading-[1.55] text-charcoal">
                          {row.label}
                        </span>
                        <span className="mt-1 block text-[14px] text-taupe">
                          {row.required ? "Required" : "Optional"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>

            <ErrorSummary items={summary} />

            {error && <p className="mt-8 text-[15px] font-medium text-wine-red">{error}</p>}

            <div className="mt-10 flex flex-col gap-4 border-t border-sand-deep/70 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[15px] text-taupe">
                Your progress is saved automatically.
                {message && <span className="ml-2 text-charcoal">{message}</span>}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center">
                <button
                  type="button"
                  className={primaryButtonClass}
                  disabled={!loaded || busy}
                  onClick={() => void onSubmit()}
                >
                  Submit application
                </button>
                <button
                  type="button"
                  className={quietButtonClass}
                  onClick={() => {
                    void navigate({ to: "/apply/photos" });
                    router.invalidate();
                  }}
                >
                  Back
                </button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
