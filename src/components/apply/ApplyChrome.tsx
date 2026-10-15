import { useEffect, type ReactNode } from "react";

import { FieldContext, revealField } from "@/components/apply/field";

export const SECTIONS = [
  { key: "contact", label: "Contact" },
  { key: "identity", label: "Identity" },
  { key: "life", label: "Life" },
  { key: "relationship", label: "Relationship" },
  { key: "partner_preferences", label: "Your Match" },
  { key: "photos", label: "Photos" },
  { key: "consent", label: "Consent" },
] as const;

export function ApplyMasthead() {
  return (
    <header className="border-b border-sand-deep/70 bg-ivory">
      <div className="mx-auto flex h-[72px] max-w-[1080px] items-center px-6">
        <span className="font-display text-[22px] leading-none font-semibold tracking-[0.14em] text-charcoal uppercase">
          Motherland<span className="text-burgundy">Match</span>
        </span>
      </div>
    </header>
  );
}

/** Section completeness rail — current section shows its own percentage. */
export function ApplyProgress({
  current,
  percent,
}: {
  current: (typeof SECTIONS)[number]["key"];
  percent: number;
}) {
  return (
    <nav aria-label="Application sections" className="w-full">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {SECTIONS.map((section, index) => {
          const isCurrent = section.key === current;
          return (
            <div key={section.key} className="flex items-center gap-x-5">
              {index > 0 && <span aria-hidden className="h-px w-6 bg-sand-deep" />}
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={
                  isCurrent
                    ? "text-[15px] font-semibold text-charcoal"
                    : "text-[15px] font-normal text-taupe"
                }
              >
                {section.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <div className="h-[3px] w-full max-w-[320px] rounded-full bg-sand-deep">
          <div
            className="h-[3px] rounded-full bg-burgundy transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(percent, 2)}%` }}
          />
        </div>
        <span className="text-[14px] font-medium text-charcoal tabular-nums">
          {SECTIONS.find((s) => s.key === current)?.label} {percent}% complete
        </span>
      </div>
    </nav>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-[16px] border border-sand-deep/80 bg-white px-6 py-10 shadow-[0_1px_2px_rgba(36,32,31,0.04),0_10px_30px_-24px_rgba(59,16,31,0.35)] sm:px-12 sm:py-14">
      {children}
    </section>
  );
}

/** Marks the field's own input, select or textarea (the element carrying its id). */
function useNativeControlA11y(id: string, invalid: boolean, messageId: string | undefined) {
  useEffect(() => {
    const control = document.getElementById(id);
    if (!control || !["INPUT", "SELECT", "TEXTAREA"].includes(control.tagName)) return;
    if (invalid) control.setAttribute("aria-invalid", "true");
    else control.removeAttribute("aria-invalid");
    if (messageId) control.setAttribute("aria-describedby", messageId);
    else control.removeAttribute("aria-describedby");
  });
}

export function FieldShell({
  id,
  label,
  helper,
  error,
  children,
}: {
  id: string;
  label: string;
  helper?: string | undefined;
  error?: string | undefined;
  children: ReactNode;
}) {
  const invalid = Boolean(error);
  const labelId = `${id}-label`;
  const messageId = `${id}-message`;
  useNativeControlA11y(id, invalid, error || helper ? messageId : undefined);

  return (
    <div
      data-field={id}
      className={
        invalid
          ? "border-l-[3px] border-wine-red pl-4 sm:pl-5 [&_input]:border-wine-red [&_select]:border-wine-red [&_textarea]:border-wine-red"
          : undefined
      }
    >
      <label id={labelId} htmlFor={id} className="block text-[16px] font-medium text-charcoal">
        {label}
      </label>
      <div className="mt-2.5">
        <FieldContext.Provider value={{ id, labelId, messageId, invalid }}>
          {children}
        </FieldContext.Provider>
      </div>
      {error ? (
        <p id={messageId} className="mt-2 text-[14px] font-medium text-wine-red">
          {error}
        </p>
      ) : helper ? (
        <p id={messageId} className="mt-2 text-[14px] text-taupe">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/** What is still needed, next to the button. Each item jumps to its field. */
export function ErrorSummary({ items }: { items: { id: string; label: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="mt-8 rounded-[10px] border border-wine-red/30 bg-wine-red/[0.04] px-5 py-4"
    >
      <p className="text-[15px] font-medium text-wine-red">
        {items.length === 1
          ? "One answer needs your attention:"
          : `${items.length} answers need your attention:`}
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => revealField([item.id])}
              className="text-[15px] font-medium text-wine-red underline underline-offset-4 hover:text-wine"
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const inputClass =
  "h-[56px] w-full rounded-[10px] border border-input bg-card px-4 text-[17px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring";

export const selectClass =
  "h-[56px] w-full appearance-none rounded-[10px] border border-input bg-card bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22none%22 stroke=%22%23756A64%22 stroke-width=%221.5%22><path d=%22M5 8l5 5 5-5%22/></svg>')] bg-[length:20px_20px] bg-[right_16px_center] bg-no-repeat px-4 pr-12 text-[17px] text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring";

export const primaryButtonClass =
  "inline-flex h-[56px] items-center justify-center rounded-[10px] bg-primary px-8 text-[16px] font-semibold text-primary-foreground transition-colors hover:bg-wine disabled:cursor-not-allowed disabled:bg-taupe disabled:text-ivory";

export const quietButtonClass =
  "inline-flex h-[56px] items-center justify-center rounded-[10px] border border-sand-deep bg-white px-6 text-[16px] font-medium text-charcoal transition-colors hover:bg-sand";
