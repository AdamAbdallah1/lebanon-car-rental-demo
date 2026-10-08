/**
 * Date utilities for the rental domain.
 *
 * Dates are stored as ISO `YYYY-MM-DD` strings (language-neutral business
 * data) and only formatted at the presentation edge.
 */

const MS_DAY = 86_400_000;

/** Locale used for Arabic display. Latin numerals are intentional: the
 *  Lebanese commercial context prices and dates in Latin digits. */
const AR_LOCALE = "ar-LB-u-nu-latn";
const EN_LOCALE = "en-GB";

export function dateLocale(locale) {
  return locale === "ar" ? AR_LOCALE : EN_LOCALE;
}

/** Today's calendar date as `YYYY-MM-DD`. */
export function todayISO(now = new Date()) {
  return toISODate(now);
}

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse `YYYY-MM-DD` into a local-midnight Date. Returns null if invalid. */
export function parseISO(value) {
  if (typeof value !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12) return null;
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1) return null;
  return date;
}

export function isValidISO(value) {
  return parseISO(value) !== null;
}

export function addDays(iso, days) {
  const d = parseISO(iso);
  if (!d) return null;
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Whole days between two ISO dates (return − pickup). Never negative. */
export function daysBetween(fromISO, toISO) {
  const a = parseISO(fromISO);
  const b = parseISO(toISO);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / MS_DAY);
}

/**
 * Billable rental days.
 * Pickup → return is measured in 24h periods; a same-day rental is 1 day.
 */
export function rentalDays(pickupISO, returnISO) {
  const diff = daysBetween(pickupISO, returnISO);
  if (diff === null || diff < 0) return null;
  return Math.max(1, diff);
}

export function isFuture(iso, now = new Date()) {
  const d = parseISO(iso);
  return d ? d.getTime() > new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() : false;
}

export function isValidRange(pickupISO, returnISO) {
  const diff = daysBetween(pickupISO, returnISO);
  return diff !== null && diff >= 0;
}

/** `01 Jun 2026` style display. */
export function formatDate(iso, locale = "en", opts = {}) {
  const d = parseISO(iso);
  if (!d) return "";
  return new Intl.DateTimeFormat(dateLocale(locale), {
    day: opts.day ?? "2-digit",
    month: opts.month ?? "short",
    year: opts.year ?? "numeric",
  }).format(d);
}

/** `Mon 01 Jun` — compact, for chips. */
export function formatDateShort(iso, locale = "en") {
  const d = parseISO(iso);
  if (!d) return "";
  return new Intl.DateTimeFormat(dateLocale(locale), {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(d);
}

/** Weekday name — used to warn about same-day returns. */
export function weekdayName(iso, locale = "en") {
  const d = parseISO(iso);
  if (!d) return "";
  return new Intl.DateTimeFormat(dateLocale(locale), { weekday: "long" }).format(d);
}
