import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

import { supabase } from "@/integrations/supabase/client";
import {
  attachDraftToAccount,
  listCountries,
  saveMyContact,
  startApplication,
} from "@/lib/apply.functions";
import { getMyApplication } from "@/lib/identity.functions";
import { APPLICATION_SECTIONS, getApplicationOverview } from "@/lib/application.functions";
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
import { publicPageHead } from "@/lib/seo";

const countriesQuery = queryOptions({
  queryKey: ["countries"],
  queryFn: () => listCountries(),
  staleTime: 1000 * 60 * 60,
});

export const Route = createFileRoute("/apply/")({
  validateSearch: (search: { edit?: unknown }): { edit?: 1 } =>
    search.edit === 1 || search.edit === "1" ? { edit: 1 } : {},
  loader: ({ context }) => context.queryClient.ensureQueryData(countriesQuery),
  head: () =>
    publicPageHead({
      path: "/apply",
      title: "Begin Your Application — MotherlandMatch",
      description:
        "Start a private MotherlandMatch application. Tell us how to reach you; everything you share is read by a matchmaker, never published.",
    }),
  component: ContactStage,
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

const GENDERS = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
] as const;

type Values = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_country: string;
  country_of_residence: string;
  gender: string;
};

type Errors = { [K in keyof Values | "form"]?: string | undefined };

/** Plain names for the answers, listed when Continue cannot proceed. */
const FIELD_LABELS: Record<keyof Values, string> = {
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  phone: "Phone / WhatsApp",
  phone_country: "Calling code",
  country_of_residence: "Country of residence",
  gender: "Gender",
};

const EMPTY: Values = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  phone_country: "GH",
  country_of_residence: "",
  gender: "",
};

const CONTACT_CACHE_KEY = "mm.apply.contact";

const emailOk = (v: string) => /^[^\s@]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(v.trim());

function e164(phone: string, country: string): string | null {
  const parsed = parsePhoneNumberFromString(phone, country as CountryCode);
  return parsed && parsed.isValid() ? parsed.number : null;
}

function validate(values: Values): Errors {
  const errors: Errors = {};
  if (!values.first_name.trim()) errors.first_name = "Please tell us your first name.";
  if (!values.last_name.trim()) errors.last_name = "Please tell us your last name.";
  if (!emailOk(values.email)) errors.email = "Please enter an email address we can reach you on.";
  if (!values.phone.trim()) errors.phone = "Please enter your phone or WhatsApp number.";
  else if (!e164(values.phone, values.phone_country))
    errors.phone = "That number doesn't look right for the country selected.";
  if (!values.country_of_residence) errors.country_of_residence = "Please choose where you live.";
  if (!values.gender) errors.gender = "Please choose one.";
  return errors;
}

function ContactStage() {
  const { data: countries } = useSuspenseQuery(countriesQuery);
  const isEdit = Route.useSearch().edit === 1;
  const navigate = useNavigate();
  const start = useServerFn(startApplication);
  const saveContact = useServerFn(saveMyContact);
  const attachDraft = useServerFn(attachDraftToAccount);
  const loadSaved = useServerFn(getMyApplication);
  const loadOverview = useServerFn(getApplicationOverview);

  const [values, setValues] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [missing, setMissing] = useState<(keyof Values)[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  // Signed in: answers save as they go. Signed out: nothing is stored until Continue.
  const [signedIn, setSignedIn] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [starting, setStarting] = useState(false);
  const lastSaved = useRef<string>("");

  // Signed in on this browser: restore what is saved and send the person to the
  // first section they have not finished. Never a second application.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cached = sessionStorage.getItem(CONTACT_CACHE_KEY);
        if (cached && !cancelled) {
          const parsed = JSON.parse(cached) as Partial<Values>;
          setValues((prev) => ({ ...prev, ...parsed }));
        }

        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!session || cancelled) return;
        setSignedIn(true);

        const email = (session.user.email ?? "").trim().toLowerCase();
        if (email) {
          try {
            await attachDraft({ data: { email } });
          } catch (error) {
            console.error(error);
          }
        }

        const saved = await loadSaved();
        if (cancelled || !saved) return;

        setValues((prev) => ({
          first_name: saved.contact.first_name || prev.first_name,
          last_name: saved.contact.last_name || prev.last_name,
          email: saved.contact.email || prev.email,
          phone: saved.contact.phone || prev.phone,
          phone_country: saved.contact.phone_country || prev.phone_country,
          country_of_residence: saved.contact.country_of_residence || prev.country_of_residence,
          gender: saved.contact.gender || prev.gender,
        }));

        const overview = await loadOverview();
        if (cancelled) return;
        // Submitted applications are locked; the consent page shows the receipt.
        if (overview && overview.applicationStatus !== "draft") {
          await navigate({ to: "/apply/consent", replace: true });
          return;
        }
        if (isEdit) return;
        const resume = overview?.resumeSection
          ? APPLICATION_SECTIONS.find((s) => s.key === overview.resumeSection)
          : undefined;
        if (!resume) {
          await navigate({ to: "/apply/consent", replace: true });
          return;
        }
        if (resume.key === "contact") return;
        sessionStorage.removeItem(CONTACT_CACHE_KEY);
        await navigate({ to: resume.to, replace: true });
      } catch (error) {
        console.error(error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attachDraft, loadSaved, loadOverview, isEdit, navigate]);

  // Keep what is on screen across a refresh and a browser Back.
  useEffect(() => {
    try {
      sessionStorage.setItem(CONTACT_CACHE_KEY, JSON.stringify(values));
    } catch {
      /* storage unavailable */
    }
  }, [values]);


  const callingCodes = useMemo(() => {
    const supported = new Set(getCountries() as string[]);
    return countries
      .filter((c) => supported.has(c.code))
      .map((c) => ({
        code: c.code,
        name: c.name,
        calling: `+${getCountryCallingCode(c.code as CountryCode)}`,
      }));
  }, [countries]);

  const normalisedPhone = e164(values.phone, values.phone_country);
  const draftReady = emailOk(values.email) && Boolean(normalisedPhone);

  const filled = [
    values.first_name.trim(),
    values.last_name.trim(),
    emailOk(values.email) ? values.email : "",
    normalisedPhone ?? "",
    values.phone_country,
    values.country_of_residence,
    values.gender,
  ].filter(Boolean).length;
  const percent = Math.round((filled / 7) * 100);

  const payload = useMemo(
    () => ({ ...values, email: values.email.trim().toLowerCase(), phone: normalisedPhone ?? "" }),
    [normalisedPhone, values],
  );

  // Signed-in saves only: before Continue there is no account to save into.
  const persist = useCallback(async () => {
    if (!signedIn || !draftReady) return false;
    const signature = JSON.stringify(payload);
    if (signature === lastSaved.current) return true;
    setSaveState("saving");
    try {
      await saveContact({ data: payload });
      lastSaved.current = signature;
      setSaveState("saved");
      return true;
    } catch (error) {
      console.error(error);
      setSaveState("failed");
      return false;
    }
  }, [draftReady, payload, saveContact, signedIn]);

  // Field-level autosave: quiet, debounced, never on every keystroke.
  useEffect(() => {
    if (!signedIn || !draftReady) return;
    const timer = setTimeout(() => {
      void persist();
    }, 1000);
    return () => clearTimeout(timer);
  }, [draftReady, persist, signedIn]);

  const set = (key: keyof Values, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
    if (key === "email") setAlreadyApplied(false);
  };

  const blur = (key: keyof Values) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors(validate({ ...values }));
  };

  const found = validate(values);

  // Answers flagged on Continue drop out of the summary as soon as they are fixed.
  const summary = missing
    .filter((key) => found[key])
    .map((key) => ({ id: key, label: FIELD_LABELS[key] }));

  const begin = async () => {
    setStarting(true);
    setErrors((prev) => ({ ...prev, form: undefined }));
    try {
      if (signedIn) {
        if (!(await persist())) throw new Error("save failed");
      } else {
        const result = await start({ data: payload });
        if (result.status === "exists") {
          setAlreadyApplied(true);
          return;
        }
        // Exchange the one-time token for a session on this browser. No email is sent.
        const { error } = await supabase.auth.verifyOtp({
          token_hash: result.tokenHash,
          type: "email",
        });
        if (error) throw error;
      }
      sessionStorage.removeItem(CONTACT_CACHE_KEY);
      await navigate({ to: "/apply/identity" });
    } catch (error) {
      console.error(error);
      setErrors((prev) => ({
        ...prev,
        form: "We could not save your details just now. Please try again.",
      }));
    } finally {
      setStarting(false);
    }
  };

  const onContinue = async () => {
    setErrors(found);
    setTouched({
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      country_of_residence: true,
      gender: true,
    });
    const problems = orderByPage(Object.keys(found)) as (keyof Values)[];
    setMissing(problems);
    if (problems.length > 0) {
      revealField(problems);
      return;
    }
    await begin();
  };

  const genderError = touched.gender ? errors.gender : undefined;


  return (
    <main className="min-h-screen bg-ivory">
      <ApplyMasthead />

      <div className="mx-auto max-w-[820px] px-6 pt-12 pb-24 sm:pt-16">
        <p className="text-[13px] font-medium tracking-[0.18em] text-taupe uppercase">
          Your application
        </p>
        <div className="mt-5">
          <ApplyProgress current="contact" percent={percent} />
        </div>

        <div className="mt-10">
          <Panel>
            <>
                <h1 className="font-display text-[40px] leading-[1.05] font-semibold text-charcoal sm:text-[46px]">
                  Welcome. Let&rsquo;s begin privately.
                </h1>
                <p className="mt-5 max-w-[46ch] text-[19px] leading-[1.6] text-charcoal">
                  Tell us how to reach you. Your application is handled privately by
                  MotherlandMatch.
                </p>

                <div className="mt-10 space-y-8">
                  <div className="grid gap-8 sm:grid-cols-2">
                    <FieldShell
                      id="first_name"
                      label="First name"
                      error={touched.first_name ? errors.first_name : undefined}
                    >
                      <input
                        id="first_name"
                        className={inputClass}
                        value={values.first_name}
                        autoComplete="given-name"
                        onChange={(e) => set("first_name", e.target.value)}
                        onBlur={() => blur("first_name")}
                      />
                    </FieldShell>
                    <FieldShell
                      id="last_name"
                      label="Last name"
                      error={touched.last_name ? errors.last_name : undefined}
                    >
                      <input
                        id="last_name"
                        className={inputClass}
                        value={values.last_name}
                        autoComplete="family-name"
                        onChange={(e) => set("last_name", e.target.value)}
                        onBlur={() => blur("last_name")}
                      />
                    </FieldShell>
                  </div>

                  <FieldShell
                    id="email"
                    label="Email"
                    helper={signedIn ? "This is the email on your application." : undefined}
                    error={touched.email ? errors.email : undefined}
                  >
                    <input
                      id="email"
                      type="email"
                      inputMode="email"
                      className={`${inputClass} read-only:bg-sand/40 read-only:text-taupe`}
                      value={values.email}
                      autoComplete="email"
                      readOnly={signedIn}
                      onChange={(e) => set("email", e.target.value)}
                      onBlur={() => blur("email")}
                    />
                  </FieldShell>

                  <FieldShell
                    id="phone"
                    label="Phone / WhatsApp"
                    helper="We will use this to reach you personally."
                    error={touched.phone ? errors.phone : undefined}
                  >
                    <div className="flex gap-3">
                      <div className="w-[140px] shrink-0">
                      <select
                        aria-label="Country calling code"
                        className={selectClass}
                        value={values.phone_country}
                        onChange={(e) => set("phone_country", e.target.value)}
                      >
                        {callingCodes.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} {c.calling}
                          </option>
                        ))}
                      </select>
                      </div>
                      <input
                        id="phone"
                        style={{ flex: "1 1 0%", minWidth: 0 }}
                        type="tel"
                        inputMode="tel"
                        className={inputClass}
                        value={values.phone}
                        autoComplete="tel"
                        onChange={(e) => set("phone", e.target.value)}
                        onBlur={() => blur("phone")}
                      />
                    </div>
                  </FieldShell>

                  <FieldShell
                    id="country_of_residence"
                    label="Country of residence"
                    error={touched.country_of_residence ? errors.country_of_residence : undefined}
                  >
                    <select
                      id="country_of_residence"
                      className={selectClass}
                      value={values.country_of_residence}
                      onChange={(e) => set("country_of_residence", e.target.value)}
                      onBlur={() => blur("country_of_residence")}
                    >
                      <option value="">Select a country</option>
                      {countries.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </FieldShell>

                  <fieldset
                    data-field="gender"
                    aria-describedby={genderError ? "gender-message" : undefined}
                    className={genderError ? "border-l-[3px] border-wine-red pl-4 sm:pl-5" : undefined}
                  >
                    <legend className="text-[16px] font-medium text-charcoal">Gender</legend>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      {GENDERS.map((option) => {
                        const active = values.gender === option.value;
                        return (
                          <label
                            key={option.value}
                            className={`flex h-[72px] cursor-pointer items-center gap-4 rounded-[10px] border px-6 text-[18px] transition-colors ${
                              active
                                ? "border-burgundy bg-burgundy/[0.05] font-medium text-charcoal"
                                : `${genderError ? "border-wine-red/60" : "border-sand-deep"} bg-white text-charcoal hover:bg-sand/60`
                            }`}
                          >
                            <input
                              type="radio"
                              name="gender"
                              value={option.value}
                              checked={active}
                              aria-invalid={genderError ? true : undefined}
                              onChange={() => {
                                set("gender", option.value);
                                setTouched((prev) => ({ ...prev, gender: true }));
                              }}
                              className="sr-only"
                            />
                            <span
                              aria-hidden
                              className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border-2 ${
                                active ? "border-burgundy" : "border-taupe/70"
                              }`}
                            >
                              {active && <span className="h-[10px] w-[10px] rounded-full bg-burgundy" />}
                            </span>
                            {option.label}
                          </label>
                        );
                      })}
                    </div>
                    {genderError && (
                      <p id="gender-message" className="mt-2 text-[14px] font-medium text-wine-red">
                        {genderError}
                      </p>
                    )}
                  </fieldset>
                </div>

                <ErrorSummary items={summary} />

                {alreadyApplied && (
                  <div
                    role="alert"
                    className="mt-8 rounded-[10px] border border-burgundy/40 bg-burgundy/[0.04] p-6"
                  >
                    <p className="text-[18px] font-semibold text-charcoal">
                      You&rsquo;ve already applied with this email.
                    </p>
                    <p className="mt-2 text-[16px] leading-[1.6] text-charcoal">
                      Log in to continue your application. If you haven&rsquo;t set a password
                      yet, use &ldquo;Set or reset your password&rdquo; and we&rsquo;ll email
                      you a link to choose one.
                    </p>
                    <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
                      <Link
                        to="/login"
                        search={{ email: payload.email }}
                        className={primaryButtonClass}
                      >
                        Log in
                      </Link>
                      <Link
                        to="/forgot-password"
                        search={{ email: payload.email }}
                        className={quietButtonClass}
                      >
                        Set or reset your password
                      </Link>
                    </div>
                  </div>
                )}

                {errors.form && (
                  <p className="mt-8 text-[15px] font-medium text-wine-red">{errors.form}</p>
                )}

                <div className="mt-10 flex flex-col gap-5 border-t border-sand-deep/70 pt-8 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-[14px] text-taupe">
                    <p>
                      {signedIn
                        ? "Your progress is saved automatically."
                        : "Your details are saved when you continue."}
                    </p>
                    <p className="mt-1 h-[20px] text-charcoal">
                      {saveState === "saving" && <span className="text-taupe">Saving…</span>}
                      {saveState === "saved" && (
                        <span className="inline-flex items-center gap-2 font-medium">
                          <span className="h-[6px] w-[6px] rounded-full bg-olive" />
                          Saved
                        </span>
                      )}
                      {saveState === "failed" && (
                        <button
                          type="button"
                          onClick={() => void persist()}
                          className="font-medium text-wine-red underline underline-offset-4"
                        >
                          Not saved — retry
                        </button>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    className={primaryButtonClass}
                    disabled={starting}
                    onClick={() => void onContinue()}
                  >
                    {starting ? "Saving…" : "Continue"}
                  </button>
                </div>
              </>
          </Panel>
        </div>
      </div>
    </main>
  );
}
