import { addDays, isValidISO, rentalDays, todayISO } from "../../lib/dates.js";

/**
 * Search state lives in the URL so results are shareable, back-button-safe
 * and identical in both languages.
 *
 *   /fleet?loc=bey-airport&from=2026-11-04&to=2026-11-08&cat=suv
 *
 * These helpers are pure — no React, no router — so the hero, the fleet page
 * and the vehicle page all read the same state the same way.
 */

export const SEARCH_KEYS = { loc: "loc", from: "from", to: "to", cat: "cat", sort: "sort" };

const SORTS = new Set(["sortOrder", "priceAsc", "priceDesc"]);

const DEFAULT_DURATION_DAYS = 3;

export function readSearchState(params) {
  const get = (key) => params?.get?.(key) ?? null;

  const pickupDate = isValidISO(get(SEARCH_KEYS.from)) ? get(SEARCH_KEYS.from) : null;
  let returnDate = isValidISO(get(SEARCH_KEYS.to)) ? get(SEARCH_KEYS.to) : null;

  // A pickup date without a return date is not a search — do not guess one.
  if (!pickupDate) returnDate = null;

  const rawSort = get(SEARCH_KEYS.sort);
  const sort = SORTS.has(rawSort) ? rawSort : null;

  return {
    locationId: get(SEARCH_KEYS.loc) || null,
    pickupDate,
    returnDate,
    category: get(SEARCH_KEYS.cat) || "all",
    sort,
  };
}

export function hasSearchCriteria(state) {
  return Boolean(state?.locationId || (state?.pickupDate && state?.returnDate));
}

export function searchQuery(state) {
  const params = new URLSearchParams();
  if (state?.locationId) params.set(SEARCH_KEYS.loc, state.locationId);
  if (state?.pickupDate) params.set(SEARCH_KEYS.from, state.pickupDate);
  if (state?.returnDate) params.set(SEARCH_KEYS.to, state.returnDate);
  if (state?.category && state.category !== "all") params.set(SEARCH_KEYS.cat, state.category);
  if (state?.sort && state.sort !== "sortOrder") params.set(SEARCH_KEYS.sort, state.sort);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function fleetHref(state) {
  return `/fleet${searchQuery(state)}`;
}

/** Prefill dates so the widget is usable on first paint. */
export function withDefaultDates(state) {
  if (state.pickupDate && state.returnDate) return state;
  const from = state.pickupDate ?? todayISO();
  const to = state.returnDate ?? addDays(from, DEFAULT_DURATION_DAYS);
  return { ...state, pickupDate: from, returnDate: to };
}

/**
 * Validation returns message keys (not rendered strings) so the UI decides
 * how to translate them.
 * @returns {{location: string|null, dates: string|null, range: string|null}}
 */
export function validateSearch(state) {
  const errors = { location: null, dates: null, range: null };

  if (!state?.locationId) errors.location = "search.validation.location";

  if (!state?.pickupDate || !state?.returnDate) {
    errors.dates = "search.validation.dates";
  } else if (rentalDays(state.pickupDate, state.returnDate) === null) {
    errors.range = "search.validation.range";
  }

  return errors;
}

export function searchErrorKeys(errors) {
  return Object.values(errors).filter(Boolean);
}
