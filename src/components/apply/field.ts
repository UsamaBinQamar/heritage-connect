import { createContext, useContext } from "react";

export type FieldInfo = { id: string; labelId: string; messageId: string; invalid: boolean };

export const FieldContext = createContext<FieldInfo | null>(null);

/** The surrounding FieldShell, so custom controls can label and flag themselves. */
export function useField() {
  return useContext(FieldContext);
}

function fieldElements() {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-field]"));
}

/** Field ids sorted the way they appear on the page. */
export function orderByPage(ids: string[]): string[] {
  const position = new Map(fieldElements().map((el, index) => [el.dataset["field"], index]));
  return [...ids].sort(
    (a, b) => (position.get(a) ?? Number.MAX_SAFE_INTEGER) - (position.get(b) ?? Number.MAX_SAFE_INTEGER),
  );
}

/**
 * Scrolls the first of these fields (in page order) into the middle of the
 * screen and moves focus to its control, so keyboard and screen-reader users
 * land in the same place as everyone else.
 */
export function revealField(ids: string[]) {
  const wanted = new Set(ids);
  const field = fieldElements().find((el) => wanted.has(el.dataset["field"] ?? ""));
  if (!field) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  field.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  // Prefer the control the label points at (the phone number, not its calling
  // code); choice groups and fieldsets fall back to their first option.
  const focusable = "input, select, textarea, button, a[href]";
  const own = document.getElementById(field.dataset["field"] ?? "");
  const control = own?.matches(focusable) ? own : field.querySelector<HTMLElement>(focusable);
  control?.focus({ preventScroll: true });
}
