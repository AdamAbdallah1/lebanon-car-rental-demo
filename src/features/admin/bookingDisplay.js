import { dateLocale } from "../../lib/dates.js";

/**
 * Presentation helpers for the operations surface.
 *
 * Formatting only — no status, price or availability decision is ever made
 * here. Those arrive from the server already decided.
 */

const TIMESTAMP_OPTS = Object.freeze({
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** `09 Oct 2026, 17:32` for an ISO timestamp; an em dash when absent. */
export function formatTimestamp(iso, locale = "en") {
  if (typeof iso !== "string" || iso.length === 0) return "—";
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "—";
  return new Intl.DateTimeFormat(dateLocale(locale), TIMESTAMP_OPTS).format(new Date(parsed));
}

/** Age of a request in whole days — how long it has been waiting. */
export function ageInDays(iso, now = Date.now()) {
  if (typeof iso !== "string") return null;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return null;
  return Math.floor((now - parsed) / 86_400_000);
}

/**
 * Server error codes an operator can act on, mapped to a localized sentence.
 *
 * The server sends a stable machine code (`error.details.code`); its prose is
 * never rendered. Anything unknown falls through to a generic sentence rather
 * than exposing an internal message.
 */
const DECISION_ERROR_KEYS = Object.freeze({
  "vehicle-unavailable": "admin.detail.error.conflict",
  "invalid-transition": "admin.detail.error.stale",
  "invalid-dates": "admin.detail.error.dates",
  "past-date": "admin.detail.error.pastDate",
  "invalid-note": "admin.detail.error.note",
  "not-found": "admin.detail.error.notFound",
  "permission-denied": "admin.detail.error.forbidden",
  "unauthenticated": "admin.detail.error.unauthenticated",
  "failed-precondition": "admin.detail.error.conflict",
  "internal": "admin.detail.error.generic",
  "unknown": "admin.detail.error.generic",
});

export function decisionErrorKey(code) {
  return DECISION_ERROR_KEYS[code] ?? "admin.detail.error.generic";
}
