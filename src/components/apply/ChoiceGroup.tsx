import { useField } from "@/components/apply/field";

export type Choice = { value: string; label: string };

/**
 * Deliberate, generous choice control — the same family as the Woman / Man
 * cards on Contact. Never a tiny faded radio row.
 */
export function ChoiceGroup({
  name,
  options,
  value,
  onChange,
  columns = 2,
}: {
  name: string;
  options: Choice[];
  value: string;
  onChange: (next: string) => void;
  columns?: 2 | 3 | 4;
}) {
  const field = useField();
  const gridClass =
    columns === 4
      ? "sm:grid-cols-4"
      : columns === 3
        ? "sm:grid-cols-3"
        : "sm:grid-cols-2";

  return (
    <div
      role="radiogroup"
      id={field?.id}
      aria-labelledby={field?.labelId}
      aria-label={field ? undefined : name}
      aria-invalid={field?.invalid || undefined}
      aria-describedby={field?.invalid ? field.messageId : undefined}
      className={`grid gap-3 ${gridClass}`}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(selected ? "" : option.value)}
            className={`flex min-h-[64px] w-full items-center rounded-[10px] border px-5 py-4 text-left text-[16px] leading-snug break-words whitespace-normal transition-colors ${
              selected
                ? "border-burgundy bg-sand font-semibold text-charcoal"
                : `${field?.invalid ? "border-wine-red/60" : "border-sand-deep"} bg-card font-medium text-charcoal hover:bg-sand/60`
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
