import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { quietButtonClass, selectClass } from "@/components/apply/ApplyChrome";
import { StaffMasthead } from "@/components/staff/StaffMasthead";
import { useLiveRefresh } from "@/lib/realtime";
import { listApplications, type ApplicationRow } from "@/lib/matchmaker.functions";

export const Route = createFileRoute("/matchmaker/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Applications | MotherlandMatch" },
      { name: "description", content: "Submitted applications for staff review." },
      { property: "og:title", content: "Applications | MotherlandMatch" },
      { property: "og:description", content: "Submitted applications for staff review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ApplicationsPage,
});

function ageFrom(dob: string | null): string {
  if (!dob) return "—";
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return Number.isFinite(age) ? String(age) : "—";
}

const GENDER_LABEL: Record<string, string> = {
  woman: "Woman",
  man: "Man",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "Pending review",
  accepted: "Accepted",
  waitlisted: "Waitlisted",
  declined: "Declined",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ApplicationsPage() {
  const navigate = useNavigate();
  const load = useServerFn(listApplications);

  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");
  const [applications, setApplications] = useState<ApplicationRow[]>([]);

  const [status, setStatus] = useState<
    "all" | "submitted" | "accepted" | "waitlisted" | "declined"
  >("all");
  const [gender, setGender] = useState<"all" | "woman" | "man" | "other" | "prefer_not_to_say">(
    "all",
  );

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        await navigate({ to: "/login", replace: true });
        return;
      }
      try {
        setApplications(await load());
        setState("ready");
      } catch {
        setState("denied");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New submissions, resubmissions and decisions by other staff appear live.
  useLiveRefresh(state === "ready" ? [{ table: "profiles" }] : null, () => {
    void load()
      .then(setApplications)
      .catch((err) => console.error(err));
  });

  const rows = useMemo(
    () =>
      applications.filter((r) => {
        if (status !== "all" && r.application_status !== status) return false;
        if (gender !== "all" && r.gender !== gender) return false;
        return true;
      }),
    [applications, status, gender],
  );

  if (state === "loading") {
    return (
      <main className="min-h-screen bg-ivory">
        <StaffMasthead />
        <p className="mx-auto max-w-[1080px] px-6 py-16 text-[16px] text-taupe">Loading.</p>
      </main>
    );
  }

  if (state === "denied") {
    return (
      <main className="min-h-screen bg-ivory">
        <StaffMasthead />
        <div className="mx-auto max-w-[640px] px-6 py-20">
          <h1 className="font-display text-[34px] leading-tight font-semibold text-charcoal">
            Not available
          </h1>
          <p className="mt-4 text-[17px] text-charcoal">This area is for MotherlandMatch staff.</p>
          <Link to="/" className={`${quietButtonClass} mt-8`}>
            Return to the website
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ivory">
      <StaffMasthead />
      <div className="mx-auto max-w-[1180px] px-6 py-12">
        <h1 className="font-display text-[34px] leading-tight font-semibold text-charcoal">
          Applications
        </h1>
        <p className="mt-2 text-[16px] text-charcoal">
          Submitted applications, newest first. {rows.length} shown.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <label className="text-[14px] font-medium text-charcoal">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className={`${selectClass} mt-1.5 h-[46px] w-[200px] text-[15px]`}
            >
              <option value="all">All</option>
              <option value="submitted">Pending review</option>
              <option value="accepted">Accepted</option>
              <option value="waitlisted">Waitlisted</option>
              <option value="declined">Declined</option>
            </select>
          </label>
          <label className="text-[14px] font-medium text-charcoal">
            Gender
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as typeof gender)}
              className={`${selectClass} mt-1.5 h-[46px] w-[200px] text-[15px]`}
            >
              <option value="all">All</option>
              <option value="woman">Woman</option>
              <option value="man">Man</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </label>
        </div>

        <div className="mt-8 overflow-x-auto rounded-[16px] border border-sand-deep/80 bg-white">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-sand-deep/80 text-[13px] font-semibold tracking-[0.06em] text-charcoal uppercase">
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Gender</th>
                <th className="px-5 py-4">Age</th>
                <th className="px-5 py-4">Location</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Submitted</th>
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-[16px] text-taupe">
                    No applications to show.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.profile_id}
                    className="border-b border-sand-deep/50 last:border-0 align-middle"
                  >
                    <td className="px-5 py-4 text-[16px] font-medium text-charcoal">
                      {[row.first_name, row.last_name].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-5 py-4 text-[15px] text-charcoal">
                      {row.gender ? (GENDER_LABEL[row.gender] ?? row.gender) : "—"}
                    </td>
                    <td className="px-5 py-4 text-[15px] text-charcoal tabular-nums">
                      {ageFrom(row.date_of_birth)}
                    </td>
                    <td className="px-5 py-4 text-[15px] text-charcoal">
                      {[row.city, row.state_or_region, row.country_of_residence]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>
                    <td className="px-5 py-4 text-[15px] text-charcoal">
                      {STATUS_LABEL[row.application_status] ?? row.application_status}
                    </td>
                    <td className="px-5 py-4 text-[15px] text-charcoal">
                      {formatDate(row.submitted_at)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <Link
                          to="/matchmaker/applications/$id"
                          params={{ id: row.profile_id }}
                          className={`${quietButtonClass} h-[42px] px-4 text-[15px]`}
                        >
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
