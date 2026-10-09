import { DomainError, evaluateRequest, rangeOverlapsBlock, todayInReferenceZone } from "./bookingRecord.js";

/**
 * Booking review — shared domain logic.
 *
 * Companion to `bookingRecord.js`: pure, I/O-free, and used by two callers that
 * must never disagree about what a "confirm" means.
 *
 *   • `functions/src/decision.js`     — the callable, wrapped in a Firestore
 *     transaction that also reads/writes `blockPeriods`
 *   • `src/lib/repositories/seedAdapter.js` — the local demo adapter
 *
 * What lives here: the transition table, date validation, conflict detection,
 * the re-quote on confirmation and the append-only audit entry. What lives in
 * the callers: acquiring fresh reads and committing them atomically.
 *
 * Model
 * -----
 *   `pickupDate` / `returnDate`  what the customer asked for — immutable
 *   `proposed`                   what staff counter-offered, or null
 *   `bookedDates`                what was actually confirmed, or null
 *
 * Nothing overwrites the original request, so the audit trail never loses the
 * fact that the customer asked for different dates.
 */

export const DECISION_ACTIONS = Object.freeze(["confirm", "decline", "propose", "cancel"]);

const TARGET = Object.freeze({
  confirm: "confirmed",
  decline: "declined",
  propose: "proposed",
  cancel: "cancelled",
});

/**
 * Allowed transitions. A declined or cancelled request is terminal — reopening
 * one is a new conversation, not a button.
 */
const ALLOWED = Object.freeze({
  pending: ["confirm", "decline", "propose"],
  proposed: ["confirm", "decline", "propose"],
  confirmed: ["cancel"],
  declined: [],
  cancelled: [],
});

export function targetStatus(action) {
  return TARGET[action] ?? null;
}

export function allowedActions(status) {
  return Object.freeze(ALLOWED[status] ?? []);
}

/** Dates that a confirmed request occupies, for display and conflict checks. */
export function effectiveDates(request) {
  if (request?.bookedDates?.pickupDate && request?.bookedDates?.returnDate) {
    return { pickupDate: request.bookedDates.pickupDate, returnDate: request.bookedDates.returnDate };
  }
  return { pickupDate: request?.pickupDate ?? null, returnDate: request?.returnDate ?? null };
}

/** The dates `confirm` will actually book for this request. */
export function datesToBook(request, choice) {
  const useProposed = choice === "proposed" || (choice == null && Boolean(request?.proposed));
  if (useProposed && request?.proposed) {
    return {
      pickupDate: request.proposed.pickupDate,
      returnDate: request.proposed.returnDate,
      source: "proposed",
    };
  }
  return { pickupDate: request.pickupDate, returnDate: request.returnDate, source: "requested" };
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertDateRange(pickupDate, returnDate, now) {
  if (
    !pickupDate || !returnDate ||
    !ISO_DATE_RE.test(pickupDate) || !ISO_DATE_RE.test(returnDate)
  ) {
    throw new DomainError("invalid-dates", "dates must be yyyy-mm-dd");
  }
  if (returnDate < pickupDate) {
    throw new DomainError("invalid-dates", "returnDate must be on or after pickupDate");
  }
  if (pickupDate < todayInReferenceZone(typeof now === "string" ? new Date(now) : now)) {
    throw new DomainError("past-date", "pickupDate is in the past");
  }
}

/**
 * Validate what a staff member sent. Deliberately narrow — the caller decides
 * authorization; this only decides whether the payload makes sense.
 */
export function normalizeDecisionInput(payload) {
  const data = payload && typeof payload === "object" ? payload : {};

  const requestId = typeof data.requestId === "string" ? data.requestId.trim() : "";
  if (!requestId || requestId.length > 128) {
    throw new DomainError("invalid-request", "requestId is required");
  }

  const action = typeof data.action === "string" ? data.action.trim() : "";
  if (!DECISION_ACTIONS.includes(action)) {
    throw new DomainError("invalid-action", "unsupported decision action");
  }

  const rawNote = typeof data.note === "string" ? data.note.trim() : "";
  if (rawNote.length > 2000) {
    throw new DomainError("invalid-note", "note must be 2000 characters or fewer");
  }

  const dates = data.dates === "proposed" ? "proposed" : data.dates === "original" ? "original" : null;

  let alternative = null;
  if (action === "propose") {
    const alt = data.alternative && typeof data.alternative === "object" ? data.alternative : {};
    assertDateRange(alt.pickupDate, alt.returnDate, new Date());
    alternative = { pickupDate: alt.pickupDate, returnDate: alt.returnDate };
  }

  return {
    requestId,
    action,
    note: rawNote || null,
    dates,
    alternative,
  };
}

/**
 * Does this range collide with anything already committed?
 *
 * Two independent sources are checked on purpose:
 *   • `blockPeriods` — every confirmed booking and every maintenance window
 *     materialises one, so this alone should be sufficient;
 *   • confirmed requests — so a block period deleted out of band still cannot
 *     produce a double booking.
 *
 * The request being decided on is excluded from both.
 */
export function findConflict(blocks, confirmedRequests, requestId, { pickupDate, returnDate }) {
  const range = { startDate: pickupDate, endDate: returnDate };

  const block = (blocks ?? []).find(
    (b) => b.id !== requestId && rangeOverlapsBlock(b, pickupDate, returnDate),
  );
  if (block) return { type: "block", block };

  const other = (confirmedRequests ?? []).find((r) => {
    if (r.id === requestId) return false;
    const dates = effectiveDates(r);
    if (!dates.pickupDate || !dates.returnDate) return false;
    return rangeOverlapsBlock({ ...range, startDate: dates.pickupDate, endDate: dates.returnDate }, pickupDate, returnDate);
  });
  if (other) return { type: "request", request: other };

  return null;
}

/**
 * Apply one decision to one request.
 *
 * @param {object} args
 * @param {object} args.request           current stored request
 * @param {object} args.input             from `normalizeDecisionInput`
 * @param {{uid?:string,email?:string,role?:string}} args.actor
 * @param {Date|string} [args.now]
 * @param {object[]} [args.blocks]
 * @param {object[]} [args.confirmedRequests]
 * @param {object} [args.vehicle]         required for `confirm`
 * @param {object} [args.location]        required for `confirm`
 * @param {object|null} [args.ratePlan]   required for `confirm`
 * @returns {{noop?:boolean, changes?:object, block?:object|null, deleteBlock?:boolean}}
 * @throws {DomainError}
 */
export function applyDecision({
  request,
  input,
  actor,
  now = new Date(),
  blocks = [],
  confirmedRequests = [],
  vehicle,
  location,
  ratePlan = null,
}) {
  if (!request) throw new DomainError("not-found", "request does not exist");

  const action = input.action;
  const from = request.status;
  const to = targetStatus(action);
  if (!to) throw new DomainError("invalid-action", "unsupported decision action");

  // Repeating a decision that already landed is not an error — it is a retry.
  if (from === to) return { noop: true };

  if (!allowedActions(from).includes(action)) {
    throw new DomainError("invalid-transition", `cannot ${action} a ${from} request`);
  }

  const nowIso = typeof now === "string" ? now : now.toISOString();
  const priorHistory = Array.isArray(request.history) ? request.history : [];
  const entry = {
    at: nowIso,
    actor: {
      uid: actor?.uid ?? null,
      email: actor?.email ?? null,
      role: actor?.role ?? null,
    },
    action,
    from,
    to,
    note: input.note ?? null,
    dates: null,
    previousDates: null,
  };

  const changes = {
    status: to,
    updatedAt: nowIso,
    history: [...priorHistory, entry],
  };

  let block = null;
  let deleteBlock = false;

  if (action === "propose") {
    entry.dates = { ...input.alternative };
    entry.previousDates = { pickupDate: request.pickupDate, returnDate: request.returnDate };
    changes.proposed = { ...input.alternative };
    // Advisory only: the staff member may counter-offer anything reasonable.
    // The authoritative availability gate is `confirm`.
  }

  if (action === "decline") {
    entry.dates = { pickupDate: request.pickupDate, returnDate: request.returnDate };
    changes.declinedAt = nowIso;
    changes.declinedBy = actor?.uid ?? null;
    changes.proposed = null;
  }

  if (action === "cancel") {
    const dates = effectiveDates(request);
    entry.dates = { ...dates };
    changes.cancelledAt = nowIso;
    changes.cancelledBy = actor?.uid ?? null;
    changes.proposed = null;
    deleteBlock = true;
  }

  if (action === "confirm") {
    const booked = datesToBook(request, input.dates);
    assertDateRange(booked.pickupDate, booked.returnDate, now);

    const conflict = findConflict(blocks, confirmedRequests, request.id ?? input.requestId, booked);
    if (conflict) {
      throw new DomainError("vehicle-unavailable", "the vehicle is already committed for these dates");
    }

    if (!vehicle) throw new DomainError("vehicle-not-found", "vehicle does not exist");
    if (!location) throw new DomainError("location-not-found", "pick-up location does not exist");

    // Re-price against the dates being booked. The stored quote is from when
    // the customer asked; the dates may have changed since.
    const { quote } = evaluateRequest({
      vehicle,
      location,
      ratePlan,
      blocks,
      input: { pickupDate: booked.pickupDate, returnDate: booked.returnDate, locale: request.locale ?? "en" },
    });

    entry.dates = { pickupDate: booked.pickupDate, returnDate: booked.returnDate };
    if (booked.pickupDate !== request.pickupDate || booked.returnDate !== request.returnDate) {
      entry.previousDates = { pickupDate: request.pickupDate, returnDate: request.returnDate };
    }

    changes.bookedDates = { pickupDate: booked.pickupDate, returnDate: booked.returnDate };
    changes.proposed = null;
    changes.confirmedAt = nowIso;
    changes.confirmedBy = actor?.uid ?? null;
    changes.days = quote.days;
    changes.dailyRate = quote.dailyRate;
    changes.estimatedTotal = quote.total;
    changes.totalWithVat = quote.totalWithVat;
    changes.deposit = quote.deposit;
    changes.currency = quote.currency;
    // Same shape as the price snapshot taken at submission — see
    // `buildBookingRecord`, which stores the whole pricing result so the
    // admin price panel can render it without re-deriving anything.
    changes.quote = { ...quote };

    block = {
      vehicleId: request.vehicleId,
      startDate: booked.pickupDate,
      endDate: booked.returnDate,
      reason: "booked",
      source: "booking-request",
      requestId: request.id ?? input.requestId,
      createdAt: nowIso,
    };
  }

  return { changes, block, deleteBlock };
}

/**
 * The one payload a reference-holder may ever see.
 *
 * Shared by `functions/src/status.mjs` and the seed adapter so the public
 * confirmation page renders the same object whichever backend answers.
 *
 * Deliberately excludes: the customer block, internal notes, actor identities,
 * the idempotency key, and the raw history. A reference proves you submitted
 * the request; it does not entitle you to the staff audit trail.
 */
export function publicStatusOf(request) {
  return {
    reference: request.reference,
    status: request.status,
    requested: { pickupDate: request.pickupDate, returnDate: request.returnDate },
    proposed: request.proposed ?? null,
    effective: effectiveDates(request),
    vehicleId: request.vehicleId ?? null,
    vehicleName: request.vehicleName ?? null,
    locationName: request.locationName ?? null,
    currency: request.currency ?? null,
    totalWithVat: request.totalWithVat ?? null,
    days: request.days ?? null,
    createdAt: request.createdAt ?? null,
    updatedAt: request.updatedAt ?? null,
    // Actions only — who acted and why stays internal.
    timeline: (Array.isArray(request.history) ? request.history : []).map((entry) => ({
      at: entry.at,
      action: entry.action,
      to: entry.to,
      dates: entry.dates ?? null,
    })),
  };
}
