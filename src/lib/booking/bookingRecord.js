import { quoteVehicle } from "../pricing/pricingService.js";
import { getAvailability } from "../availability/availabilityService.js";
import { isValidISO } from "../dates.js";

/**
 * Booking request — shared domain logic.
 *
 * This module is the single source of truth for everything that makes a
 * booking request trustworthy, and it is deliberately free of React, the
 * Firebase SDK and any I/O so that two very different callers can share it:
 *
 *   • `src/lib/repositories/seedAdapter.js`   — the local demo adapter
 *   • `functions/src/`                        — the callable Cloud Function
 *
 * Both callers must therefore supply, never compute for themselves:
 *   `reference`     — produced by `referenceCandidate` + an existence check
 *   `idempotencyKey` — produced by `idempotencyKeyFor`
 *   `blocks`        — a fresh read taken inside the same transaction that
 *                     writes the request
 *
 * The price comes from `quoteVehicle` against the *server's* copy of the
 * vehicle. A client-supplied price is never read.
 */

/** Terminal and transitional states a request can be in. */
export const BOOKING_STATUSES = Object.freeze({
  pending: "pending",
  proposed: "proposed",
  confirmed: "confirmed",
  declined: "declined",
  cancelled: "cancelled",
});

export const BOOKING_STATUS_VALUES = Object.freeze(
  Object.values(BOOKING_STATUSES),
);

/** Two identical submissions closer together than this are one request. */
export const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

/** Business timezone for human-readable references — the fleet is in Lebanon. */
export const REFERENCE_TIME_ZONE = "Asia/Beirut";

/** Base class for every domain-level rejection, with a stable machine code. */
export class DomainError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.name = "DomainError";
    this.code = code;
  }
}

/** Raised when the payload a client sends cannot be turned into a request. */
export class BookingInputError extends DomainError {
  constructor(code, message) {
    super(code, message);
    this.name = "BookingInputError";
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\d][\d\s()-]{4,31}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const trimmed = (value) => (typeof value === "string" ? value.trim() : "");

const oneLine = (value, max) => {
  const text = trimmed(value).replace(/\s+/g, " ");
  return text.slice(0, max);
};

function assertDate(value, field) {
  if (!value || typeof value !== "string" || !ISO_DATE_RE.test(value) || !isValidISO(value)) {
    throw new BookingInputError("invalid-date", `${field} must be a valid yyyy-mm-dd date`);
  }
  return value;
}

/**
 * Validate and normalize the payload a public client is allowed to send.
 * Anything not listed here is discarded rather than passed through.
 *
 * @param {object} payload
 * @returns {object} normalized input
 * @throws {BookingInputError}
 */
export function normalizeBookingInput(payload) {
  const data = payload && typeof payload === "object" ? payload : {};

  const vehicleId = trimmed(data.vehicleId);
  if (!vehicleId || vehicleId.length > 80) {
    throw new BookingInputError("invalid-vehicle", "vehicleId is required");
  }

  const pickupLocationId = trimmed(data.pickupLocationId);
  if (!pickupLocationId || pickupLocationId.length > 80) {
    throw new BookingInputError("invalid-location", "pickupLocationId is required");
  }

  const pickupDate = assertDate(data.pickupDate, "pickupDate");
  const returnDate = assertDate(data.returnDate, "returnDate");
  if (returnDate < pickupDate) {
    throw new BookingInputError("invalid-range", "returnDate must be on or after pickupDate");
  }

  // A request for a date that has already passed is nonsense even if the
  // calendar maths is valid. `today` is evaluated in the business timezone.
  const today = todayInReferenceZone();
  if (pickupDate < today) {
    throw new BookingInputError("past-date", "pickupDate is in the past");
  }

  const customer = data.customer && typeof data.customer === "object" ? data.customer : {};
  const fullName = oneLine(customer.fullName, 120);
  if (fullName.length < 2) {
    throw new BookingInputError("invalid-name", "fullName must be at least 2 characters");
  }

  const email = trimmed(customer.email).toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 160) {
    throw new BookingInputError("invalid-email", "email is not a valid address");
  }

  const phone = trimmed(customer.phone).replace(/\s+/g, " ");
  if (!PHONE_RE.test(phone)) {
    throw new BookingInputError("invalid-phone", "phone is not a valid number");
  }

  const notes = trimmed(data.notes);
  if (notes.length > 2000) {
    throw new BookingInputError("invalid-notes", "notes must be 2000 characters or fewer");
  }

  const locale = data.locale === "ar" ? "ar" : "en";

  return {
    vehicleId,
    pickupLocationId,
    returnLocationId: pickupLocationId,
    pickupDate,
    returnDate,
    customer: { fullName, email, phone },
    notes: notes || null,
    locale,
    source: "public-site",
  };
}

/**
 * Everything that makes a submission "the same request" for dedupe purposes.
 * Deliberately excludes free-text notes: a driver adding a flight number on a
 * retry is still retrying, not asking for a second car.
 */
export function idempotencyKeyFor(input) {
  return [
    input.vehicleId ?? "",
    input.pickupDate ?? "",
    input.returnDate ?? "",
    input.pickupLocationId ?? "",
    (input.customer?.email ?? "").trim().toLowerCase(),
    (input.customer?.phone ?? "").trim(),
  ].join("|");
}

function partsInReferenceZone(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: REFERENCE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = {};
  for (const part of formatter.formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return parts;
}

/**
 * A readable, human-quotable reference: `CD-20261009-142301`.
 * Date + time of creation in the business timezone, so a customer can read it
 * out over the phone and support can sort on it.
 */
export function referenceBase(date = new Date()) {
  const p = partsInReferenceZone(date);
  return `CD-${p.year}${p.month}${p.day}-${p.hour}${p.minute}${p.second}`;
}

/** `attempt` 0 yields the base, then `-2`, `-3`, … */
export function referenceCandidate(base, attempt) {
  return attempt === 0 ? base : `${base}-${attempt + 1}`;
}

/** `yyyy-mm-dd` today in the business timezone. */
export function todayInReferenceZone(date = new Date()) {
  const p = partsInReferenceZone(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * Price + availability for one request, using the caller's authoritative
 * copies of the records. Returns the verdict rather than throwing, so a
 * conflict is a normal outcome instead of an error.
 *
 * @param {object} args
 * @param {object} args.vehicle
 * @param {object} args.location
 * @param {object|null} args.ratePlan
 * @param {object[]} args.blocks        fresh block read
 * @param {object} args.input           from `normalizeBookingInput`
 * @returns {{availability: object, quote: object}}
 */
export function evaluateRequest({ vehicle, location, ratePlan, blocks, input }) {
  if (!vehicle || vehicle.status === "archived") {
    throw new BookingInputError("vehicle-not-found", "vehicle is not available for hire");
  }
  if (!location || location.status === "archived") {
    throw new BookingInputError("location-not-found", "pick-up location does not exist");
  }

  const range = { pickupDate: input.pickupDate, returnDate: input.returnDate };
  const availability = getAvailability({ vehicle, blocks, range });

  const quote = quoteVehicle(vehicle, {
    pickupDate: input.pickupDate,
    returnDate: input.returnDate,
    pickupLocation: location,
    ratePlan,
    currency: vehicle.pricing?.currency,
  });

  return { availability, quote };
}

/**
 * Build the stored record. Every field the public receipt and the admin inbox
 * display is derived here, from server-side inputs only.
 *
 * @returns {object} the document to persist (without `createdAt`/`updatedAt`,
 *   which each caller stamps with its own authoritative clock)
 */
export function buildBookingRecord({
  input,
  vehicle,
  location,
  quote,
  reference,
  idempotencyKey,
  availabilityCheckedAt = new Date().toISOString(),
}) {
  const pickLocalized = (value, fallback) => {
    if (!value || typeof value !== "object") return value ?? null;
    return value[input.locale] ?? value.en ?? fallback ?? null;
  };

  return {
    reference,
    idempotencyKey,
    status: BOOKING_STATUSES.pending,
    // Filled in by a staff decision — see `bookingDecision.js`.
    proposed: null,
    bookedDates: null,

    vehicleId: vehicle.id,
    vehicleName: pickLocalized(vehicle.name, `${vehicle.make} ${vehicle.model}`),
    vehicleSlug: vehicle.slug ?? null,
    categoryId: vehicle.categoryId ?? null,
    make: vehicle.make ?? null,
    model: vehicle.model ?? null,

    pickupLocationId: input.pickupLocationId,
    returnLocationId: input.returnLocationId,
    locationName: pickLocalized(location.shortName ?? location.name, null),

    pickupDate: input.pickupDate,
    returnDate: input.returnDate,
    days: quote.days,
    dailyRate: quote.dailyRate,

    // Price snapshot — recomputed by this server, never taken from the client.
    // Stored whole rather than field-by-field so it stays shape-compatible
    // with a `PricingResult`, which is what `QuoteBreakdown` renders.
    estimatedTotal: quote.total,
    totalWithVat: quote.totalWithVat,
    deposit: quote.deposit,
    currency: quote.currency,
    quote: { ...quote },

    customer: { ...input.customer },
    notes: input.notes,
    source: input.source,
    locale: input.locale,

    availabilityCheckedAt,
    history: [],
  };
}

/**
 * The only block-period fields the confirm function may write. Keeping this
 * list closed is what makes `allow read: if true` on `blockPeriods` safe:
 * nothing customer-identifying can reach the document.
 */
export const BOOKING_BLOCK_FIELDS = Object.freeze([
  "vehicleId",
  "startDate",
  "endDate",
  "reason",
  "source",
  "requestId",
  "createdAt",
]);

/** Does `[pickup, return]` touch an inclusive block range? */
export function rangeOverlapsBlock(block, pickupDate, returnDate) {
  return block.startDate <= returnDate && block.endDate >= pickupDate;
}
