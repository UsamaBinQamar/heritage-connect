import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  EMPTY_RELATIONSHIP,
  getMyRelationship,
  listCountries,
  saveRelationship,
  type RelationshipValues,
} from "@/lib/relationship.functions";
import { ChoiceGroup } from "@/components/apply/ChoiceGroup";
import { MultiSelect } from "@/components/apply/MultiSelect";
import {
  ApplyMasthead,
  ApplyProgress,
  ErrorSummary,
  FieldShell,
  Panel,
  primaryButtonClass,
  quietButtonClass,
} from "@/components/apply/ApplyChrome";
import { orderByPage, revealField } from "@/components/apply/field";
import { useApplySession } from "@/lib/use-apply-session";

const countriesQuery = queryOptions({
  queryKey: ["countries"],
  queryFn: () => listCountries(),
  staleTime: 1000 * 60 * 60,
});

export const Route = createFileRoute("/apply/relationship")({
  loader: ({ context }) => context.queryClient.ensureQueryData(countriesQuery),
  head: () => ({
    meta: [
      { title: "Apply — Relationship | MotherlandMatch" },
      {
        name: "description",
        content: "The Relationship section of your MotherlandMatch application.",
      },
      { property: "og:title", content: "Apply — Relationship | MotherlandMatch" },
      {
        property: "og:description",
        content: "The Relationship section of your MotherlandMatch application.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RelationshipStage,
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

const LOOKING_FOR_CHOICES = [
  { value: "marriage", label: "Marriage" },
  { value: "marriage_open_to_serious", label: "A serious relationship leading to marriage" },
];

const TIMELINE_CHOICES = [
  { value: "ready_now", label: "Ready now" },
  { value: "within_1_year", label: "Within a year" },
  { value: "within_2_years", label: "Within two years" },
  { value: "unhurried", label: "Unhurried" },
];

const YES_NO_DEPENDS_CHOICES = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "depends", label: "It depends" },
];

const INTRODUCTION_STYLE_CHOICES = [
  { value: "blind_first", label: "Blind first" },
  { value: "photo_first", label: "Photos first" },
  { value: "matchmaker_decides", label: "Let the matchmaker decide" },
];

type Errors = { [K in keyof RelationshipValues | "form"]?: string | undefined };

function validate(values: RelationshipValues): Errors {
  const errors: Errors = {};
  if (!values.looking_for) errors.looking_for = "Please choose one.";
  if (!values.marriage_timeline) errors.marriage_timeline = "Please choose one.";
  if (!values.willing_to_relocate) errors.willing_to_relocate = "Please choose one.";
  if (!values.open_to_long_distance) errors.open_to_long_distance = "Please choose one.";
  if (!values.introduction_style) errors.introduction_style = "Please choose one.";
  return errors;
}

/** Plain names for the required answers, listed when Continue cannot proceed. */
const FIELD_LABELS: Partial<Record<keyof RelationshipValues, string>> = {
  looking_for: "What brings you here",
  marriage_timeline: "Your timeline",
  willing_to_relocate: "Relocation",
  open_to_long_distance: "Distance at first",
  introduction_style: "Introduction style",
};

/** Required Relationship answers, used for this section's own completeness. */
const REQUIRED_KEYS: (keyof RelationshipValues)[] = [
  "looking_for",
  "marriage_timeline",
  "willing_to_relocate",
  "open_to_long_distance",
  "introduction_style",
];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-sand-deep/70 pt-9 first:border-t-0 first:pt-0">
      <h2 className="font-display text-[24px] leading-tight font-semibold text-charcoal">
        {title}
      </h2>
      <div className="mt-6 space-y-8">{children}</div>
    </section>
  );
}

function RelationshipStage() {
  useApplySession();
  const { data: countries } = useSuspenseQuery(countriesQuery);
  const navigate = useNavigate();
  const router = useRouter();
  const load = useServerFn(getMyRelationship);
  const save = useServerFn(saveRelationship);

  const [values, setValues] = useState<RelationshipValues>(EMPTY_RELATIONSHIP);
  const [touched, setTouched] = useState<Partial<Record<keyof RelationshipValues, boolean>>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [missing, setMissing] = useState<(keyof RelationshipValues)[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [loaded, setLoaded] = useState(false);
  const lastSaved = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await load();
        if (!cancelled && data) {
          setValues(data);
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

  const percent = useMemo(() => {
    const done = REQUIRED_KEYS.filter((key) => !found[key]).length;
    return Math.round((done / REQUIRED_KEYS.length) * 100);
  }, [found]);

  // Answers flagged on Continue drop out of the summary as soon as they are fixed.
  const summary = missing
    .filter((key) => found[key])
    .map((key) => ({ id: key, label: FIELD_LABELS[key] ?? key }));

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

  // Field-level autosave: debounced, never on every keystroke.
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      void persist();
    }, 1200);
    return () => clearTimeout(timer);
  }, [loaded, persist]);

  const set = <K extends keyof RelationshipValues>(key: K, value: RelationshipValues[K]) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // A hidden answer must never contradict the visible one: clear the
      // dependent country lists the moment their controlling answer is "no".
      if (key === "willing_to_relocate" && value === "no") {
        next.countries_would_relocate_to = [];
      }
      if (key === "open_to_long_distance" && value === "no") {
        next.countries_would_date_from = [];
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
  };

  const choose = <K extends keyof RelationshipValues>(key: K, value: RelationshipValues[K]) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    set(key, value);
  };

  const err = (key: keyof RelationshipValues) => (touched[key] ? errors[key] : undefined);

  const onContinue = async () => {
    setErrors(found);
    setTouched(
      Object.fromEntries(REQUIRED_KEYS.map((k) => [k, true])) as Partial<
        Record<keyof RelationshipValues, boolean>
      >,
    );
    const problems = orderByPage(Object.keys(found)) as (keyof RelationshipValues)[];
    setMissing(problems);
    if (problems.length > 0) {
      revealField(problems);
      return;
    }
    const ok = await persist();
    if (!ok) {
      setErrors({ form: "We could not save your details just now. Please try again." });
      return;
    }
    await navigate({ to: "/apply/match" });
  };

  const goBack = async () => {
    await persist();
    await navigate({ to: "/apply/life" });
    router.invalidate();
  };

  const countryOptions = useMemo(
    () => countries.map((c) => ({ id: c.code, label: c.name })),
    [countries],
  );

  const showRelocateCountries =
    values.willing_to_relocate === "yes" || values.willing_to_relocate === "depends";
  const showDistanceCountries =
    values.open_to_long_distance === "yes" || values.open_to_long_distance === "depends";

  return (
    <main className="min-h-screen bg-ivory">
      <ApplyMasthead />

      <div className="mx-auto max-w-[820px] px-6 pt-12 pb-24 sm:pt-16">
        <p className="text-[13px] font-medium tracking-[0.18em] text-taupe uppercase">
          Your application
        </p>
        <div className="mt-5">
          <ApplyProgress current="relationship" percent={percent} />
        </div>

        <div className="mt-10">
          <Panel>
            <h1 className="font-display text-[40px] leading-[1.05] font-semibold text-charcoal sm:text-[46px]">
              What you are looking for.
            </h1>
            <p className="mt-5 max-w-[48ch] text-[19px] leading-[1.6] text-charcoal">
              Intention, place, and how you want to be introduced.
            </p>

            <div className="mt-12 space-y-10">
              <Group title="Intention">
                <FieldShell
                  id="looking_for"
                  label="What brings you here"
                  error={err("looking_for")}
                >
                  <ChoiceGroup
                    name="What brings you here"
                    options={LOOKING_FOR_CHOICES}
                    value={values.looking_for}
                    onChange={(next) => choose("looking_for", next)}
                  />
                </FieldShell>

                <FieldShell
                  id="marriage_timeline"
                  label="Your timeline"
                  error={err("marriage_timeline")}
                >
                  <ChoiceGroup
                    name="Your timeline"
                    options={TIMELINE_CHOICES}
                    value={values.marriage_timeline}
                    onChange={(next) => choose("marriage_timeline", next)}
                    columns={4}
                  />
                </FieldShell>
              </Group>

              <Group title="Place and distance">
                <FieldShell
                  id="willing_to_relocate"
                  label="Would you relocate for the right person?"
                  error={err("willing_to_relocate")}
                >
                  <ChoiceGroup
                    name="Would you relocate for the right person?"
                    options={YES_NO_DEPENDS_CHOICES}
                    value={values.willing_to_relocate}
                    onChange={(next) => choose("willing_to_relocate", next)}
                    columns={3}
                  />
                </FieldShell>

                {showRelocateCountries && (
                  <FieldShell
                    id="countries_would_relocate_to"
                    label="Countries you would consider relocating to"
                    helper="Optional. Leave blank if you are open."
                    error={err("countries_would_relocate_to")}
                  >
                    <MultiSelect
                      id="countries_would_relocate_to"
                      options={countryOptions}
                      value={values.countries_would_relocate_to}
                      onChange={(next) => set("countries_would_relocate_to", next)}
                      searchPlaceholder="Search countries"
                    />
                  </FieldShell>
                )}

                <FieldShell
                  id="open_to_long_distance"
                  label="Are you open to a relationship at a distance at first?"
                  error={err("open_to_long_distance")}
                >
                  <ChoiceGroup
                    name="Are you open to a relationship at a distance at first?"
                    options={YES_NO_DEPENDS_CHOICES}
                    value={values.open_to_long_distance}
                    onChange={(next) => choose("open_to_long_distance", next)}
                    columns={3}
                  />
                </FieldShell>

                {showDistanceCountries && (
                  <FieldShell
                    id="countries_would_date_from"
                    label="Countries you would consider for a partner at a distance"
                    helper="Countries where you would be open to a partner currently living. Leave blank if geography is flexible."
                    error={err("countries_would_date_from")}
                  >
                    <MultiSelect
                      id="countries_would_date_from"
                      options={countryOptions}
                      value={values.countries_would_date_from}
                      onChange={(next) => set("countries_would_date_from", next)}
                      searchPlaceholder="Search countries"
                    />
                  </FieldShell>
                )}
              </Group>

              <Group title="Introduction style">
                <FieldShell
                  id="introduction_style"
                  label="How you want to be introduced"
                  helper="Your preference for your own introductions, shared only with your matchmaker."
                  error={err("introduction_style")}
                >
                  <ChoiceGroup
                    name="How you want to be introduced"
                    options={INTRODUCTION_STYLE_CHOICES}
                    value={values.introduction_style}
                    onChange={(next) => choose("introduction_style", next)}
                    columns={3}
                  />
                </FieldShell>
              </Group>
            </div>

            <ErrorSummary items={summary} />

            {errors.form && (
              <p className="mt-8 text-[15px] font-medium text-wine-red">{errors.form}</p>
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
