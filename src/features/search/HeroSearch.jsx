import { useMemo, useState } from "react";
import { cn } from "../../lib/cn.js";
import { useLocaleContext } from "../../i18n/context.js";
import { todayISO } from "../../lib/dates.js";
import { addDays } from "../../lib/dates.js";
import Button from "../../components/ui/Button.jsx";
import Field from "../../components/ui/Field.jsx";
import DateInput from "../../components/ui/DateInput.jsx";
import LocationPicker from "./LocationPicker.jsx";
import { useLocations } from "./useLocations.js";
import { searchErrorKeys, validateSearch } from "./searchState.js";

/**
 * The hero search: pick-up location + pick-up date + return date + CTA.
 *
 * Return location is intentionally not a field — it defaults to pick-up and
 * the alternative is offered later in the flow (the architecture supports
 * a different return location; Phase 1 does not expose it as a form control).
 * Times, timezone, residence country and age band are Phase 2 inputs.
 */
export function HeroSearch({ value, onChange, onSubmit, layout = "panel" }) {
  const { t, locale } = useLocaleContext();
  const { data, loading, error, reload } = useLocations();
  const [submitted, setSubmitted] = useState(false);

  const locations = data?.locations ?? [];
  const groups = data?.groups ?? [];

  const errors = useMemo(() => validateSearch(value), [value]);
  const showError = (key) => (submitted ? errors[key] : null);

  const today = todayISO();
  const minReturn = value.pickupDate ? value.pickupDate : today;
  const maxDate = addDays(today, 90);

  const patch = (next) => onChange?.({ ...value, ...next });

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (searchErrorKeys(errors).length === 0) onSubmit?.(value);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={t("search.legend")}
      className={cn(
        layout === "panel"
          ? // Solid, not frosted: `backdrop-blur` above the fold costs real
            // paint time and reads generic now. Opacity ≥0.97 keeps the panel
            // legible over any part of the photo.
            "mx-auto w-full max-w-[1040px] rounded-lg border border-line bg-canvas/98 p-4 text-start shadow-lift sm:p-5"
          : "w-full",
      )}
    >
      <fieldset className="m-0 border-0 p-0">
        <legend className="label-micro mb-3 text-ink-muted">{t("search.legend")}</legend>

        {/*
          The panel is 1040px wide, so desktop finally has room for one row:
          location (1.4fr) · pick-up date · return date · CTA. Below lg it
          falls back to a stacked column, then a 2×2 at sm.

          `items-start` (not `end`) keeps the labels — and therefore the inputs
          on every cell — on one baseline even though only the return date
          carries a hint. That hint is also the only cell taller than the rest,
          so the CTA opts into `self-end` to land on the same floor.
        */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:gap-2">
          <Field
            label={t("search.pickupLocation")}
            required
            error={showError("location")}
            id="search-location"
            className="sm:col-span-2 lg:col-span-1"
          >
            {({ id, describedBy }) => (
              <LocationPicker
                id={id}
                describedBy={describedBy}
                locations={locations}
                groups={groups}
                value={value.locationId ?? ""}
                invalid={Boolean(showError("location"))}
                onChange={(locationId) => patch({ locationId })}
                placeholder={
                  loading
                    ? t("states.loading")
                    : error
                      ? t("states.error.title")
                      : t("search.placeholderLocation")
                }
              />
            )}
          </Field>

          <Field
            label={t("search.pickupDate")}
            required
            error={showError("dates") ?? showError("range")}
            id="search-from"
          >
            {({ id, describedBy }) => (
              <DateInput
                id={id}
                describedBy={describedBy}
                value={value.pickupDate}
                min={today}
                max={maxDate}
                invalid={Boolean(showError("dates") ?? showError("range"))}
                onChange={(pickupDate) => {
                  const next = { pickupDate };
                  // Keep the return date coherent whenever pickup moves.
                  if (value.returnDate && value.returnDate < pickupDate) {
                    next.returnDate = addDays(pickupDate, 3);
                  }
                  patch(next);
                }}
              />
            )}
          </Field>

          <Field
            label={t("search.returnDate")}
            required
            hint={t("search.returnHint")}
            error={showError("range")}
            id="search-to"
          >
            {({ id, describedBy }) => (
              <DateInput
                id={id}
                describedBy={describedBy}
                value={value.returnDate}
                min={minReturn}
                max={maxDate}
                invalid={Boolean(showError("range"))}
                onChange={(returnDate) => patch({ returnDate })}
              />
            )}
          </Field>

          <div className="sm:col-span-2 lg:col-span-1 lg:self-center">
            <Button type="submit" size="lg" className="w-full lg:w-auto">
              <span className="whitespace-nowrap">{t("search.submit")}</span>
              <span aria-hidden="true" dir="ltr">
                {locale === "ar" ? "←" : "→"}
              </span>
            </Button>
          </div>
        </div>
      </fieldset>

      {error ? (
        <p className="mt-3 text-caption text-status-closed" role="alert">
          {t("states.error.body")}{" "}
          <button
            type="button"
            onClick={reload}
            className="underline underline-offset-4 hover:text-accent"
          >
            {t("states.retry")}
          </button>
        </p>
      ) : null}
    </form>
  );
}

export default HeroSearch;
