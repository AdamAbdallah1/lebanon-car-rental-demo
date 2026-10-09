import { createHash } from "node:crypto";

/**
 * Deterministic document IDs.
 *
 * The idempotency marker's key is a hash rather than the raw value so that a
 * customer's email address never becomes a document ID. Only the Admin SDK can
 * read this collection, but there is no reason to store it in the clear.
 */
export function sha256(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}
