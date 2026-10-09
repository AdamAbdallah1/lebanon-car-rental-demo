import { HttpsError } from "firebase-functions/v2/https";
import { DomainError } from "../../src/lib/booking/bookingRecord.js";

/**
 * Errors leave the server as a stable machine `code` plus a Firebase
 * `HttpsError` function code. The web app maps `code` to a localized string —
 * server messages are never rendered to a customer.
 */
const FN_CODE = {
  // validation
  "invalid-vehicle": "invalid-argument",
  "invalid-location": "invalid-argument",
  "invalid-date": "invalid-argument",
  "invalid-range": "invalid-argument",
  "past-date": "invalid-argument",
  "invalid-name": "invalid-argument",
  "invalid-email": "invalid-argument",
  "invalid-phone": "invalid-argument",
  "invalid-notes": "invalid-argument",
  "invalid-action": "invalid-argument",
  "invalid-request": "invalid-argument",
  "invalid-dates": "invalid-argument",
  "invalid-note": "invalid-argument",
  // preconditions
  "vehicle-not-found": "failed-precondition",
  "location-not-found": "failed-precondition",
  "vehicle-unavailable": "failed-precondition",
  "invalid-transition": "failed-precondition",
  "reference-exhausted": "internal",
  // access
  "unauthenticated": "unauthenticated",
  "permission-denied": "permission-denied",
  // lookup
  "not-found": "not-found",
};

export function appError(code, extra = {}) {
  const fn = FN_CODE[code] ?? "internal";
  return new HttpsError(fn, code, { code, ...extra });
}

/** Domain/validation error → wire error. Never leaks an internal message. */
export function toAppError(error) {
  if (error instanceof HttpsError) return error;
  if (error instanceof DomainError) return appError(error.code);
  return new HttpsError("internal", "internal", { code: "internal" });
}

/** Re-throw with the code mapped, preserving `message` for logs. */
export function rethrow(error) {
  const mapped = toAppError(error);
  if (!(error instanceof HttpsError)) {
    console.error("[functions]", error?.code ?? "error", error?.message ?? error);
  }
  throw mapped;
}
