import { adminDb } from "./app.mjs";
import { appError } from "./errors.mjs";
import {
  applyDecision,
  normalizeDecisionInput,
  targetStatus,
} from "../../src/lib/booking/bookingDecision.js";
import {
  blocksFrom,
  blocksQuery,
  confirmedFrom,
  confirmedRequestsQuery,
  ratePlanFrom,
  ratePlanQuery,
  recordFrom,
} from "./readers.mjs";

/**
 * Review a booking request — the only way a request can leave `pending`.
 *
 * Authorization is read from the Auth **custom claim**, never from anything a
 * client can write. Roles are minted by `scripts/set-role.mjs` with the Admin
 * SDK; there is no document anywhere that grants one.
 *
 * Everything that must be consistent happens in one transaction:
 *   • the status transition (validated against a closed table in
 *     `bookingDecision.js`),
 *   • a conflict check against both `blockPeriods` *and* every other confirmed
 *     request for that vehicle,
 *   • the block period that holds the vehicle for those dates,
 *   • the audit entry naming who did it, when, and what changed.
 *
 * Confirming a request whose dates changed re-prices it first. The stored
 * quote belongs to the dates the customer asked for, not the dates being
 * booked.
 */
export async function handleSubmitBookingDecision(payload, auth) {
  if (!auth?.uid) throw appError("unauthenticated");

  const role = auth.token?.role ?? null;
  if (role !== "admin" && role !== "agent") throw appError("permission-denied");

  const input = normalizeDecisionInput(payload);
  const actor = {
    uid: auth.uid,
    email: auth.token?.email ?? null,
    role,
  };

  const db = adminDb();
  const now = new Date();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(db.doc(`bookingRequests/${input.requestId}`));
    if (!snap.exists) throw appError("not-found");
    const request = { id: snap.id, ...snap.data() };

    // Repeating a decision that already landed is a retry, not a conflict —
    // answer before spending any reads on a transaction we will not write.
    if (request.status === targetStatus(input.action)) {
      return { id: request.id, noop: true, ...request };
    }

    let blocks = [];
    let confirmedRequests = [];
    let vehicle = null;
    let location = null;
    let ratePlan = null;

    if (input.action === "confirm") {
      blocks = blocksFrom(await tx.get(blocksQuery(db, request.vehicleId)));
      confirmedRequests = confirmedFrom(
        await tx.get(confirmedRequestsQuery(db, request.vehicleId)),
        request.id,
      );
      vehicle = recordFrom(await tx.get(db.doc(`vehicles/${request.vehicleId}`)));
      location = recordFrom(await tx.get(db.doc(`locations/${request.pickupLocationId}`)));
      ratePlan = ratePlanFrom(await tx.get(ratePlanQuery(db)));
    }

    const result = applyDecision({
      request,
      input,
      actor,
      now,
      blocks,
      confirmedRequests,
      vehicle,
      location,
      ratePlan,
    });

    if (result.noop) return { id: request.id, noop: true, ...request };

    const requestRef = db.doc(`bookingRequests/${input.requestId}`);
    tx.update(requestRef, result.changes);

    const blockRef = db.doc(`blockPeriods/${input.requestId}`);
    if (result.block) tx.set(blockRef, result.block);
    if (result.deleteBlock) tx.delete(blockRef);

    return { id: request.id, noop: false, ...request, ...result.changes };
  });
}
