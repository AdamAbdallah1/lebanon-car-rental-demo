/**
 * Booking status → presentation.
 *
 * Status is business data: it gets a semantic status token and a text label,
 * never a decorative colour. Shared by the public receipt (`BookPage`) and the
 * operations surface so the same status never reads two ways.
 *
 * Tone names must exist in `StatusMark`'s `TONES` table — an unknown tone
 * silently falls back to "available", which would render a declined request
 * green. That is exactly the kind of quiet wrongness this module prevents.
 */
const TONE = Object.freeze({
  pending: "pending",
  proposed: "limited",
  confirmed: "available",
  declined: "unavailable",
  cancelled: "unavailable",
});

const LABEL_KEY = Object.freeze({
  pending: "booking.status.pending",
  proposed: "booking.status.proposed",
  confirmed: "booking.status.confirmed",
  declined: "booking.status.declined",
  cancelled: "booking.status.cancelled",
});

export function statusTone(status) {
  return TONE[status] ?? "pending";
}

export function statusLabelKey(status) {
  return LABEL_KEY[status] ?? "booking.status.pending";
}

/** Every status the inbox filters on, in the order an operator scans them. */
export const BOOKING_STATUSES = Object.freeze([
  "pending",
  "proposed",
  "confirmed",
  "declined",
  "cancelled",
]);

/** Staff actions, in the order they appear on a pending request. */
export const ACTION_LABEL_KEY = Object.freeze({
  confirm: "admin.action.confirm",
  propose: "admin.action.propose",
  decline: "admin.action.decline",
  cancel: "admin.action.cancel",
});
