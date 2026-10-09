/**
 * Firestore reads shared by the callables.
 *
 * Written against firebase-admin's namespaced API (`collection().where()`),
 * because `Transaction.get()` accepts those query objects directly — which is
 * how a read can be made *inside* the transaction that commits it.
 *
 * Every reader therefore comes in two forms: `xFrom(snapshot)` for use inside
 * a transaction, and `readX(db)` for use outside one.
 */

/** `blocksQuery(db, id)` → a query object usable with `.get()` or `tx.get()`. */
export function blocksQuery(db, vehicleId) {
  return db.collection("blockPeriods").where("vehicleId", "==", vehicleId);
}

export function blocksFrom(snapshot) {
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function readBlocks(db, vehicleId) {
  return blocksFrom(await blocksQuery(db, vehicleId).get());
}

/**
 * The rate plan the storefront prices with: first active plan by sortOrder.
 * Read inside the transaction so the committed quote matches committed data.
 */
export function ratePlanQuery(db) {
  return db
    .collection("ratePlans")
    .where("status", "==", "active")
    .orderBy("sortOrder", "asc")
    .limit(1);
}

export function ratePlanFrom(snapshot) {
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}

export async function readRatePlan(db) {
  return ratePlanFrom(await ratePlanQuery(db).get());
}

export function recordFrom(snapshot) {
  if (!snapshot?.exists) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

export async function readRecord(db, path) {
  return recordFrom(await db.doc(path).get());
}

/** Confirmed requests for a vehicle — the belt to `blockPeriods`' braces. */
export function confirmedRequestsQuery(db, vehicleId) {
  return db
    .collection("bookingRequests")
    .where("vehicleId", "==", vehicleId)
    .where("status", "==", "confirmed");
}

export function confirmedFrom(snapshot, excludeId) {
  return snapshot.docs
    .filter((d) => d.id !== excludeId)
    .map((d) => ({ id: d.id, ...d.data() }));
}
