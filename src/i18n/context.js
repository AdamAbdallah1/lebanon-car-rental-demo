import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, dirFor, htmlLangFor, isLocale, pick } from "./localize.js";
import { en } from "./messages.en.js";
import { ar } from "./messages.ar.js";

const catalogues = { en, ar };

export const LocaleContext = createContext(null);

function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match,
  );
}

/**
 * Translate an interface key.
 * Plural keys are addressed as `key` / `key_plural` and selected when
 * `vars.count` is present and not exactly 1.
 */
export function translate(locale, key, vars) {
  const table = catalogues[locale] || catalogues[DEFAULT_LOCALE];
  let resolved = key;

  if (vars && typeof vars.count === "number") {
    const pluralKey = `${key}_plural`;
    if (vars.count !== 1 && Object.prototype.hasOwnProperty.call(table, pluralKey)) {
      resolved = pluralKey;
    } else if (Object.prototype.hasOwnProperty.call(table, key)) {
      resolved = key;
    }
  }

  const template =
    table[resolved] ??
    catalogues[DEFAULT_LOCALE][resolved] ??
    table[key] ??
    catalogues[DEFAULT_LOCALE][key];

  if (template === undefined) {
    if (import.meta.env?.DEV) console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  return interpolate(template, vars);
}

export function useLocaleContext() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}

/** Convenience hook for the common case. */
export function useLocale() {
  const { locale, setLocale, t } = useLocaleContext();
  return { locale, setLocale, t };
}

/**
 * Localized-field resolver bound to the active locale.
 *
 * Call sites may use either `resolve(field)`, `resolve(field, fallback)` or
 * the `pick(field, locale, fallback)` order — a locale in the second position
 * is treated as an explicit override rather than as the fallback string.
 */
export function usePick() {
  const { locale } = useLocaleContext();
  return (field, localeOrFallback, maybeFallback) =>
    isLocale(localeOrFallback)
      ? pick(field, localeOrFallback, maybeFallback ?? "")
      : pick(field, locale, localeOrFallback ?? "");
}

export { dirFor, htmlLangFor, isLocale, pick };
