import { adminDb } from "./app.mjs";
import { appError } from "./errors.mjs";
import {
  blocksFrom,
  blocksQuery,
  ratePlanFrom,
  ratePlanQuery,
  readRecord,
} from "./readers.mjs";
import { sha256 } from "./hash.mjs";
import {
  DUPLICATE_WINDOW_MS,
  buildBookingRecord,
  evaluateRequest,
  idempotencyKeyFor,
  normalizeBookingInput,
  referenceBase,
  referenceCandidate,
} from "../../src/lib/booking/bookingRecord.js";

/**
 * Create a booking request — the privileged half of the public booking flow.
 *
 * What a client is trusted for: *nothing but its own intent*. It may say which
 * car, which dates, which counter and who it is. Everything else is decided
 * here, inside a single Firestore transaction:
 *
 *   1. **Dedupe.** A marker document keyed by a hash of the submission is read
 *      first; if the same submission landed inside the window, the existing
 *      request is returned instead of a second one being created.
 *   2. **Reference.** `CD-YYYYMMDD-HHMMSS` (business timezone) is allocated
 *      against `requestReferences/<ref>` markers, so a reference can never be
 *      handed out twice and never changes afterwards.
 *   3. **Availability.** Block periods are re-read *inside* this transaction —
 *      a check performed before the write proves nothing about the write.
 *   4. **Price.** `quoteVehicle` runs against the server's copy of the vehicle
 *      and the committed rate plan. A client-supplied total is never read.
 *   5. **Status.** Always `pending`. Nothing here can produce a confirmed
 *      booking; that takes a staff decision with its own transaction.
 *
 * The domain logic itself lives in `src/lib/booking/bookingRecord.js` and is
 * shared byte-for-byte with the demo adapter, so both produce identical
 * records.
 */
export async function handleCreateBookingRequest(payload) {
  const input = normalizeBookingInput(payload);
  const db = adminDb();
  const now = new Date();
  const nowMs = now.getTime();

  const idempotencyKey = idempotencyKeyFor(input);
  const markerId = sha256(idempotencyKey);

  const vehicle = await readRecord(db, `vehicles/${input.vehicleId}`);
  if (!vehicle) throw appError("vehicle-not-found");
  const location = await readRecord(db, `locations/${input.pickupLocationId}`);
  if (!location) throw appError("location-not-found");

  return db.runTransaction(async (tx) => {
    // ---- 1. has this already landed? ------------------------------------
    const idemSnap = await tx.get(db.doc(`requestIdempotency/${markerId}`));
    if (idemSnap.exists) {
      const marker = idemSnap.data();
      if (nowMs - marker.createdAtMs < DUPLICATE_WINDOW_MS) {
        const existing = await tx.get(db.doc(`bookingRequests/${marker.requestId}`));
        if (existing.exists) {
          return { id: existing.id, duplicate: true, ...existing.data() };
        }
      }
    }

    // ---- 2. allocate a unique, human-quotable reference -------------------
    const base = referenceBase(now);
    let reference = null;
    for (let attempt = 0; attempt < 500 && !reference; attempt += 1) {
      const candidate = referenceCandidate(base, attempt);
      const marker = await tx.get(db.doc(`requestReferences/${candidate}`));
      if (!marker.exists) reference = candidate;
    }
    if (!reference) throw appError("reference-exhausted");

    // ---- 3. fresh availability, 4. authoritative price --------------------
    const blocks = blocksFrom(await tx.get(blocksQuery(db, input.vehicleId)));
    const ratePlan = ratePlanFrom(await tx.get(ratePlanQuery(db)));

    const { availability, quote } = evaluateRequest({
      vehicle,
      location,
      ratePlan,
      blocks,
      input,
    });
    if (availability.state === "unavailable") throw appError("vehicle-unavailable");

    // ---- 5. commit --------------------------------------------------------
    const requestRef = db.collection("bookingRequests").doc();
    const record = buildBookingRecord({
      input,
      vehicle,
      location,
      quote,
      reference,
      idempotencyKey,
      availabilityCheckedAt: now.toISOString(),
    });
    record.createdAt = now.toISOString();
    record.updatedAt = now.toISOString();

    tx.set(requestRef, record);
    tx.set(db.doc(`requestIdempotency/${markerId}`), {
      idempotencyKey,
      requestId: requestRef.id,
      reference,
      createdAtMs: nowMs,
    });
    tx.set(db.doc(`requestReferences/${reference}`), {
      requestId: requestRef.id,
      vehicleId: input.vehicleId,
      createdAtMs: nowMs,
    });

    return { id: requestRef.id, duplicate: false, ...record };
  });
}
