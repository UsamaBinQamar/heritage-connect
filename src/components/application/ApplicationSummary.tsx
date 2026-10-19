import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import type { ApplicationFile } from "@/lib/matchmaker.functions";

/**
 * The full application, read-only. Staff see it on the application page;
 * applicants see their own once it is submitted. Shows answers only: status
 * and decisions are rendered by each page.
 */

export function pretty(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value);
  return text.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function Group({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[16px] border border-sand-deep/80 bg-white px-6 py-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-[24px] leading-tight font-semibold text-charcoal">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Facts({ rows }: { rows: [string, unknown][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[13px] font-semibold tracking-[0.06em] text-charcoal uppercase">
            {label}
          </dt>
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

const editClass = "text-[15px] font-medium text-burgundy underline underline-offset-4";

/** `editable`: an applicant whose application is still pending gets an Edit link per section. */
export function ApplicationSummary({
  file,
  audience,
  editable = false,
}: {
  file: ApplicationFile;
  audience: "staff" | "applicant";
  editable?: boolean;
}) {
  const edit = (
    to:
      "/apply/identity" | "/apply/life" | "/apply/relationship" | "/apply/match" | "/apply/photos",
  ) =>
    editable ? (
      <Link to={to} className={editClass}>
        Edit
      </Link>
    ) : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = file.profile;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f: any = file.facts ?? {};
  const noteTitle =
    audience === "staff" ? "Note from the applicant" : "Your note to the matchmaker";
  const photoAlt = audience === "staff" ? "Applicant photo" : "Your photo";

  return (
    <>
      <Group
        title="Contact"
        action={
          editable ? (
            <Link to="/apply" search={{ edit: 1 }} className={editClass}>
              Edit
            </Link>
          ) : undefined
        }
      >
        <Facts
          rows={[
            ["Email", p.email],
            ["Phone", p.phone],
            ["Country of residence", p.country_of_residence],
            ["Gender", p.gender],
          ]}
        />
      </Group>

      <Group title="Identity" action={edit("/apply/identity")}>
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

      <Group title="Life" action={edit("/apply/life")}>
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

      <Group title="Relationship" action={edit("/apply/relationship")}>
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

      <Group title="Partner preferences" action={edit("/apply/match")}>
        {file.preferences.length === 0 ? (
          <p className="text-[16px] text-taupe">No preferences recorded.</p>
        ) : (
          <ul className="divide-y divide-sand-deep/50">
            {file.preferences.map((pref) => (
              <li
                key={pref.attribute_key}
                className="flex flex-wrap items-baseline justify-between gap-3 py-3"
              >
                <span className="text-[15px] font-medium text-charcoal">
                  {pretty(pref.attribute_key)}
                </span>
                <span className="text-[16px] text-charcoal">
                  {pref.value ? pretty(pref.value) : pref.json ? JSON.stringify(pref.json) : "—"}
                </span>
                <span className="text-[14px] text-taupe">
                  {WEIGHT_LABEL[pref.weight] ?? pref.weight}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Group>

      <Group title={noteTitle} action={edit("/apply/match")}>
        {file.notes.length === 0 ? (
          <p className="text-[16px] text-taupe">No note left.</p>
        ) : (
          <div className="space-y-4">
            {file.notes.map((note) => (
              <p
                key={note.id}
                className="text-[16px] leading-relaxed whitespace-pre-wrap text-charcoal"
              >
                {note.body}
              </p>
            ))}
          </div>
        )}
      </Group>

      <Group title="Photos" action={edit("/apply/photos")}>
        {file.photos.length === 0 ? (
          <p className="text-[16px] text-taupe">No photos uploaded.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {file.photos.map((photo) => (
              <figure key={photo.id} className="rounded-[10px] border border-sand-deep/70 p-4">
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photoAlt}
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
    </>
  );
}
