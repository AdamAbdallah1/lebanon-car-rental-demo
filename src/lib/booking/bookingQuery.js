import { statusLabelKey, statusTone } from "../../lib/booking/statusDisplay.js";

/**
 * One filter pass over a list of booking requests.
 *
 * Shared by both adapters (`seedAdapter` and `firestoreAdapter`) so the inbox
 * cannot behave differently depending on which backend answered. Firestore
 * narrows server-side first — it applies `status` as a `where` and orders by
 * `createdAt` — then this runs over the result; against the seed adapter it is
 * the whole filter. Running it twice is harmless because it is idempotent.
 *
 * `search` is deliberately client-side: Firestore has no full-text query, and
 * an operator looking for "khalil" or "CD-2026" should not care which backend
 * is answering.
 */
export function applyBookingFilters(rows, filters = {}) {
  let out = Array.isArray(rows) ? [...rows] : [];

  if (filters.status) out = out.filter((row) => row.status === filters.status);
  if (filters.vehicleId) out = out.filter((row) => row.vehicleId === filters.vehicleId);

  const needle = typeof filters.search === "string" ? filters.search.trim().toLowerCase() : "";
  if (needle) {
    out = out.filter((row) =>
      [
        row.reference,
        row.vehicleName,
        row.customer?.fullName,
        row.customer?.email,
        row.customer?.phone,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }

  // Newest first. A missing `createdAt` sorts last rather than throwing.
  out.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));

  if (filters.limit) out = out.slice(0, filters.limit);
  return out;
}

export { statusLabelKey, statusTone };
