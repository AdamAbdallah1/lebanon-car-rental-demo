import { useCallback, useEffect, useMemo, useState } from "react";
import { LocaleContext, dirFor, htmlLangFor, isLocale, translate } from "./context.js";
import { DEFAULT_LOCALE, LOCALES } from "./localize.js";

const STORAGE_KEY = "cedars-drive.locale";

function readStoredLocale() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* storage may be unavailable (private mode) — fall through */
  }
  return null;
}

/**
 * `?lang=` is honoured on load so a link can carry the language, while the
 * canonical URL for every route stays identical across languages.
 */
function readLocaleFromUrl() {
  try {
    const value = new URLSearchParams(window.location.search).get("lang");
    if (isLocale(value)) return value;
  } catch {
    /* ignore */
  }
  return null;
}

function detectInitialLocale() {
  return (
    readLocaleFromUrl() ||
    readStoredLocale() ||
    (typeof navigator !== "undefined" && navigator.language?.startsWith("ar")
      ? "ar"
      : DEFAULT_LOCALE)
  );
}

function persist(locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* non-fatal */
  }
}

function syncDocument(locale) {
  const root = document.documentElement;
  root.lang = htmlLangFor(locale);
  root.dir = dirFor(locale);
}

/**
 * Locale state: `<html lang>` / `<html dir>`, storage, and the `?lang=`
 * override. Route paths are shared between languages on purpose — the
 * architecture supports hreflang alternates without duplicating pages.
 */
export default function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(() =>
    typeof window === "undefined" ? DEFAULT_LOCALE : detectInitialLocale(),
  );

  useEffect(() => {
    syncDocument(locale);
  }, [locale]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY && isLocale(event.newValue)) {
        setLocaleState(event.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setLocale = useCallback((next) => {
    if (!isLocale(next) || next === locale) return;
    persist(next);
    syncDocument(next);
    setLocaleState(next);
    // Keep the URL honest without navigating.
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* ignore */
    }
  }, [locale]);

  const t = useCallback(
    (key, vars) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, dir: dirFor(locale), setLocale, t, locales: LOCALES }),
    [locale, setLocale, t],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
