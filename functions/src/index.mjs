import { onCall } from "firebase-functions/v2/https";

import { handleCreateBookingRequest } from "./create.mjs";
import { handleSubmitBookingDecision } from "./decision.mjs";
import { handleGetBookingStatus } from "./status.mjs";
import { rethrow } from "./errors.mjs";

/**
 * Cedars Drive — trusted server-side boundary.
 *
 * Three callables, each wrapping a plain handler so the transaction logic stays
 * testable without a Firebase request around it.
 *
 *   createBookingRequest  public      → pending request, priced and de-duplicated
 *   getBookingStatus      public      → authoritative state for one reference
 *   submitBookingDecision staff only  → confirm / decline / propose / cancel
 *
 * Role assignment is deliberately *not* a function: it is `scripts/set-role.mjs`
 * running with the Admin SDK, so nothing reachable from a client can mint a
 * claim.
 *
 * Region: `europe-west1` — closest Google region to the fleet's market.
 * App Check: `enforceAppCheck` is left off until a project registers debug
 * tokens; see `functions/README.md` § App Check.
 */

const REGION = "europe-west1";

function callable(handler) {
  return onCall({ region: REGION }, async (request) => {
    try {
      return await handler(request.data ?? {}, request.auth);
    } catch (error) {
      throw rethrow(error);
    }
  });
}

export const createBookingRequest = callable(handleCreateBookingRequest);
export const getBookingStatus = callable(handleGetBookingStatus);
export const submitBookingDecision = callable(handleSubmitBookingDecision);
