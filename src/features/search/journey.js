import { SEARCH_KEYS } from "./searchState.js";

/**
 * Journey continuity.
 *
 * Location, dates, trip filters, selected vehicle and the language override
 * are one piece of state. On the routes that take part in a rental they must
 * survive every internal navigation, or a search made in the hero dies at
 * the first click.
 *
 * Routes outside the journey (`/about`, `/faq`, `/contact`, …) are left
 * alone — carrying `?from=…` onto a company page is noise, not continuity.
 *
 * Pure — no React, no router — so links can be built anywhere.
 */

const JOURNEY_KEYS = [...Object.values(SEARCH_KEYS), "lang", "vehicle"];

/** Exact routes plus route prefixes that belong to the rental journey. */
const JOURNEY_ROUTES = ["/fleet", "/locations", "/vehicle/", "/book"];

export function isJourneyRoute(target) {
  const path = String(target).split("?")[0];
  return JOURNEY_ROUTES.some((route) =>
    route.endsWith("/") ? path.startsWith(route) : path === route || path.startsWith(`${route}/`),
  );
}

/**
 * Append the journey params carried by `current` onto `target`.
 *
 * `target` may already carry params (e.g. `/book?vehicle=x`). Params already
 * present on the target win, so a deliberate link is never overwritten by
 * whatever happens to be in the URL.
 *
 * @param {string} target  path, optionally with its own query
 * @param {URLSearchParams|string|null} [current]
 * @returns {string}
 */
export function carryJourney(target, current) {
  if (!current) return target;

  const [path, existing = ""] = String(target).split("?");
  const out = new URLSearchParams(existing);
  const source = new URLSearchParams(current);

  for (const key of JOURNEY_KEYS) {
    if (out.has(key)) continue;
    const value = source.get(key);
    if (value) out.set(key, value);
  }

  const qs = out.toString();
  return qs ? `${path}?${qs}` : path;
}

/** `carryJourney`, gated to journey routes. */
export function journeyHref(target, current) {
  return isJourneyRoute(target) ? carryJourney(target, current) : target;
}

export { JOURNEY_KEYS, JOURNEY_ROUTES };
