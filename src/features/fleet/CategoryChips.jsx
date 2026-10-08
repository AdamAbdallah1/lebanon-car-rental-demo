import { cn } from "../../lib/cn.js";
import { useLocaleContext, usePick } from "../../i18n/context.js";

/**
 * Category filter chips — single-select, `aria-pressed`, keyboard reachable.
 * They wrap rather than scroll: browsing the fleet must never move under the
 * user's finger, and wrapping guarantees zero horizontal overflow at 390px.
 */
export function CategoryChips({ categories, value, onChange, counts = {} }) {
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();

  const options = [
    { id: "all", label: t("fleet.filter.all") },
    ...categories.map((c) => ({
      id: c.id,
      label: pickLocalized(c.name, locale, c.id),
    })),
  ];

  return (
    <div
      role="group"
      aria-label={t("fleet.filter.label")}
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => {
        const active = (value ?? "all") === option.id;
        const count = counts[option.id];
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill border px-4",
              "font-mono text-caption transition-all duration-[180ms] ease-out",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              active
                ? "border-ink bg-ink text-canvas"
                : "border-line bg-surface text-ink-soft hover:border-ink hover:text-ink",
            )}
            data-keep-mono
          >
            {option.label}
            {typeof count === "number" ? (
              <span
                className={cn(
                  "rounded-pill px-1.5 text-[0.625rem]",
                  active ? "bg-canvas/20 text-canvas" : "bg-surface-sunken text-ink-faint",
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default CategoryChips;
