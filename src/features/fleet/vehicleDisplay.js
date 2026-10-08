import { pick } from "../../i18n/localize.js";
import { formatMoney } from "../../lib/money.js";

/**
 * Vehicle → presentation helpers.
 * Prices, totals and availability always arrive pre-computed from the
 * pricing / availability services; nothing here does business arithmetic.
 */

export function vehicleName(vehicle, locale) {
  const base = pick(vehicle.name, locale, vehicle.model ?? "");
  const trim = pick(vehicle.trimName, locale, "");
  return trim ? `${base}` : base;
}

export function vehicleFullName(vehicle, locale) {
  const base = pick(vehicle.name, locale, vehicle.model ?? "");
  const trim = pick(vehicle.trimName, locale, "");
  return trim ? `${base} ${trim}` : base;
}

export function vehicleAlt(vehicle, locale, index = 0) {
  const name = pick(vehicle.name, locale, "");
  const body = pick(vehicle.bodyType, locale, "");
  if (index === 0) {
    return locale === "ar"
      ? `${name} — ${body} معروضة في ضوء النهار`
      : `${name} — ${body} shown in daylight`;
  }
  return locale === "ar"
    ? `${name} — صورة ${index + 1}`
    : `${name} — photograph ${index + 1}`;
}

const FUEL_LABEL = {
  petrol: "fuel.petrol",
  diesel: "fuel.diesel",
  hybrid: "fuel.hybrid",
  electric: "fuel.electric",
};

/** The three or four spec cells printed on a card. */
export function specCells(vehicle, locale, t) {
  const cells = [
    {
      key: "transmission",
      icon: "gear",
      label: t("spec.transmission"),
      value:
        locale === "ar"
          ? vehicle.specs.transmission === "manual"
            ? "يدوي"
            : "أوتوماتيك"
          : vehicle.specs.transmission === "manual"
            ? "Manual"
            : "Automatic",
    },
    {
      key: "fuel",
      icon: "fuel",
      label: t("spec.fuel"),
      value: t(FUEL_LABEL[vehicle.specs.fuel] ?? "fuel.petrol"),
    },
    {
      key: "seats",
      icon: "seats",
      label: t("spec.seats"),
      value: String(vehicle.specs.seats),
    },
    {
      key: "luggage",
      icon: "luggage",
      label: t("spec.luggage"),
      value: String(vehicle.specs.luggage),
    },
  ];
  return cells;
}

/** Full spec row for the vehicle detail page. */
export function fullSpecCells(vehicle, locale, t) {
  return [
    ...specCells(vehicle, locale, t),
    {
      key: "doors",
      icon: "door",
      label: t("spec.doors"),
      value: String(vehicle.specs.doors),
    },
    {
      key: "body",
      icon: "route",
      label: t("spec.body"),
      value: pick(vehicle.bodyType, locale, "—"),
    },
    {
      key: "year",
      icon: "calendar",
      label: t("spec.year"),
      value: String(vehicle.year),
    },
    {
      key: "mileage",
      icon: "route",
      label: t("spec.mileage"),
      value: `${vehicle.mileage.includedPerDayKm} km`,
    },
  ];
}

export function availabilityLabelKey(state) {
  if (state === "unavailable") return "card.availability.unavailable";
  if (state === "limited") return "card.availability.limited";
  if (state === "onRequest") return "card.availability.onRequest";
  return "card.availability.available";
}

/** Daily price line — "From $28" without dates, "$28 / day" with dates. */
export function priceLine(quote, locale) {
  if (!quote) return "";
  const currency = quote.currency;
  const fmt = (v) => formatMoney(v, { locale: locale === "ar" ? "ar" : "en-US", currency });
  return quote.hasDates
    ? `${fmt(quote.discountedDailyRate)}`
    : `${fmt(quote.dailyRate)}`;
}
