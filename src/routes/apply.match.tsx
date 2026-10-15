import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  EMPTY_MATCH,
  getMyMatch,
  listMatchCatalogs,
  saveMatch,
  type MatchValues,
  type Weight,
} from "@/lib/match.functions";
import { ChoiceGroup } from "@/components/apply/ChoiceGroup";
import { MultiSelect } from "@/components/apply/MultiSelect";
import { WeightControl } from "@/components/apply/WeightControl";
import {
  ApplyMasthead,
  ApplyProgress,
  ErrorSummary,
  FieldShell,
  Panel,
  inputClass,
  primaryButtonClass,
  quietButtonClass,
} from "@/components/apply/ApplyChrome";
import { orderByPage, revealField } from "@/components/apply/field";
import { useApplySession } from "@/lib/use-apply-session";

const catalogsQuery = queryOptions({
  queryKey: ["match-catalogs"],
  queryFn: () => listMatchCatalogs(),
  staleTime: 1000 * 60 * 60,
});

export const Route = createFileRoute("/apply/match")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogsQuery),
  head: () => ({
    meta: [
      { title: "Apply — Your Match | MotherlandMatch" },
      {
        name: "description",
        content: "Tell your matchmaker who you hope to meet, and what genuinely matters to you.",
      },
      { property: "og:title", content: "Apply — Your Match | MotherlandMatch" },
      {
        property: "og:description",
        content: "Tell your matchmaker who you hope to meet, and what genuinely matters to you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MatchStage,
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

const GENDER_CHOICES = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
];

const GEOGRAPHY_CHOICES = [
  { value: "specific", label: "Specific countries" },
  { value: "anywhere", label: "Anywhere" },
  { value: "exclude_only", label: "Exclude only" },
];

const EDUCATION_CHOICES = [
  { value: "secondary", label: "Secondary" },
  { value: "vocational", label: "Vocational" },
  { value: "bachelors", label: "Bachelor's" },
  { value: "masters", label: "Master's" },
  { value: "doctorate", label: "Doctorate" },
];

const EMPLOYMENT_OPTIONS = [
  { id: "employed", label: "Employed" },
  { id: "self_employed", label: "Self-employed" },
  { id: "business_owner", label: "Business owner" },
  { id: "student", label: "Student" },
  { id: "not_working", label: "Not working" },
];

const FAITH_CHOICES = [
  { value: "not_important", label: "Not important" },
  { value: "somewhat", label: "Somewhat" },
  { value: "important", label: "Important" },
  { value: "central", label: "Central" },
];

const HAS_CHILDREN_CHOICES = [
  { value: "no", label: "No children" },
  { value: "yes", label: "Has children" },
  { value: "either", label: "Either is fine" },
];

const WANTS_CHILDREN_CHOICES = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "open", label: "Open" },
  { value: "either", label: "Either is fine" },
];

const MARITAL_OPTIONS = [
  { id: "never_married", label: "Never married" },
  { id: "divorced", label: "Divorced" },
  { id: "widowed", label: "Widowed" },
];

const SMOKING_CHOICES = [
  { value: "never", label: "Never" },
  { value: "sometimes_ok", label: "Sometimes is fine" },
  { value: "any", label: "Does not matter" },
];

const DRINKING_CHOICES = [
  { value: "never", label: "Never" },
  { value: "socially_ok", label: "Socially is fine" },
  { value: "any", label: "Does not matter" },
];

const RELOCATION_CHOICES = [
  { value: "must_relocate_ok", label: "Open to relocating" },
  { value: "must_live_near_me", label: "Should live near me" },
  { value: "flexible", label: "Flexible" },
];

const LONG_DISTANCE_CHOICES = [
  { value: "ok", label: "Fine with me" },
  { value: "not_ok", label: "Not for me" },
  { value: "short_term_ok", label: "Short term only" },
];

const TIMELINE_CHOICES = [
  { value: "ready_now", label: "Ready now" },
  { value: "within_1_year", label: "Within a year" },
  { value: "within_2_years", label: "Within two years" },
  { value: "unhurried", label: "Unhurried" },
];

type Errors = { [key: string]: string | undefined };

function validate(values: MatchValues): Errors {
  const errors: Errors = {};
  if (!values.partner_gender) errors["partner_gender"] = "Please choose one.";

  if (values.partner_age_weight === "does_not_matter") {
    // A stated "does not matter" is a complete answer.
  } else if (values.partner_age_min == null || values.partner_age_max == null) {
    errors["partner_age_range"] = "Please give an age range, or mark it as not mattering.";
  } else if (values.partner_age_min > values.partner_age_max) {
    errors["partner_age_range"] = "The lowest age must not be above the highest.";
  }

  if (!values.partner_geography_mode) errors["partner_geography_mode"] = "Please choose one.";
  if (values.partner_geography_mode === "specific" && values.partner_countries.length === 0) {
    errors["partner_countries"] = "Please choose at least one country.";
  }
  if (
    values.partner_geography_mode === "exclude_only" &&
    values.partner_countries_excluded.length === 0
  ) {
    errors["partner_countries_excluded"] = "Please choose at least one country to exclude.";
  }

  if (
    values.partner_height_weight !== "does_not_matter" &&
    values.partner_height_min != null &&
    values.partner_height_max != null &&
    values.partner_height_min > values.partner_height_max
  ) {
    errors["partner_height_range"] = "The shortest height must not be above the tallest.";
  }
  return errors;
}

/** Plain names for the checked answers, listed when Continue cannot proceed. */
const FIELD_LABELS: Record<string, string> = {
  partner_gender: "Who you hope to meet",
  partner_age_range: "Age range",
  partner_height_range: "Height range",
  partner_geography_mode: "Place",
  partner_countries: "Countries you would consider",
  partner_countries_excluded: "Countries to rule out",
};

/** Only the required answers of this section count towards its completeness. */
const REQUIRED_KEYS = [
  "partner_gender",
  "partner_age_range",
  "partner_geography_mode",
  "partner_countries",
  "partner_countries_excluded",
];

function Group({
  title,
  intro,
  quiet,
  children,
}: {
  title: string;
  intro?: string;
  quiet?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`border-t border-sand-deep/70 pt-9 first:border-t-0 first:pt-0 ${
        quiet ? "rounded-[16px] border border-sand-deep/60 bg-sand/30 p-7 sm:p-8" : ""
      }`}
    >
      <h2 className="font-display text-[24px] leading-tight font-semibold text-charcoal">
        {title}
      </h2>
      {intro && <p className="mt-2 text-[15px] text-taupe">{intro}</p>}
      <div className="mt-6 space-y-8">{children}</div>
    </section>
  );
}

/** Small chip entry for free-text city names. */
function TokenInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const token = draft.trim();
    if (!token) return;
    if (!value.includes(token) && value.length < 20) onChange([...value, token]);
    setDraft("");
  };

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {value.map((city) => (
            <li key={city}>
              <button
                type="button"
                onClick={() => onChange(value.filter((c) => c !== city))}
                aria-label={`Remove ${city}`}
                className="inline-flex items-center gap-2 rounded-full border border-burgundy/40 bg-sand px-4 py-2 text-[15px] font-medium text-charcoal transition-colors hover:bg-sand-deep"
              >
                {city}
                <span aria-hidden className="text-burgundy">
                  ×
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        type="text"
        value={draft}
        placeholder={placeholder}
        className={inputClass}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
        }}
      />
    </div>
  );
}

function MatchStage() {
  useApplySession();
  const { data: catalogs } = useSuspenseQuery(catalogsQuery);
  const navigate = useNavigate();
  const router = useRouter();
  const load = useServerFn(getMyMatch);
  const save = useServerFn(saveMatch);

  const [values, setValues] = useState<MatchValues>(EMPTY_MATCH);
  const [errors, setErrors] = useState<Errors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [loaded, setLoaded] = useState(false);
  const [wantsExclusions, setWantsExclusions] = useState(false);
  const lastSaved = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await load();
        if (!cancelled && data) {
          setValues(data);
          setWantsExclusions(data.partner_countries_excluded.length > 0);
          lastSaved.current = JSON.stringify(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const found = useMemo(() => validate(values), [values]);

  // Answers flagged on Continue drop out of the summary as soon as they are fixed.
  const summary = missing
    .filter((key) => found[key])
    .map((key) => ({ id: key, label: FIELD_LABELS[key] ?? key }));

  const percent = useMemo(() => {
    const relevant = REQUIRED_KEYS.filter((key) => {
      if (key === "partner_countries") return values.partner_geography_mode === "specific";
      if (key === "partner_countries_excluded")
        return values.partner_geography_mode === "exclude_only";
      return true;
    });
    const done = relevant.filter((key) => !found[key]).length;
    return Math.round((done / relevant.length) * 100);
  }, [found, values.partner_geography_mode]);

  const persist = useCallback(async () => {
    const signature = JSON.stringify(values);
    if (signature === lastSaved.current) return true;
    setSaveState("saving");
    try {
      await save({ data: values });
      lastSaved.current = signature;
      setSaveState("saved");
      return true;
    } catch (error) {
      console.error(error);
      setSaveState("failed");
      return false;
    }
  }, [save, values]);

  // Field-level autosave, debounced so typing never becomes an audit trail.
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      void persist();
    }, 1200);
    return () => clearTimeout(timer);
  }, [loaded, persist]);

  const set = <K extends keyof MatchValues>(key: K, value: MatchValues[K]) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // Stale dependents can never survive a change to what controls them.
      if (key === "partner_geography_mode") {
        if (value === "anywhere") {
          next.partner_countries = [];
          next.partner_cities = [];
          next.partner_countries_excluded = [];
        }
        if (value === "exclude_only") {
          next.partner_countries = [];
          next.partner_cities = [];
        }
      }
      if (key === "partner_has_children" && value === "no") {
        next.partner_max_existing_children = null;
      }
      return next;
    });
    if (key === "partner_geography_mode" && value === "anywhere") setWantsExclusions(false);
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
  };

  const setWeight = (key: keyof MatchValues, weight: Weight) =>
    set(key, weight as MatchValues[typeof key]);

  const err = (key: string) => (showErrors ? found[key] : undefined);

  const onContinue = async () => {
    setShowErrors(true);
    setErrors(found);
    const problems = orderByPage(Object.keys(found));
    setMissing(problems);
    if (problems.length > 0) {
      revealField(problems);
      return;
    }
    const ok = await persist();
    if (!ok) {
      setErrors({ form: "We could not save your preferences just now. Please try again." });
      return;
    }
    await navigate({ to: "/apply/photos" });
  };

  const goBack = async () => {
    await persist();
    await navigate({ to: "/apply/relationship" });
    router.invalidate();
  };

  const mode = values.partner_geography_mode;
  const showCountries = mode === "specific";
  const showExcluded = mode === "exclude_only" || (mode === "specific" && wantsExclusions);
  const showCities = mode === "specific";
  const hasChildren = values.partner_has_children;
  const showMaxChildren = hasChildren === "yes" || hasChildren === "either";
  const culturalOther = values.partner_cultural_backgrounds.includes("other");

  const numberField = (key: keyof MatchValues, label: string, min: number, max: number) => (
    <label className="flex-1">
      <span className="block text-[15px] font-medium text-charcoal">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={(values[key] as number | null) ?? ""}
        onChange={(e) =>
          set(key, (e.target.value === "" ? null : Number(e.target.value)) as MatchValues[typeof key])
        }
        className={`mt-2 ${inputClass}`}
      />
    </label>
  );

  return (
    <main className="min-h-screen bg-ivory">
      <ApplyMasthead />

      <div className="mx-auto max-w-[860px] px-6 pt-12 pb-24 sm:pt-16">
        <p className="text-[13px] font-medium tracking-[0.18em] text-taupe uppercase">
          Your application
        </p>
        <div className="mt-5">
          <ApplyProgress current="partner_preferences" percent={percent} />
        </div>

        <div className="mt-10">
          <Panel>
            <h1 className="font-display text-[40px] leading-[1.05] font-semibold text-charcoal sm:text-[46px]">
              Who you hope to meet.
            </h1>
            <p className="mt-5 max-w-[48ch] text-[19px] leading-[1.6] text-charcoal">
              Tell us what matters. If it does not matter, say so.
            </p>

            <div className="mt-12 space-y-10">
              <Group title="Who">
                <FieldShell id="partner_gender" label="You hope to meet" error={err("partner_gender")}>
                  <ChoiceGroup
                    name="You hope to meet"
                    options={GENDER_CHOICES}
                    value={values.partner_gender}
                    onChange={(next) => set("partner_gender", next)}
                  />
                </FieldShell>

                <FieldShell
                  id="partner_age_range"
                  label="Age range"
                  helper="Between 20 and 80."
                  error={err("partner_age_range")}
                >
                  {values.partner_age_weight !== "does_not_matter" && (
                    <div className="flex flex-col gap-4 sm:flex-row">
                      {numberField("partner_age_min", "From", 20, 80)}
                      {numberField("partner_age_max", "To", 20, 80)}
                    </div>
                  )}
                  <WeightControl
                    name="Age range"
                    value={values.partner_age_weight}
                    onChange={(w) => setWeight("partner_age_weight", w)}
                  />
                </FieldShell>

                <FieldShell
                  id="partner_height_range"
                  label="Height range"
                  helper="Optional, in centimetres."
                  error={err("partner_height_range")}
                >
                  {values.partner_height_weight !== "does_not_matter" && (
                    <div className="flex flex-col gap-4 sm:flex-row">
                      {numberField("partner_height_min", "From (cm)", 120, 220)}
                      {numberField("partner_height_max", "To (cm)", 120, 220)}
                    </div>
                  )}
                  <WeightControl
                    name="Height range"
                    value={values.partner_height_weight}
                    onChange={(w) => setWeight("partner_height_weight", w)}
                  />
                </FieldShell>
              </Group>

              <Group title="Place" intro="Where they live now, not where their family is from.">
                <FieldShell
                  id="partner_geography_mode"
                  label="How you think about place"
                  error={err("partner_geography_mode")}
                >
                  <ChoiceGroup
                    name="How you think about place"
                    options={GEOGRAPHY_CHOICES}
                    value={values.partner_geography_mode}
                    onChange={(next) => set("partner_geography_mode", next)}
                    columns={3}
                  />
                </FieldShell>

                {showCountries && (
                  <FieldShell
                    id="partner_countries"
                    label="Countries you would consider"
                    error={err("partner_countries")}
                  >
                    <MultiSelect
                      id="partner_countries"
                      options={catalogs.countries}
                      value={values.partner_countries}
                      onChange={(next) => set("partner_countries", next)}
                      searchPlaceholder="Search countries"
                    />
                    <WeightControl
                      name="Countries you would consider"
                      value={values.partner_countries_weight}
                      onChange={(w) => setWeight("partner_countries_weight", w)}
                    />
                  </FieldShell>
                )}

                {mode === "specific" && !wantsExclusions && (
                  <button
                    type="button"
                    onClick={() => setWantsExclusions(true)}
                    className="text-[15px] font-medium text-burgundy underline underline-offset-4"
                  >
                    Add countries to rule out
                  </button>
                )}

                {showExcluded && (
                  <FieldShell
                    id="partner_countries_excluded"
                    label="Countries to rule out"
                    helper="A firm exclusion, not a preference."
                    error={err("partner_countries_excluded")}
                  >
                    <MultiSelect
                      id="partner_countries_excluded"
                      options={catalogs.countries}
                      value={values.partner_countries_excluded}
                      onChange={(next) => set("partner_countries_excluded", next)}
                      searchPlaceholder="Search countries"
                    />
                  </FieldShell>
                )}

                {showCities && (
                  <FieldShell
                    id="partner_cities"
                    label="Cities, if you have any in mind"
                    helper="Optional. Press Enter after each city."
                  >
                    <TokenInput
                      id="partner_cities"
                      value={values.partner_cities}
                      onChange={(next) => set("partner_cities", next)}
                      placeholder="Accra"
                    />
                  </FieldShell>
                )}
              </Group>

              <Group title="Background" intro="All optional.">
                <FieldShell id="partner_nationalities" label="Nationalities">
                  <MultiSelect
                    id="partner_nationalities"
                    options={catalogs.countries}
                    value={values.partner_nationalities}
                    onChange={(next) => set("partner_nationalities", next)}
                    searchPlaceholder="Search nationalities"
                  />
                  {values.partner_nationalities.length > 0 && (
                    <WeightControl
                      name="Nationalities"
                      value={values.partner_nationalities_weight}
                      onChange={(w) => setWeight("partner_nationalities_weight", w)}
                    />
                  )}
                </FieldShell>

                <FieldShell
                  id="partner_cultural_backgrounds"
                  label="Cultural backgrounds"
                  helper={
                    culturalOther
                      ? "You chose Other. Your matchmaker will ask you about it directly."
                      : undefined
                  }
                >
                  <MultiSelect
                    id="partner_cultural_backgrounds"
                    options={catalogs.cultural_backgrounds}
                    value={values.partner_cultural_backgrounds}
                    onChange={(next) => set("partner_cultural_backgrounds", next)}
                    searchPlaceholder="Search backgrounds"
                  />
                  {values.partner_cultural_backgrounds.length > 0 && (
                    <WeightControl
                      name="Cultural backgrounds"
                      value={values.partner_cultural_backgrounds_weight}
                      onChange={(w) => setWeight("partner_cultural_backgrounds_weight", w)}
                    />
                  )}
                </FieldShell>

                <FieldShell id="partner_languages" label="Languages">
                  <MultiSelect
                    id="partner_languages"
                    options={catalogs.languages}
                    value={values.partner_languages}
                    onChange={(next) => set("partner_languages", next)}
                    searchPlaceholder="Search languages"
                  />
                  {values.partner_languages.length > 0 && (
                    <WeightControl
                      name="Languages"
                      value={values.partner_languages_weight}
                      onChange={(w) => setWeight("partner_languages_weight", w)}
                    />
                  )}
                </FieldShell>
              </Group>

              <Group
                title="Education, work and faith"
                intro="Only if these genuinely shape who you could build a life with."
                quiet
              >
                <FieldShell id="partner_education_min" label="Education, at least">
                  {values.partner_education_min_weight !== "does_not_matter" && (
                    <ChoiceGroup
                      name="Education, at least"
                      options={EDUCATION_CHOICES}
                      value={values.partner_education_min}
                      onChange={(next) => set("partner_education_min", next)}
                      columns={3}
                    />
                  )}
                  <WeightControl
                    name="Education"
                    value={values.partner_education_min_weight}
                    onChange={(w) => setWeight("partner_education_min_weight", w)}
                  />
                </FieldShell>

                <FieldShell id="partner_employment_status" label="Working life">
                  {values.partner_employment_status_weight !== "does_not_matter" && (
                    <MultiSelect
                      id="partner_employment_status"
                      options={EMPLOYMENT_OPTIONS}
                      value={values.partner_employment_status}
                      onChange={(next) => set("partner_employment_status", next)}
                      searchPlaceholder="Search"
                    />
                  )}
                  <WeightControl
                    name="Working life"
                    value={values.partner_employment_status_weight}
                    onChange={(w) => setWeight("partner_employment_status_weight", w)}
                  />
                </FieldShell>

                <FieldShell id="partner_profession_category" label="Fields of work">
                  <MultiSelect
                    id="partner_profession_category"
                    options={catalogs.profession_categories}
                    value={values.partner_profession_category}
                    onChange={(next) => set("partner_profession_category", next)}
                    searchPlaceholder="Search fields"
                  />
                </FieldShell>

                <FieldShell id="partner_industry" label="Industries">
                  <MultiSelect
                    id="partner_industry"
                    options={catalogs.industries}
                    value={values.partner_industry}
                    onChange={(next) => set("partner_industry", next)}
                    searchPlaceholder="Search industries"
                  />
                </FieldShell>

                <FieldShell id="partner_religion" label="Faith">
                  {values.partner_religion_weight !== "does_not_matter" && (
                    <MultiSelect
                      id="partner_religion"
                      options={catalogs.religions}
                      value={values.partner_religion}
                      onChange={(next) => set("partner_religion", next)}
                      searchPlaceholder="Search faiths"
                    />
                  )}
                  <WeightControl
                    name="Faith"
                    value={values.partner_religion_weight}
                    onChange={(w) => setWeight("partner_religion_weight", w)}
                  />
                </FieldShell>

                <FieldShell
                  id="partner_faith_observance_min"
                  label="How much faith shapes their daily life, at least"
                >
                  {values.partner_faith_observance_min_weight !== "does_not_matter" && (
                    <ChoiceGroup
                      name="Faith observance"
                      options={FAITH_CHOICES}
                      value={values.partner_faith_observance_min}
                      onChange={(next) => set("partner_faith_observance_min", next)}
                      columns={4}
                    />
                  )}
                  <WeightControl
                    name="Faith observance"
                    value={values.partner_faith_observance_min_weight}
                    onChange={(w) => setWeight("partner_faith_observance_min_weight", w)}
                  />
                </FieldShell>
              </Group>

              <Group title="Family and life together">
                <FieldShell id="partner_has_children" label="Children already">
                  {values.partner_has_children_weight !== "does_not_matter" && (
                    <ChoiceGroup
                      name="Children already"
                      options={HAS_CHILDREN_CHOICES}
                      value={values.partner_has_children}
                      onChange={(next) => set("partner_has_children", next)}
                      columns={3}
                    />
                  )}
                  <WeightControl
                    name="Children already"
                    value={values.partner_has_children_weight}
                    onChange={(w) => setWeight("partner_has_children_weight", w)}
                  />
                </FieldShell>

                {showMaxChildren && values.partner_has_children_weight !== "does_not_matter" && (
                  <FieldShell
                    id="partner_max_existing_children"
                    label="Most children you would be comfortable with"
                    helper="Optional."
                  >
                    <div className="max-w-[200px]">
                      {numberField("partner_max_existing_children", "Up to", 0, 10)}
                    </div>
                  </FieldShell>
                )}

                <FieldShell
                  id="partner_wants_children"
                  label="Children in the future"
                  helper="Separate from whether they already have children."
                >
                  <ChoiceGroup
                    name="Children in the future"
                    options={WANTS_CHILDREN_CHOICES}
                    value={values.partner_wants_children}
                    onChange={(next) => set("partner_wants_children", next)}
                    columns={4}
                  />
                </FieldShell>

                <FieldShell id="partner_marital_history" label="Marriage history you are open to">
                  {values.partner_marital_history_weight !== "does_not_matter" && (
                    <MultiSelect
                      id="partner_marital_history"
                      options={MARITAL_OPTIONS}
                      value={values.partner_marital_history}
                      onChange={(next) => set("partner_marital_history", next)}
                      searchPlaceholder="Search"
                    />
                  )}
                  <WeightControl
                    name="Marriage history"
                    value={values.partner_marital_history_weight}
                    onChange={(w) => setWeight("partner_marital_history_weight", w)}
                  />
                </FieldShell>

                <div className="grid gap-8 sm:grid-cols-2">
                  <FieldShell id="partner_smoking" label="Smoking">
                    <ChoiceGroup
                      name="Smoking"
                      options={SMOKING_CHOICES}
                      value={values.partner_smoking}
                      onChange={(next) => set("partner_smoking", next)}
                      columns={2}
                    />
                  </FieldShell>
                  <FieldShell id="partner_drinking" label="Drinking">
                    <ChoiceGroup
                      name="Drinking"
                      options={DRINKING_CHOICES}
                      value={values.partner_drinking}
                      onChange={(next) => set("partner_drinking", next)}
                      columns={2}
                    />
                  </FieldShell>
                </div>

                <FieldShell id="partner_relocation" label="Moving for the relationship">
                  <ChoiceGroup
                    name="Moving for the relationship"
                    options={RELOCATION_CHOICES}
                    value={values.partner_relocation}
                    onChange={(next) => set("partner_relocation", next)}
                    columns={3}
                  />
                </FieldShell>

                <FieldShell id="partner_long_distance" label="Distance at the start">
                  <ChoiceGroup
                    name="Distance at the start"
                    options={LONG_DISTANCE_CHOICES}
                    value={values.partner_long_distance}
                    onChange={(next) => set("partner_long_distance", next)}
                    columns={3}
                  />
                </FieldShell>

                <FieldShell id="partner_marriage_timeline" label="Their timeline">
                  <ChoiceGroup
                    name="Their timeline"
                    options={TIMELINE_CHOICES}
                    value={values.partner_marriage_timeline}
                    onChange={(next) => set("partner_marriage_timeline", next)}
                    columns={4}
                  />
                </FieldShell>
              </Group>

              <Group title="In your own words">
                <FieldShell
                  id="applicant_note"
                  label="Anything else your matchmaker should know"
                  helper="This note is for your MotherlandMatch team and is not part of the profile shown in an introduction."
                >
                  <textarea
                    id="applicant_note"
                    rows={6}
                    maxLength={2000}
                    value={values.note}
                    onChange={(e) => set("note", e.target.value)}
                    className="w-full rounded-[10px] border border-input bg-card px-4 py-4 text-[17px] leading-[1.6] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring"
                  />
                </FieldShell>
              </Group>
            </div>

            <ErrorSummary items={summary} />

            {errors["form"] && (
              <p className="mt-8 text-[15px] font-medium text-wine-red">{errors["form"]}</p>
            )}

            <div className="mt-10 flex flex-col gap-4 border-t border-sand-deep/70 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[15px] text-taupe">
                Your progress is saved automatically.
                {saveState === "saving" && <span className="ml-2 text-charcoal">Saving…</span>}
                {saveState === "saved" && <span className="ml-2 text-charcoal">Saved</span>}
                {saveState === "failed" && (
                  <span className="ml-2 font-medium text-wine-red">Not saved yet</span>
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center">
                <button
                  type="button"
                  className={primaryButtonClass}
                  onClick={() => void onContinue()}
                >
                  Continue
                </button>
                <button type="button" className={quietButtonClass} onClick={() => void goBack()}>
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
