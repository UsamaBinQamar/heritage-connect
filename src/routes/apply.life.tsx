import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  EMPTY_LIFE,
  JOB_TITLE_STATUSES,
  getMyLife,
  listLifeCatalogs,
  saveLife,
  type LifeValues,
} from "@/lib/life.functions";
import { ChoiceGroup } from "@/components/apply/ChoiceGroup";
import {
  ApplyMasthead,
  ApplyProgress,
  ErrorSummary,
  FieldShell,
  Panel,
  inputClass,
  primaryButtonClass,
  quietButtonClass,
  selectClass,
} from "@/components/apply/ApplyChrome";
import { orderByPage, revealField } from "@/components/apply/field";
import { useApplySession } from "@/lib/use-apply-session";

const catalogsQuery = queryOptions({
  queryKey: ["life-catalogs"],
  queryFn: () => listLifeCatalogs(),
  staleTime: 1000 * 60 * 60,
});

export const Route = createFileRoute("/apply/life")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogsQuery),
  head: () => ({
    meta: [
      { title: "Apply — Life | MotherlandMatch" },
      {
        name: "description",
        content: "The Life section of your MotherlandMatch application.",
      },
      { property: "og:title", content: "Apply — Life | MotherlandMatch" },
      {
        property: "og:description",
        content: "The Life section of your MotherlandMatch application.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LifeStage,
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

const EDUCATION_CHOICES = [
  { value: "secondary", label: "Secondary school" },
  { value: "vocational", label: "Vocational or technical" },
  { value: "bachelors", label: "Bachelor's degree" },
  { value: "masters", label: "Master's degree" },
  { value: "doctorate", label: "Doctorate" },
  { value: "other", label: "Something else" },
];

const EMPLOYMENT_CHOICES = [
  { value: "employed", label: "Employed" },
  { value: "self_employed", label: "Self-employed" },
  { value: "business_owner", label: "Business owner" },
  { value: "student", label: "Studying" },
  { value: "not_working", label: "Not working right now" },
  { value: "other", label: "Something else" },
];

const HAS_CHILDREN_CHOICES = [
  { value: "no", label: "No children" },
  { value: "yes", label: "Yes, I have children" },
];

const CHILDREN_LIVING_CHOICES = [
  { value: "living_with_me", label: "Living with me" },
  { value: "shared_custody", label: "Shared custody" },
  { value: "living_elsewhere", label: "Living elsewhere" },
  { value: "grown_independent", label: "Grown and independent" },
];

const WANTS_CHILDREN_CHOICES = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "open", label: "Open to it" },
  { value: "not_sure", label: "Not sure yet" },
];

const LEGAL_STATUS_CHOICES = [
  { value: "single", label: "Single" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "legally_separated", label: "Legally separated" },
  { value: "other", label: "Something else" },
];

const MARITAL_HISTORY_CHOICES = [
  { value: "never_married", label: "Never married" },
  { value: "previously_divorced", label: "Married before, divorced" },
  { value: "previously_widowed", label: "Married before, widowed" },
  { value: "other", label: "Something else" },
];

const SMOKING_CHOICES = [
  { value: "never", label: "Never" },
  { value: "sometimes", label: "Sometimes" },
  { value: "regularly", label: "Regularly" },
];

const DRINKING_CHOICES = [
  { value: "never", label: "Never" },
  { value: "socially", label: "Socially" },
  { value: "regularly", label: "Regularly" },
];

const OBSERVANCE_CHOICES = [
  { value: "not_important", label: "Not important to me" },
  { value: "somewhat", label: "Somewhat important" },
  { value: "important", label: "Important" },
  { value: "central", label: "Central to my life" },
];

type Errors = { [K in keyof LifeValues | "form"]?: string | undefined };

/** Plain names for the required answers, listed when Continue cannot proceed. */
const FIELD_LABELS: Partial<Record<keyof LifeValues, string>> = {
  education_level: "Education",
  employment_status: "Work",
  job_title: "What you do",
  has_children: "Children",
  number_of_children: "Number of children",
  wants_children: "Children in future",
  current_legal_status: "Current status",
  marital_history: "Marriage history",
  smoking: "Smoking",
  drinking: "Drinking",
  religion: "Faith",
  faith_observance: "How you practise",
};

function needsJobTitle(values: LifeValues) {
  return JOB_TITLE_STATUSES.includes(values.employment_status);
}

function validate(values: LifeValues): Errors {
  const errors: Errors = {};
  if (!values.education_level) errors.education_level = "Please choose one.";
  if (!values.employment_status) errors.employment_status = "Please choose one.";
  if (needsJobTitle(values) && !values.job_title.trim())
    errors.job_title = "Please tell us what you do.";
  if (!values.has_children) errors.has_children = "Please choose one.";
  if (values.has_children === "yes" && values.number_of_children == null)
    errors.number_of_children = "Please give a number.";
  if (
    values.has_children === "yes" &&
    values.number_of_children != null &&
    (values.number_of_children < 1 || values.number_of_children > 20)
  )
    errors.number_of_children = "Please check that number.";
  if (!values.wants_children) errors.wants_children = "Please choose one.";
  if (!values.current_legal_status) errors.current_legal_status = "Please choose one.";
  if (!values.marital_history) errors.marital_history = "Please choose one.";
  if (!values.smoking) errors.smoking = "Please choose one.";
  if (!values.drinking) errors.drinking = "Please choose one.";
  if (!values.religion) errors.religion = "Please choose one.";
  if (!values.faith_observance) errors.faith_observance = "Please choose one.";
  return errors;
}

/** Required Life answers, used for this section's own completeness only. */
function requiredKeys(values: LifeValues): (keyof LifeValues)[] {
  const keys: (keyof LifeValues)[] = [
    "education_level",
    "employment_status",
    "has_children",
    "wants_children",
    "current_legal_status",
    "marital_history",
    "smoking",
    "drinking",
    "religion",
    "faith_observance",
  ];
  if (needsJobTitle(values)) keys.push("job_title");
  if (values.has_children === "yes") keys.push("number_of_children");
  return keys;
}

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

function LifeStage() {
  useApplySession();
  const { data: catalogs } = useSuspenseQuery(catalogsQuery);
  const navigate = useNavigate();
  const router = useRouter();
  const load = useServerFn(getMyLife);
  const save = useServerFn(saveLife);

  const [values, setValues] = useState<LifeValues>(EMPTY_LIFE);
  const [touched, setTouched] = useState<Partial<Record<keyof LifeValues, boolean>>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [missing, setMissing] = useState<(keyof LifeValues)[]>([]);
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
    const keys = requiredKeys(values);
    const done = keys.filter((key) => !found[key]).length;
    return Math.round((done / keys.length) * 100);
  }, [found, values]);

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

  const set = <K extends keyof LifeValues>(key: K, value: LifeValues[K]) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // Revalidate dependents: a hidden answer must never contradict the
      // visible one, so stale values are cleared rather than kept.
      if (key === "has_children" && value !== "yes") {
        next.number_of_children = null;
        next.children_living_status = "";
      }
      if (key === "employment_status" && !JOB_TITLE_STATUSES.includes(String(value))) {
        next.job_title = "";
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
    if (key === "has_children" && value !== "yes") {
      setErrors((prev) => ({ ...prev, number_of_children: undefined }));
    }
    if (key === "employment_status" && !JOB_TITLE_STATUSES.includes(String(value))) {
      setErrors((prev) => ({ ...prev, job_title: undefined }));
    }
  };

  const blur = (key: keyof LifeValues) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors(validate(values));
  };

  const choose = <K extends keyof LifeValues>(key: K, value: LifeValues[K]) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    set(key, value);
  };

  const err = (key: keyof LifeValues) => (touched[key] ? errors[key] : undefined);

  const onContinue = async () => {
    setErrors(found);
    setTouched(
      Object.fromEntries(requiredKeys(values).map((k) => [k, true])) as Partial<
        Record<keyof LifeValues, boolean>
      >,
    );
    const problems = orderByPage(Object.keys(found)) as (keyof LifeValues)[];
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
    await navigate({ to: "/apply/relationship" });
  };

  const goBack = async () => {
    await persist();
    await navigate({ to: "/apply/identity" });
    router.invalidate();
  };

  return (
    <main className="min-h-screen bg-ivory">
      <ApplyMasthead />

      <div className="mx-auto max-w-[820px] px-6 pt-12 pb-24 sm:pt-16">
        <p className="text-[13px] font-medium tracking-[0.18em] text-taupe uppercase">
          Your application
        </p>
        <div className="mt-5">
          <ApplyProgress current="life" percent={percent} />
        </div>

        <div className="mt-10">
          <Panel>
            <h1 className="font-display text-[40px] leading-[1.05] font-semibold text-charcoal sm:text-[46px]">
              Your life, as it is now.
            </h1>
            <p className="mt-5 max-w-[48ch] text-[19px] leading-[1.6] text-charcoal">
              Education, family, faith, and the facts a matchmaker actually needs.
            </p>

            <div className="mt-12 space-y-10">
              <Group title="Work and study">
                <FieldShell
                  id="education_level"
                  label="Highest level of education"
                  error={err("education_level")}
                >
                  <ChoiceGroup
                    name="Highest level of education"
                    options={EDUCATION_CHOICES}
                    value={values.education_level}
                    onChange={(next) => choose("education_level", next)}
                    columns={3}
                  />
                </FieldShell>

                <FieldShell
                  id="field_of_study"
                  label="Field of study"
                  helper="Optional."
                  error={err("field_of_study")}
                >
                  <input
                    id="field_of_study"
                    className={inputClass}
                    maxLength={120}
                    value={values.field_of_study}
                    onChange={(e) => set("field_of_study", e.target.value)}
                    onBlur={() => blur("field_of_study")}
                  />
                </FieldShell>

                <FieldShell
                  id="employment_status"
                  label="What you do now"
                  error={err("employment_status")}
                >
                  <ChoiceGroup
                    name="What you do now"
                    options={EMPLOYMENT_CHOICES}
                    value={values.employment_status}
                    onChange={(next) => choose("employment_status", next)}
                    columns={3}
                  />
                </FieldShell>

                {needsJobTitle(values) && (
                  <FieldShell id="job_title" label="Job title" error={err("job_title")}>
                    <input
                      id="job_title"
                      className={inputClass}
                      maxLength={120}
                      value={values.job_title}
                      onChange={(e) => set("job_title", e.target.value)}
                      onBlur={() => blur("job_title")}
                    />
                  </FieldShell>
                )}

                <div className="grid gap-8 sm:grid-cols-2">
                  <FieldShell
                    id="profession_category"
                    label="Profession"
                    helper="Optional."
                    error={err("profession_category")}
                  >
                    <select
                      id="profession_category"
                      className={selectClass}
                      value={values.profession_category}
                      onChange={(e) => set("profession_category", e.target.value)}
                      onBlur={() => blur("profession_category")}
                    >
                      <option value="">Select</option>
                      {catalogs.professionCategories.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </FieldShell>

                  <FieldShell
                    id="industry"
                    label="Industry"
                    helper="Optional."
                    error={err("industry")}
                  >
                    <select
                      id="industry"
                      className={selectClass}
                      value={values.industry}
                      onChange={(e) => set("industry", e.target.value)}
                      onBlur={() => blur("industry")}
                    >
                      <option value="">Select</option>
                      {catalogs.industries.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </FieldShell>
                </div>
              </Group>

              <Group title="Family">
                <FieldShell id="has_children" label="Children" error={err("has_children")}>
                  <ChoiceGroup
                    name="Children"
                    options={HAS_CHILDREN_CHOICES}
                    value={values.has_children}
                    onChange={(next) => choose("has_children", next)}
                  />
                </FieldShell>

                {values.has_children === "yes" && (
                  <>
                    <FieldShell
                      id="number_of_children"
                      label="How many children"
                      error={err("number_of_children")}
                    >
                      <input
                        id="number_of_children"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={20}
                        className={`${inputClass} w-[160px]`}
                        value={values.number_of_children ?? ""}
                        onChange={(e) =>
                          set(
                            "number_of_children",
                            e.target.value === "" ? null : Number(e.target.value),
                          )
                        }
                        onBlur={() => blur("number_of_children")}
                      />
                    </FieldShell>

                    <FieldShell
                      id="children_living_status"
                      label="Where they live"
                      helper="Optional."
                      error={err("children_living_status")}
                    >
                      <ChoiceGroup
                        name="Where they live"
                        options={CHILDREN_LIVING_CHOICES}
                        value={values.children_living_status}
                        onChange={(next) => choose("children_living_status", next)}
                      />
                    </FieldShell>
                  </>
                )}

                <FieldShell
                  id="wants_children"
                  label="Would you like children in future?"
                  error={err("wants_children")}
                >
                  <ChoiceGroup
                    name="Would you like children in future?"
                    options={WANTS_CHILDREN_CHOICES}
                    value={values.wants_children}
                    onChange={(next) => choose("wants_children", next)}
                    columns={4}
                  />
                </FieldShell>
              </Group>

              <Group title="Status">
                <FieldShell
                  id="current_legal_status"
                  label="Your status today"
                  error={err("current_legal_status")}
                >
                  <ChoiceGroup
                    name="Your status today"
                    options={LEGAL_STATUS_CHOICES}
                    value={values.current_legal_status}
                    onChange={(next) => choose("current_legal_status", next)}
                    columns={3}
                  />
                </FieldShell>

                <FieldShell
                  id="marital_history"
                  label="Have you been married before?"
                  error={err("marital_history")}
                >
                  <ChoiceGroup
                    name="Have you been married before?"
                    options={MARITAL_HISTORY_CHOICES}
                    value={values.marital_history}
                    onChange={(next) => choose("marital_history", next)}
                  />
                </FieldShell>
              </Group>

              <Group title="Lifestyle">
                <div className="grid gap-8">
                  <FieldShell id="smoking" label="Smoking" error={err("smoking")}>
                    <ChoiceGroup
                      name="Smoking"
                      options={SMOKING_CHOICES}
                      value={values.smoking}
                      onChange={(next) => choose("smoking", next)}
                      columns={3}
                    />
                  </FieldShell>

                  <FieldShell id="drinking" label="Drinking" error={err("drinking")}>
                    <ChoiceGroup
                      name="Drinking"
                      options={DRINKING_CHOICES}
                      value={values.drinking}
                      onChange={(next) => choose("drinking", next)}
                      columns={3}
                    />
                  </FieldShell>
                </div>
              </Group>

              <Group title="Faith">
                <FieldShell id="religion" label="Faith" error={err("religion")}>
                  <select
                    id="religion"
                    className={selectClass}
                    value={values.religion}
                    onChange={(e) => set("religion", e.target.value)}
                    onBlur={() => blur("religion")}
                  >
                    <option value="">Select</option>
                    {catalogs.religions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </FieldShell>

                <FieldShell
                  id="denomination_or_faith_tradition"
                  label="Denomination or tradition"
                  helper="Optional."
                  error={err("denomination_or_faith_tradition")}
                >
                  <input
                    id="denomination_or_faith_tradition"
                    className={inputClass}
                    maxLength={120}
                    value={values.denomination_or_faith_tradition}
                    onChange={(e) => set("denomination_or_faith_tradition", e.target.value)}
                    onBlur={() => blur("denomination_or_faith_tradition")}
                  />
                </FieldShell>

                <FieldShell
                  id="faith_observance"
                  label="How much faith shapes your daily life"
                  error={err("faith_observance")}
                >
                  <ChoiceGroup
                    name="How much faith shapes your daily life"
                    options={OBSERVANCE_CHOICES}
                    value={values.faith_observance}
                    onChange={(next) => choose("faith_observance", next)}
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
