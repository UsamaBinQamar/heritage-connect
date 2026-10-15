import type { Weight } from "@/lib/match.functions";

const OPTIONS: { value: Weight; label: string }[] = [
  { value: "must_have", label: "Must have" },
  { value: "strong_preference", label: "Strong preference" },
  { value: "nice_to_have", label: "Nice to have" },
  { value: "does_not_matter", label: "Does not matter" },
];

/**
 * Compact importance control. Readable at a glance, never a faded dropdown,
 * and "Does not matter" is a first-class answer rather than an escape hatch.
 */
export function WeightControl({
  name,
  value,
  onChange,
}: {
  name: string;
  value: Weight;
  onChange: (next: Weight) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[14px] font-medium text-taupe">How important</span>
      <div role="radiogroup" aria-label={`How important: ${name}`} className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`rounded-full border px-4 py-2 text-[14px] transition-colors ${
                selected
                  ? "border-burgundy bg-burgundy font-semibold text-ivory"
                  : "border-sand-deep bg-card font-medium text-charcoal hover:bg-sand/70"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
