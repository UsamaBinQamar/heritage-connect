import { useMemo, useState } from "react";

import { useField } from "@/components/apply/field";

export type Option = { id: string; label: string; grouping?: string | null };

/**
 * Calm multi-select: chosen values sit above as removable chips, the catalog
 * below is searchable and grouped. No packed tag dump, no combobox theatre.
 */
export function MultiSelect({
  id,
  options,
  value,
  onChange,
  max,
  searchPlaceholder = "Search",
}: {
  id: string;
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = useState("");
  const field = useField();

  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    const groups = new Map<string, Option[]>();
    for (const option of list) {
      const key = option.grouping ?? "";
      const bucket = groups.get(key);
      if (bucket) bucket.push(option);
      else groups.set(key, [option]);
    }
    return Array.from(groups.entries());
  }, [options, query]);

  const toggle = (optionId: string) => {
    if (value.includes(optionId)) {
      onChange(value.filter((v) => v !== optionId));
      return;
    }
    if (max && value.length >= max) return;
    onChange([...value, optionId]);
  };

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {value.map((v) => (
            <li key={v}>
              <button
                type="button"
                onClick={() => toggle(v)}
                className="inline-flex items-center gap-2 rounded-full border border-burgundy/40 bg-sand px-4 py-2 text-[15px] font-medium text-charcoal transition-colors hover:bg-sand-deep"
                aria-label={`Remove ${byId.get(v)?.label ?? v}`}
              >
                {byId.get(v)?.label ?? v}
                <span aria-hidden className="text-burgundy">
                  ×
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        className={`rounded-[10px] border bg-card ${field?.invalid ? "border-wine-red" : "border-sand-deep"}`}
      >
        <input
          id={id}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-[52px] w-full rounded-t-[10px] border-b border-sand-deep bg-transparent px-4 text-[17px] text-charcoal outline-none placeholder:text-taupe focus:border-primary"
        />
        <div className="max-h-[280px] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-[15px] text-taupe">Nothing matches that search.</p>
          )}
          {filtered.map(([group, items]) => (
            <div key={group || "all"} className="mb-2 last:mb-0">
              {group && (
                <p className="px-3 pt-3 pb-1 text-[13px] font-medium tracking-[0.14em] text-taupe uppercase">
                  {group}
                </p>
              )}
              <ul>
                {items.map((option) => {
                  const selected = value.includes(option.id);
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggle(option.id)}
                        className={`flex w-full items-center justify-between rounded-[8px] px-3 py-3 text-left text-[16px] transition-colors ${
                          selected
                            ? "bg-sand font-medium text-charcoal"
                            : "text-charcoal hover:bg-sand/70"
                        }`}
                      >
                        {option.label}
                        <span
                          aria-hidden
                          className={`ml-4 inline-block h-[18px] w-[18px] shrink-0 rounded-[4px] border ${
                            selected ? "border-burgundy bg-burgundy" : "border-sand-deep bg-card"
                          }`}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
