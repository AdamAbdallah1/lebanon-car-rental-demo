/**
 * Read-time localization for `{ en, ar? }` repository fields.
 *
 * One document per entity — never an EN document and an AR document.
 * Missing translations fall back to English at read time, so a partially
 * translated entry never renders as an empty string.
 */
export const LOCALES = ["en", "ar"];
export const DEFAULT_LOCALE = "en";

export function isLocale(value) {
  return LOCALES.includes(value);
}

export function dirFor(locale) {
  return locale === "ar" ? "rtl" : "ltr";
}

export function htmlLangFor(locale) {
  return locale === "ar" ? "ar" : "en";
}

/**
 * @param {{en?: string, ar?: string}|string|null|undefined} field
 * @param {string} locale
 * @param {string} [fallback]
 */
export function pick(field, locale = DEFAULT_LOCALE, fallback = "") {
  if (field === null || field === undefined) return fallback;
  if (typeof field === "string") return field;
  const primary = field[locale];
  if (typeof primary === "string" && primary.length > 0) return primary;
  const secondary = field[DEFAULT_LOCALE];
  if (typeof secondary === "string" && secondary.length > 0) return secondary;
  // Last resort: any non-empty value present on the field.
  for (const v of Object.values(field)) {
    if (typeof v === "string" && v.length > 0) return v;
  }
  return fallback;
}
