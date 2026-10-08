import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn.js";
import { pick as pickLocalized } from "../../i18n/localize.js";
import { useLocaleContext } from "../../i18n/context.js";
import Icon from "../../components/ui/Icon.jsx";
import { formatMoney } from "../../lib/money.js";

/**
 * Grouped location picker: Airports · Cities · Offices · Delivery.
 *
 * A real combobox (`button[aria-haspopup=listbox]` + `role=listbox`), with
 * roving focus, Escape to close and focus restored to the trigger. Grouping
 * and airport/delivery rules come from the location documents, so adding a
 * new pickup point is a data change, not a component change.
 */
export function LocationPicker({ locations, groups, value, onChange, id, describedBy, invalid, placeholder }) {
  const { locale, t } = useLocaleContext();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const optionRefs = useRef([]);
  const listId = useId();

  const selected = useMemo(
    () => locations.find((l) => l.id === value) ?? null,
    [locations, value],
  );

  const grouped = useMemo(() => {
    const byGroup = new Map();
    for (const g of groups) byGroup.set(g.id, []);
    for (const loc of locations) {
      if (!byGroup.has(loc.group)) byGroup.set(loc.group, []);
      byGroup.get(loc.group).push(loc);
    }
    return groups
      .map((g) => ({ group: g, items: byGroup.get(g.id) ?? [] }))
      .filter((entry) => entry.items.length > 0);
  }, [locations, groups]);

  const flat = useMemo(() => grouped.flatMap((entry) => entry.items), [grouped]);

  const close = useCallback(
    (restoreFocus = true) => {
      setOpen(false);
      if (restoreFocus) triggerRef.current?.focus();
    },
    [],
  );

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) close(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  // Opening is an event, so the initial active option is chosen where the
  // click happens rather than from an effect.
  const indexFor = (id) => Math.max(0, flat.findIndex((l) => l.id === id));
  const openList = () => {
    setActiveIndex(indexFor(value));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    const index = Math.max(0, flat.findIndex((l) => l.id === value));
    const raf = requestAnimationFrame(() => optionRefs.current[index]?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open, value, flat]);

  const move = (delta) => {
    const next = (activeIndex + delta + flat.length) % flat.length;
    setActiveIndex(next);
    optionRefs.current[next]?.focus();
  };

  const select = (location) => {
    onChange?.(location.id);
    close();
  };

  const label = selected
    ? pickLocalized(selected.shortName ?? selected.name, locale)
    : placeholder;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-describedby={describedBy}
        aria-invalid={invalid ? true : undefined}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            if (!open) {
              event.preventDefault();
              openList();
            }
          }
        }}
        className={cn(
          "flex w-full min-w-0 items-center gap-2.5 rounded-md border bg-surface px-3 py-2.5",
          "text-left text-body-sm transition-colors duration-[180ms] ease-out",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
          invalid ? "border-status-closed" : "border-line hover:border-line-strong",
        )}
      >
        <Icon name="pin" className="text-ink-faint" />
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-ink-muted")}>
          {label}
        </span>
        {selected?.code ? (
          <span className="label-micro rounded-xs bg-surface-sunken px-1.5 py-0.5 text-ink-muted" data-keep-mono>
            {selected.code}
          </span>
        ) : null}
        <Icon
          name="chevronDown"
          className={cn("text-ink-faint transition-transform duration-[180ms]", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={t("search.pickupLocation")}
          tabIndex={-1}
          className={cn(
            "absolute inset-x-0 top-[calc(100%+0.4rem)] z-dropdown max-h-[19rem] overflow-y-auto",
            "rounded-lg border border-line bg-surface py-1.5 shadow-pop",
            "focus:outline-none",
          )}
        >
          {grouped.map(({ group, items }) => (
            <div key={group.id} role="group" aria-label={t(`locations.group.${group.id}`)}>
              <div className="flex items-center gap-2 px-3 pb-1 pt-3">
                <span className="label-micro text-ink-faint">
                  {t(`locations.group.${group.id}`)}
                </span>
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
              </div>
              {items.map((loc) => {
                const flatIndex = flat.findIndex((l) => l.id === loc.id);
                const isSelected = loc.id === value;
                return (
                  <div
                    key={loc.id}
                    ref={(el) => {
                      optionRefs.current[flatIndex] = el;
                    }}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={flatIndex === activeIndex ? 0 : -1}
                    onClick={() => select(loc)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        move(1);
                      } else if (event.key === "ArrowUp") {
                        event.preventDefault();
                        move(-1);
                      } else if (event.key === "Home") {
                        event.preventDefault();
                        setActiveIndex(0);
                        optionRefs.current[0]?.focus();
                      } else if (event.key === "End") {
                        event.preventDefault();
                        const last = flat.length - 1;
                        setActiveIndex(last);
                        optionRefs.current[last]?.focus();
                      } else if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        select(loc);
                      } else if (event.key === "Escape") {
                        close();
                      }
                    }}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-3 py-2.5",
                      "transition-colors duration-[120ms]",
                      isSelected ? "bg-accent-soft" : "hover:bg-surface-sunken",
                      "focus-visible:bg-surface-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm text-ink">
                        {pickLocalized(loc.shortName ?? loc.name, locale)}
                      </span>
                      <span className="block truncate text-caption text-ink-muted">
                        {pickLocalized(loc.area, locale)}
                      </span>
                    </span>
                    {loc.serviceFee > 0 ? (
                      <span className="label-micro whitespace-nowrap text-ink-muted" data-keep-mono>
                        {`+${formatMoney(loc.serviceFee, { locale: locale === "ar" ? "ar" : "en-US" })}`}
                      </span>
                    ) : (
                      <span className="label-micro whitespace-nowrap text-status-open">
                        {t("locations.free")}
                      </span>
                    )}
                    {isSelected ? (
                      <Icon name="check" className="text-accent" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default LocationPicker;
