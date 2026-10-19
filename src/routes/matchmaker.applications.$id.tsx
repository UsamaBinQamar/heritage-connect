import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { quietButtonClass } from "@/components/apply/ApplyChrome";
import { StaffMasthead } from "@/components/staff/StaffMasthead";
import { useLiveRefresh } from "@/lib/realtime";
import {
  ApplicationSummary,
  Facts,
  Group,
  pretty,
} from "@/components/application/ApplicationSummary";
import {
  getApplicationFile,
  setApplicationStatus,
  DECISIONS,
  type ApplicationFile,
} from "@/lib/matchmaker.functions";

export const Route = createFileRoute("/matchmaker/applications/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Application file | MotherlandMatch" },
      { name: "description", content: "Read-only review of one application." },
      { property: "og:title", content: "Application file | MotherlandMatch" },
      { property: "og:description", content: "Read-only review of one application." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ApplicationFilePage,
});

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft (reopened by the applicant)",
  submitted: "Pending review",
  accepted: "Accepted",
  waitlisted: "Waitlisted",
  declined: "Declined",
};

function ApplicationFilePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const load = useServerFn(getApplicationFile);

  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");
  const [file, setFile] = useState<ApplicationFile | null>(null);

  const refresh = async () => {
    try {
      setFile(await load({ data: { profile_id: id } }));
      setState("ready");
    } catch {
      setState("denied");
    }
  };

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        await navigate({ to: "/login", replace: true });
        return;
      }
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // The applicant's edits while pending, and other staff's decisions, appear live.
  useLiveRefresh(
    state === "ready"
      ? [
          { table: "profiles", filter: `id=eq.${id}` },
          { table: "profile_facts", filter: `profile_id=eq.${id}` },
          { table: "profile_preferences", filter: `profile_id=eq.${id}` },
          { table: "applicant_matchmaking_notes", filter: `profile_id=eq.${id}` },
          { table: "photos", filter: `profile_id=eq.${id}` },
        ]
      : null,
    () => void refresh(),
  );

  if (state === "loading") {
    return (
      <main className="min-h-screen bg-ivory">
        <StaffMasthead />
        <p className="mx-auto max-w-[1080px] px-6 py-16 text-[16px] text-taupe">Loading.</p>
      </main>
    );
  }

  if (state === "denied" || !file) {
    return (
      <main className="min-h-screen bg-ivory">
        <StaffMasthead />
        <div className="mx-auto max-w-[640px] px-6 py-20">
          <h1 className="font-display text-[34px] font-semibold text-charcoal">Not available</h1>
          <p className="mt-4 text-[17px] text-charcoal">This area is for MotherlandMatch staff.</p>
        </div>
      </main>
    );
  }

  const p: any = file.profile;
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || "Application";

  return (
    <main className="min-h-screen bg-ivory">
      <StaffMasthead />
      <div className="mx-auto max-w-[1080px] px-6 py-12">
        <div className="flex flex-wrap gap-5">
          <Link to="/matchmaker" className="text-[15px] font-medium text-burgundy">
            Back to applications
          </Link>
        </div>
        <h1 className="mt-4 font-display text-[38px] leading-tight font-semibold text-charcoal">
          {name}
        </h1>

        <div className="mt-8 grid gap-6">
          <Group title="Status">
            <Facts
              rows={[
                ["Status", STATUS_LABEL[p.application_status] ?? p.application_status],
                [
                  "Submitted",
                  p.application_submitted_at
                    ? new Date(p.application_submitted_at).toLocaleString()
                    : null,
                ],
                [
                  "Times submitted",
                  p.submission_count > 1
                    ? `${p.submission_count} (resubmitted)`
                    : p.submission_count,
                ],
                ["Last decision", p.last_decision ? STATUS_LABEL[p.last_decision] : null],
                ["Decided", p.decided_at ? new Date(p.decided_at).toLocaleString() : null],
                ["Reason shown to applicant", p.decision_reason],
              ]}
            />
          </Group>

          <ApplicationSummary file={file} audience="staff" />

          <ReviewDecision
            profileId={id}
            status={p.application_status}
            reason={p.decision_reason ?? ""}
            onChange={refresh}
          />
        </div>

        <Link to="/matchmaker" className={`${quietButtonClass} mt-10`}>
          Back to applications
        </Link>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------------------
 * Staff decision. Never rendered on an applicant screen.
 * ------------------------------------------------------------------------- */

function ReviewDecision({
  profileId,
  status,
  reason,
  onChange,
}: {
  profileId: string;
  status: string;
  reason: string;
  onChange: () => void | Promise<void>;
}) {
  const decide = useServerFn(setApplicationStatus);
  // Waitlist and decline open a reason box first; accept is recorded at once.
  const [choice, setChoice] = useState<"waitlisted" | "declined" | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const record = async (value: string, why: string) => {
    setBusy(value);
    setNotice(null);
    try {
      const { outcome } = await decide({
        data: { profile_id: profileId, status: value, reason: why },
      });
      if (outcome === "ok") {
        setNotice(
          `Status set to ${STATUS_LABEL[value]?.toLowerCase() ?? value}. The applicant can see it.`,
        );
        setChoice(null);
        await onChange();
      } else if (outcome === "reason_required") {
        setNotice("Please write a reason. The applicant will see it.");
      } else if (outcome === "not_submitted") {
        setNotice("This application has not been submitted yet.");
      } else {
        setNotice("That status could not be recorded.");
      }
    } catch {
      setNotice("That status could not be recorded.");
    } finally {
      setBusy(null);
    }
  };

  const pick = (value: string) => {
    setNotice(null);
    if (value === "accepted") {
      void record(value, "");
      return;
    }
    setChoice(value as "waitlisted" | "declined");
    setDraft(status === value ? reason : "");
  };

  return (
    <Group title="Decision">
      <p className="text-[16px] text-charcoal">
        Current status:{" "}
        <span className="font-medium">{STATUS_LABEL[status] ?? pretty(status)}</span>
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {DECISIONS.map((d) => {
          const current = d.value === status;
          const open = d.value === choice;
          return (
            <button
              key={d.value}
              type="button"
              disabled={busy !== null || (current && d.value === "accepted")}
              onClick={() => pick(d.value)}
              className={
                current || open
                  ? "rounded-[999px] bg-burgundy px-6 py-3 text-[15px] font-medium text-ivory"
                  : "rounded-[999px] border border-sand-deep bg-white px-6 py-3 text-[15px] font-medium text-charcoal disabled:cursor-not-allowed disabled:text-taupe"
              }
            >
              {busy === d.value ? "Saving" : d.label}
            </button>
          );
        })}
      </div>

      {choice && (
        <div className="mt-6">
          <label htmlFor="decision-reason" className="block text-[16px] font-medium text-charcoal">
            Reason for {choice === "waitlisted" ? "the waitlist" : "declining"}
          </label>
          <p className="mt-1 text-[14px] text-taupe">
            The applicant sees this on their application. They can change their answers and submit
            again.
          </p>
          <textarea
            id="decision-reason"
            rows={4}
            maxLength={1000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="mt-3 w-full rounded-[10px] border border-input bg-card px-4 py-3 text-[16px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy !== null || !draft.trim()}
              onClick={() => void record(choice, draft)}
              className="rounded-[999px] bg-burgundy px-6 py-3 text-[15px] font-medium text-ivory disabled:cursor-not-allowed disabled:bg-taupe"
            >
              {busy
                ? "Saving"
                : choice === "waitlisted"
                  ? "Waitlist with this reason"
                  : "Decline with this reason"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => setChoice(null)}
              className="rounded-[999px] border border-sand-deep bg-white px-6 py-3 text-[15px] font-medium text-charcoal"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {notice ? <p className="mt-4 text-[15px] text-charcoal">{notice}</p> : null}
    </Group>
  );
}
