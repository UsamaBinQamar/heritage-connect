import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getMyApplication,
  listIdentityCatalogs,
  saveIdentity,
  type IdentityValues,
} from "@/lib/identity.functions";
import { subdivisionFor } from "@/lib/subdivisions";
import { MultiSelect } from "@/components/apply/MultiSelect";
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
  queryKey: ["identity-catalogs"],
  queryFn: () => listIdentityCatalogs(),
  staleTime: 1000 * 60 * 60,
});

export const Route = createFileRoute("/apply/identity")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogsQuery),
  head: () => ({
    meta: [
      { title: "Apply — Identity | MotherlandMatch" },
      {
        name: "description",
        content: "The Identity section of your MotherlandMatch application.",
      },
      { property: "og:title", content: "Apply — Identity | MotherlandMatch" },
      {
        property: "og:description",
        content: "The Identity section of your MotherlandMatch application.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: IdentityStage,
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

const EMPTY: IdentityValues = {
  date_of_birth: "",
  state_or_region: "",
  city: "",
  nationality: [],
  country_of_origin: "",
  cultural_backgrounds: [],
  cultural_background_other_label: "",
  languages: [],
  height_cm: null,
};

type Errors = { [K in keyof IdentityValues | "form"]?: string | undefined };

function ageFrom(dob: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const birth = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

function validate(values: IdentityValues): Errors {
  const errors: Errors = {};
  const age = ageFrom(values.date_of_birth);
  if (!values.date_of_birth) errors.date_of_birth = "Please give your date of birth.";
  else if (age === null) errors.date_of_birth = "Please give a complete date.";
  else if (age < 20) errors.date_of_birth = "You must be 20 or older to apply.";
  else if (age > 100) errors.date_of_birth = "Please check that date.";

  if (!values.city.trim()) errors.city = "Please tell us the city you live in.";
  if (values.nationality.length === 0) errors.nationality = "Please choose at least one.";
  if (!values.country_of_origin) errors.country_of_origin = "Please choose your country of origin.";
  if (values.cultural_backgrounds.length === 0)
    errors.cultural_backgrounds = "Please choose at least one.";
  else if (
    values.cultural_backgrounds.includes("other") &&
    !values.cultural_background_other_label.trim()
  )
    errors.cultural_background_other_label = "Please tell us in a word or two.";
  if (values.languages.length === 0) errors.languages = "Please choose at least one.";

  if (values.height_cm != null && (values.height_cm < 120 || values.height_cm > 220))
    errors.height_cm = "Please give a height between 120 cm and 220 cm.";
  return errors;
}

/** Plain names for the answers, listed when Continue cannot proceed. */
const FIELD_LABELS: Partial<Record<keyof IdentityValues, string>> = {
  date_of_birth: "Date of birth",
  city: "City",
  nationality: "Nationality",
  country_of_origin: "Country of origin",
  cultural_backgrounds: "Cultural background",
  cultural_background_other_label: "Background in your own words",
  languages: "Languages",
  height_cm: "Height",
};

const REQUIRED_KEYS: (keyof IdentityValues)[] = [
  "date_of_birth",
  "city",
  "nationality",
  "country_of_origin",
  "cultural_backgrounds",
  "languages",
];

function IdentityStage() {
  useApplySession();
  const { data: catalogs } = useSuspenseQuery(catalogsQuery);
  const navigate = useNavigate();
  const router = useRouter();
  const load = useServerFn(getMyApplication);
  const save = useServerFn(saveIdentity);

  const [values, setValues] = useState<IdentityValues>(EMPTY);
  const [residence, setResidence] = useState("");
  const [touched, setTouched] = useState<Partial<Record<keyof IdentityValues, boolean>>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [missing, setMissing] = useState<(keyof IdentityValues)[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [loaded, setLoaded] = useState(false);
  const [heightUnit, setHeightUnit] = useState<"cm" | "ftin">("cm");
  // Feet and inches are held as typed, so 5 ft stays 5 ft while inches are entered.
  const [feet, setFeet] = useState<number | "">("");
  const [inches, setInches] = useState<number | "">("");
  const lastSaved = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await load();
        if (cancelled || !data) {
          if (!cancelled) setLoaded(true);
          return;
        }
        setValues(data.identity);
        if (data.identity.height_cm != null) {
          const total = Math.round(data.identity.height_cm / 2.54);
          setFeet(Math.floor(total / 12));
          setInches(total % 12);
        }
        setResidence(data.country_of_residence);
        lastSaved.current = JSON.stringify(data.identity);
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

  const subdivision = useMemo(() => subdivisionFor(residence), [residence]);

  const countryOptions = catalogs.countries;
  const countryPickerOptions = useMemo(
    () => countryOptions.map((c) => ({ id: c.code, label: c.name })),
    [countryOptions],
  );

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

  const set = <K extends keyof IdentityValues>(key: K, value: IdentityValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
  };

  const blur = (key: keyof IdentityValues) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors(validate(values));
  };

  const clamp = (value: number | "", low: number, high: number) =>
    value === "" ? "" : Math.min(high, Math.max(low, Math.round(value)));

  const setFtIn = (rawFeet: number | "", rawInches: number | "") => {
    const nextFeet = clamp(rawFeet, 4, 7);
    const nextInches = clamp(rawInches, 0, 11);
    setFeet(nextFeet);
    setInches(nextInches);
    if (nextFeet === "" && nextInches === "") {
      set("height_cm", null);
      return;
    }
    const f = typeof nextFeet === "number" ? nextFeet : 0;
    const i = typeof nextInches === "number" ? nextInches : 0;
    set("height_cm", Math.round((f * 12 + i) * 2.54));
  };

  const onContinue = async () => {
    setErrors(found);
    setTouched(
      Object.fromEntries(REQUIRED_KEYS.map((k) => [k, true])) as Partial<
        Record<keyof IdentityValues, boolean>
      >,
    );
    const problems = orderByPage(Object.keys(found)) as (keyof IdentityValues)[];
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
    await navigate({ to: "/apply/life" });
  };

  const goBack = async () => {
    await persist();
    await navigate({ to: "/apply", search: { edit: 1 } });
    router.invalidate();
  };

  const err = (key: keyof IdentityValues) => (touched[key] ? errors[key] : undefined);

  return (
    <main className="min-h-screen bg-ivory">
      <ApplyMasthead />

      <div className="mx-auto max-w-[820px] px-6 pt-12 pb-24 sm:pt-16">
        <p className="text-[13px] font-medium tracking-[0.18em] text-taupe uppercase">
          Your application
        </p>
        <div className="mt-5">
          <ApplyProgress current="identity" percent={percent} />
        </div>

        <div className="mt-10">
          <Panel>
            <h1 className="font-display text-[40px] leading-[1.05] font-semibold text-charcoal sm:text-[46px]">
              Tell us who you are.
            </h1>
            <p className="mt-5 max-w-[46ch] text-[19px] leading-[1.6] text-charcoal">
              A few facts help your matchmaker understand your world.
            </p>

            <div className="mt-10 space-y-8">
              <FieldShell
                id="date_of_birth"
                label="Date of birth"
                helper="You must be 20 or older."
                error={err("date_of_birth")}
              >
                <input
                  id="date_of_birth"
                  type="date"
                  className={`${inputClass} sm:max-w-[320px]`}
                  value={values.date_of_birth}
                  onChange={(e) => set("date_of_birth", e.target.value)}
                  onBlur={() => blur("date_of_birth")}
                />
              </FieldShell>

              <div className="grid gap-8 sm:grid-cols-2">
                <FieldShell
                  id="state_or_region"
                  label={subdivision.label}
                  helper="Optional."
                  error={err("state_or_region")}
                >
                  {subdivision.options ? (
                    <select
                      id="state_or_region"
                      className={selectClass}
                      value={values.state_or_region}
                      onChange={(e) => set("state_or_region", e.target.value)}
                      onBlur={() => blur("state_or_region")}
                    >
                      <option value="">Select</option>
                      {subdivision.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="state_or_region"
                      className={inputClass}
                      value={values.state_or_region}
                      onChange={(e) => set("state_or_region", e.target.value)}
                      onBlur={() => blur("state_or_region")}
                    />
                  )}
                </FieldShell>

                <FieldShell id="city" label="City" error={err("city")}>
                  <input
                    id="city"
                    className={inputClass}
                    value={values.city}
                    autoComplete="address-level2"
                    onChange={(e) => set("city", e.target.value)}
                    onBlur={() => blur("city")}
                  />
                </FieldShell>
              </div>

              <FieldShell
                id="nationality"
                label="Nationality"
                helper="You may choose more than one."
                error={err("nationality")}
              >
                <MultiSelect
                  id="nationality"
                  options={countryPickerOptions}
                  value={values.nationality}
                  onChange={(next) => set("nationality", next)}
                  max={5}
                  searchPlaceholder="Search countries"
                />
              </FieldShell>

              <FieldShell
                id="country_of_origin"
                label="Country of origin"
                error={err("country_of_origin")}
              >
                <select
                  id="country_of_origin"
                  className={selectClass}
                  value={values.country_of_origin}
                  onChange={(e) => set("country_of_origin", e.target.value)}
                  onBlur={() => blur("country_of_origin")}
                >
                  <option value="">Select a country</option>
                  {countryOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FieldShell>

              <FieldShell
                id="cultural_backgrounds"
                label="Cultural background"
                helper="Choose everything that belongs to you."
                error={err("cultural_backgrounds")}
              >
                <MultiSelect
                  id="cultural_backgrounds"
                  options={catalogs.culturalBackgrounds}
                  value={values.cultural_backgrounds}
                  onChange={(next) => set("cultural_backgrounds", next)}
                  max={6}
                  searchPlaceholder="Search backgrounds"
                />
              </FieldShell>

              {values.cultural_backgrounds.includes("other") && (
                <FieldShell
                  id="cultural_background_other_label"
                  label="Tell us in your own words"
                  error={touched.cultural_backgrounds ? errors.cultural_background_other_label : undefined}
                >
                  <input
                    id="cultural_background_other_label"
                    className={inputClass}
                    value={values.cultural_background_other_label}
                    maxLength={80}
                    onChange={(e) => set("cultural_background_other_label", e.target.value)}
                    onBlur={() => blur("cultural_backgrounds")}
                  />
                </FieldShell>
              )}

              <FieldShell
                id="languages"
                label="Languages you speak"
                error={err("languages")}
              >
                <MultiSelect
                  id="languages"
                  options={catalogs.languages}
                  value={values.languages}
                  onChange={(next) => set("languages", next)}
                  max={8}
                  searchPlaceholder="Search languages"
                />
              </FieldShell>

              <FieldShell id="height_cm" label="Height" helper="Optional." error={errors.height_cm}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-[130px] shrink-0">
                    <select
                      aria-label="Height unit"
                      className={selectClass}
                      value={heightUnit}
                      onChange={(e) => {
                        const next = e.target.value as "cm" | "ftin";
                        setHeightUnit(next);
                        if (next === "ftin") {
                          if (values.height_cm == null) {
                            setFeet("");
                            setInches("");
                          } else {
                            const total = Math.round(values.height_cm / 2.54);
                            setFeet(Math.floor(total / 12));
                            setInches(total % 12);
                          }
                        }
                      }}
                    >
                      <option value="cm">cm</option>
                      <option value="ftin">ft / in</option>
                    </select>
                  </div>

                  {heightUnit === "cm" ? (
                    <input
                      id="height_cm"
                      type="number"
                      inputMode="numeric"
                      min={120}
                      max={220}
                      className={`${inputClass} w-[160px]`}
                      value={values.height_cm ?? ""}
                      onChange={(e) =>
                        set("height_cm", e.target.value === "" ? null : Number(e.target.value))
                      }
                    />
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        id="height_cm"
                        type="number"
                        inputMode="numeric"
                        aria-label="Feet"
                        list="height-feet"
                        min={4}
                        max={7}
                        className={`${inputClass} w-[110px]`}
                        value={feet}
                        onChange={(e) =>
                          setFtIn(e.target.value === "" ? "" : Number(e.target.value), inches)
                        }
                      />
                      <datalist id="height-feet">
                        {[4, 5, 6, 7].map((f) => (
                          <option key={f} value={f} />
                        ))}
                      </datalist>
                      <span className="text-[16px] text-charcoal">ft</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        aria-label="Inches"
                        list="height-inches"
                        min={0}
                        max={11}
                        className={`${inputClass} w-[110px]`}
                        value={inches}
                        onChange={(e) =>
                          setFtIn(feet, e.target.value === "" ? "" : Number(e.target.value))
                        }
                      />
                      <datalist id="height-inches">
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i} />
                        ))}
                      </datalist>
                      <span className="text-[16px] text-charcoal">in</span>
                    </div>
                  )}

                  {values.height_cm != null && heightUnit === "ftin" && (
                    <span className="text-[15px] text-taupe">Saved as {values.height_cm} cm</span>
                  )}
                </div>
              </FieldShell>
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
