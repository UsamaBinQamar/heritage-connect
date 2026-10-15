import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { listCountries, saveContactDraft, attachDraftToAccount } from "@/lib/apply.functions";
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

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

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
  const saveDraft = useServerFn(saveContactDraft);
  const attachDraft = useServerFn(attachDraftToAccount);
  const loadSaved = useServerFn(getMyApplication);
  const loadOverview = useServerFn(getApplicationOverview);

  const [values, setValues] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [missing, setMissing] = useState<(keyof Values)[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [step, setStep] = useState<"contact" | "verify">("contact");
  const [sending, setSending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const lastSaved = useRef<string>("");

  // Returning from a later stage, or arriving back from the confirmation email:
  // restore what is already saved, bind the draft to the account, and send the
  // person to the first section they have not finished. Never a second person.
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
        if (!session) return;

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
        setStep("contact");

        if (isEdit) return;

        const overview = await loadOverview();
        if (cancelled) return;
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

  // Keep what is on screen across the confirmation step and a browser Back.
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

  const persist = useCallback(async () => {
    if (!draftReady) return null;
    const payload = {
      ...values,
      email: values.email.trim().toLowerCase(),
      phone: normalisedPhone as string,
    };
    const signature = JSON.stringify(payload);
    if (signature === lastSaved.current) return signature;
    setSaveState("saving");
    try {
      await saveDraft({ data: payload });
      lastSaved.current = signature;
      setSaveState("saved");
      return signature;
    } catch (error) {
      console.error(error);
      setSaveState("failed");
      return null;
    }
  }, [draftReady, normalisedPhone, saveDraft, values]);

  // Field-level autosave: quiet, debounced, never on every keystroke.
  useEffect(() => {
    if (!draftReady || step !== "contact") return;
    const timer = setTimeout(() => {
      void persist();
    }, 1000);
    return () => clearTimeout(timer);
  }, [draftReady, persist, step]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const set = (key: keyof Values, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
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

  const sendLink = async () => {
    setSending(true);
    setErrors((prev) => ({ ...prev, form: undefined }));
    try {
      const saved = await persist();
      if (!saved) throw new Error("We could not save your details. Please try again.");
      const { error } = await supabase.auth.signInWithOtp({
        email: values.email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/apply`,
        },
      });
      if (error) throw error;
      setStep("verify");
      setResendIn(45);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        form:
          error instanceof Error
            ? error.message
            : "We could not send your email just now. Please try again.",
      }));
    } finally {
      setSending(false);
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
    await sendLink();
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
            {step === "contact" ? (
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
                    error={touched.email ? errors.email : undefined}
                  >
                    <input
                      id="email"
                      type="email"
                      inputMode="email"
                      className={inputClass}
                      value={values.email}
                      autoComplete="email"
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

                {errors.form && (
                  <p className="mt-8 text-[15px] font-medium text-wine-red">{errors.form}</p>
                )}

                <div className="mt-10 flex flex-col gap-5 border-t border-sand-deep/70 pt-8 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-[14px] text-taupe">
                    <p>Your progress is saved automatically.</p>
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
                    disabled={sending}
                    onClick={() => void onContinue()}
                  >
                    {sending ? "Sending your email…" : "Continue"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 className="font-display text-[40px] leading-[1.05] font-semibold text-charcoal sm:text-[44px]">
                  Open the email and continue.
                </h1>
                <p className="mt-5 max-w-[46ch] text-[19px] leading-[1.6] text-charcoal">
                  We sent a confirmation email to{" "}
                  <span className="font-medium">{values.email.trim().toLowerCase()}</span>. Open it
                  on this device and follow the link — it brings you straight back here and
                  continues your application.
                </p>

                <div className="mt-10 flex flex-col gap-4 border-t border-sand-deep/70 pt-8 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    className={quietButtonClass}
                    onClick={() => setStep("contact")}
                  >
                    Change my details
                  </button>
                  <button
                    type="button"
                    disabled={resendIn > 0 || sending}
                    onClick={() => void sendLink()}
                    className="text-[15px] font-medium text-burgundy underline-offset-4 hover:underline disabled:text-taupe disabled:no-underline sm:ml-2"
                  >
                    {resendIn > 0 ? `Send again in ${resendIn}s` : "Send the email again"}
                  </button>
                </div>

                <p className="mt-6 text-[14px] text-taupe">
                  Your contact details are already saved.
                </p>
              </>

            )}
          </Panel>
        </div>
      </div>
    </main>
  );
}
