import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { ApplyMasthead, quietButtonClass } from "@/components/apply/ApplyChrome";
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

function pretty(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value);
  return text.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[16px] border border-sand-deep/80 bg-white px-6 py-7">
      <h2 className="font-display text-[24px] leading-tight font-semibold text-charcoal">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Facts({ rows }: { rows: [string, unknown][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[13px] font-semibold tracking-[0.06em] text-charcoal uppercase">{label}</dt>
          <dd className="mt-1 text-[16px] text-charcoal">{pretty(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

const WEIGHT_LABEL: Record<string, string> = {
  must_have: "Must have",
  strong_preference: "Strong preference",
  nice_to_have: "Nice to have",
  does_not_matter: "Does not matter",
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

  if (state === "loading") {
    return (
      <main className="min-h-screen bg-ivory">
        <ApplyMasthead />
        <p className="mx-auto max-w-[1080px] px-6 py-16 text-[16px] text-taupe">Loading.</p>
      </main>
    );
  }

  if (state === "denied" || !file) {
    return (
      <main className="min-h-screen bg-ivory">
        <ApplyMasthead />
        <div className="mx-auto max-w-[640px] px-6 py-20">
          <h1 className="font-display text-[34px] font-semibold text-charcoal">Not available</h1>
          <p className="mt-4 text-[17px] text-charcoal">This area is for MotherlandMatch staff.</p>
        </div>
      </main>
    );
  }

  const p: any = file.profile;
  const f: any = file.facts ?? {};
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || "Application";

  return (
    <main className="min-h-screen bg-ivory">
      <ApplyMasthead />
      <div className="mx-auto max-w-[1080px] px-6 py-12">
        <div className="flex flex-wrap gap-5">
          <Link to="/matchmaker" className="text-[15px] font-medium text-burgundy">
            Back to applications
          </Link>
        </div>
        <h1 className="mt-4 font-display text-[38px] leading-tight font-semibold text-charcoal">{name}</h1>

        <div className="mt-8 grid gap-6">
          <Group title="Status">
            <Facts
              rows={[
                ["Status", p.application_status],
                ["Submitted", p.application_submitted_at ? new Date(p.application_submitted_at).toLocaleString() : null],
              ]}
            />
          </Group>

          <Group title="Contact">
            <Facts
              rows={[
                ["Email", p.email],
                ["Phone", p.phone],
                ["Country of residence", p.country_of_residence],
                ["Gender", p.gender],
              ]}
            />
          </Group>

          <Group title="Identity">
            <Facts
              rows={[
                ["Date of birth", p.date_of_birth],
                ["City", f.city],
                ["State or region", f.state_or_region],
                ["Nationality", f.nationality],
                ["Country of origin", f.country_of_origin],
                ["Cultural backgrounds", f.cultural_backgrounds],
                ["Other background", f.cultural_background_other_label],
                ["Languages", f.languages],
                ["Height (cm)", f.height_cm],
              ]}
            />
          </Group>

          <Group title="Life">
            <Facts
              rows={[
                ["Education", f.education_level],
                ["Field of study", f.field_of_study],
                ["Employment", f.employment_status],
                ["Profession", f.profession_category],
                ["Job title", f.job_title],
                ["Industry", f.industry],
                ["Has children", f.has_children],
                ["Number of children", f.number_of_children],
                ["Children living", f.children_living_status],
                ["Wants children", f.wants_children],
                ["Legal status", f.current_legal_status],
                ["Marital history", f.marital_history],
                ["Smoking", f.smoking],
                ["Drinking", f.drinking],
                ["Religion", f.religion],
                ["Denomination", f.denomination_or_faith_tradition],
                ["Faith observance", f.faith_observance],
              ]}
            />
          </Group>

          <Group title="Relationship">
            <Facts
              rows={[
                ["Looking for", f.looking_for],
                ["Marriage timeline", f.marriage_timeline],
                ["Willing to relocate", f.willing_to_relocate],
                ["Would relocate to", f.countries_would_relocate_to],
                ["Open to long distance", f.open_to_long_distance],
                ["Would date from", f.countries_would_date_from],
                ["Introduction style", f.introduction_style],
              ]}
            />
          </Group>

          <Group title="Partner preferences">
            {file.preferences.length === 0 ? (
              <p className="text-[16px] text-taupe">No preferences recorded.</p>
            ) : (
              <ul className="divide-y divide-sand-deep/50">
                {file.preferences.map((pref) => (
                  <li key={pref.attribute_key} className="flex flex-wrap items-baseline justify-between gap-3 py-3">
                    <span className="text-[15px] font-medium text-charcoal">{pretty(pref.attribute_key)}</span>
                    <span className="text-[16px] text-charcoal">
                      {pref.value
                        ? pretty(pref.value)
                        : pref.json
                          ? JSON.stringify(pref.json)
                          : "—"}
                    </span>
                    <span className="text-[14px] text-taupe">{WEIGHT_LABEL[pref.weight] ?? pref.weight}</span>
                  </li>
                ))}
              </ul>
            )}
          </Group>

          <Group title="Note from the applicant">
            {file.notes.length === 0 ? (
              <p className="text-[16px] text-taupe">No note left.</p>
            ) : (
              <div className="space-y-4">
                {file.notes.map((note) => (
                  <p key={note.id} className="text-[16px] leading-relaxed whitespace-pre-wrap text-charcoal">
                    {note.body}
                  </p>
                ))}
              </div>
            )}
          </Group>

          <Group title="Photos">
            {file.photos.length === 0 ? (
              <p className="text-[16px] text-taupe">No photos uploaded.</p>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {file.photos.map((photo) => (
                  <figure key={photo.id} className="rounded-[10px] border border-sand-deep/70 p-4">
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt="Applicant photo"
                        className="h-[240px] w-full rounded-[10px] object-cover"
                      />
                    ) : (
                      <div className="flex h-[240px] w-full items-center justify-center rounded-[10px] bg-sand text-[14px] text-taupe">
                        Unavailable
                      </div>
                    )}
                  </figure>
                ))}
              </div>
            )}
          </Group>

          <ReviewDecision profileId={id} status={p.application_status} onChange={refresh} />
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
  onChange,
}: {
  profileId: string;
  status: string;
  onChange: () => void | Promise<void>;
}) {
  const decide = useServerFn(setApplicationStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onDecide = async (value: string) => {
    setBusy(value);
    setNotice(null);
    try {
      const { outcome } = await decide({ data: { profile_id: profileId, status: value } });
      if (outcome === "ok") {
        setNotice(`Status set to ${pretty(value).toLowerCase()}.`);
        await onChange();
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

  return (
    <Group title="Decision">
      <p className="text-[16px] text-charcoal">
        Current status: <span className="font-medium">{pretty(status)}</span>
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {DECISIONS.map((d) => (
          <button
            key={d.value}
            type="button"
            disabled={busy !== null || d.value === status}
            onClick={() => void onDecide(d.value)}
            className={
              d.value === status
                ? "rounded-[999px] bg-burgundy px-6 py-3 text-[15px] font-medium text-ivory"
                : "rounded-[999px] border border-sand-deep bg-white px-6 py-3 text-[15px] font-medium text-charcoal disabled:cursor-not-allowed disabled:text-taupe"
            }
          >
            {busy === d.value ? "Saving" : d.label}
          </button>
        ))}
      </div>
      {notice ? <p className="mt-4 text-[15px] text-charcoal">{notice}</p> : null}
    </Group>
  );
}
