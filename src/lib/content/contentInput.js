/**
 * Shared authoring helpers for the console's content sections.
 *
 * The same rule as the fleet: these modules hold the *shape* of a document and
 * decide whether a form is complete. Nothing here renders, and no price or
 * availability is ever decided — that belongs to the pricing service and the
 * callables. Each one mirrors the matching block in `firestore.rules` so that a
 * form the UI accepts is a write the rules accept.
 */

/** Publish states shared by every editable collection. */
export const CONTENT_STATUSES = Object.freeze(["active", "draft", "archived"]);

/** Non-empty text, or `null`. */
export function text(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length ? trimmed : null;
}

/** A non-negative number, or `null`. Never parsed from a locale-formatted string. */
export function number(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  const parsed = Number(trimmed.replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function integer(value) {
  const parsed = number(value);
  return parsed === null ? null : Math.trunc(parsed);
}

/**
 * `{ en, ar }` with the Arabic half omitted when empty.
 *
 * Both languages live on one document. A missing translation falls back to
 * English at read time rather than rendering as a blank.
 */
export function localized(en, ar) {
  const english = text(en);
  const arabic = text(ar);
  if (english === null) return null;
  return arabic === null || arabic === english ? { en: english } : { en: english, ar: arabic };
}

export function list(values) {
  return (values ?? []).map((value) => String(value)).filter(Boolean);
}

function sameValue(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The minimal write: the keys whose normalised value actually changed.
 *
 * Sending the whole document would let an untouched field overwrite a good one,
 * and it would break the `hasOnly(...)` bounds several rules impose on update.
 */
export function patchFrom(before, after, allowedKeys) {
  const patch = {};
  for (const key of Object.keys(after)) {
    if (allowedKeys && !allowedKeys.includes(key)) continue;
    if (!sameValue(before[key], after[key])) patch[key] = after[key];
  }
  return patch;
}

/** Strip the keys a caller passed in by mistake, e.g. a stale `id`. */
export function documentFrom(input) {
  const fields = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === "id" || key.startsWith("_")) continue;
    fields[key] = value;
  }
  return fields;
}
