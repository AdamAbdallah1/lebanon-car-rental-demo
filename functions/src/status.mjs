import { adminDb } from "./app.mjs";
import { appError } from "./errors.mjs";
import { publicStatusOf } from "../../src/lib/booking/bookingDecision.js";

/**
 * Public status lookup for a submitted request.
 *
 * This is what lets the customer-facing confirmation page stay honest: it can
 * re-read the *authoritative* state instead of repeating whatever the response
 * happened to say at the moment of submission.
 *
 * It is deliberately narrow. A caller who knows a reference — which is the
 * customer — learns the state and the dates, and nothing else. No name, no
 * email, no phone, no internal notes, no audit actor identities. References
 * are second-resolution and generated server-side, so they are not enumerable;
 * this endpoint still returns the same minimal payload either way.
 *
 * The payload shape is built by `publicStatusOf`, shared with the seed
 * adapter, so both backends answer identically.
 */
export async function handleGetBookingStatus(payload) {
  const raw = typeof payload?.reference === "string" ? payload.reference.trim() : "";
  const reference = raw.toUpperCase();
  if (!reference || reference.length > 40) throw appError("invalid-request");

  const db = adminDb();
  const snap = await db
    .collection("bookingRequests")
    .where("reference", "==", reference)
    .limit(1)
    .get();

  if (snap.empty) throw appError("not-found");

  return publicStatusOf(snap.docs[0].data());
}
