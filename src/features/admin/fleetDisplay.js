import { pick } from "../../i18n/localize.js";

/**
 * Presentation helpers for the fleet section.
 *
 * Formatting and label lookup only. Whether a vehicle is available, priced or
 * bookable is never decided here — that comes from the pricing service and the
 * callables, already decided.
 */

/** Language half of an inline `{ en, ar }` field, falling back to English. */
export function pickLocalized(value, locale) {
  return pick(value, locale);
}

const PUBLISH_LABEL_KEYS = Object.freeze({
  active: "admin.fleet.status.active",
  draft: "admin.fleet.status.draft",
  archived: "admin.fleet.status.archived",
});

const AVAILABILITY_LABEL_KEYS = Object.freeze({
  available: "admin.fleet.availability.available",
  limited: "admin.fleet.availability.limited",
  unavailable: "admin.fleet.availability.unavailable",
});

const PUBLISH_TONES = Object.freeze({
  active: "available",
  draft: "pending",
  archived: "unavailable",
});

export function publishLabelKey(status) {
  return PUBLISH_LABEL_KEYS[status] ?? PUBLISH_LABEL_KEYS.draft;
}

export function publishTone(status) {
  return PUBLISH_TONES[status] ?? PUBLISH_TONES.draft;
}

export function availabilityLabelKey(availability) {
  return AVAILABILITY_LABEL_KEYS[availability] ?? AVAILABILITY_LABEL_KEYS.available;
}

/**
 * Validation codes from the fleet domain, each mapped to one localized
 * sentence. The server's rules enforce the same constraints; this is only what
 * an operator reads while typing.
 */
const VALIDATION_KEYS = Object.freeze({
  slug: "admin.fleet.validation.slug",
  status: "admin.fleet.validation.status",
  categoryId: "admin.fleet.validation.categoryId",
  make: "admin.fleet.validation.make",
  model: "admin.fleet.validation.model",
  year: "admin.fleet.validation.year",
  name: "admin.fleet.validation.name",
  description: "admin.fleet.validation.description",
  bodyType: "admin.fleet.validation.bodyType",
  currency: "admin.fleet.validation.currency",
  daily: "admin.fleet.validation.daily",
  deposit: "admin.fleet.validation.deposit",
  includedKm: "admin.fleet.validation.includedKm",
  seats: "admin.fleet.validation.seats",
  doors: "admin.fleet.validation.doors",
  luggage: "admin.fleet.validation.luggage",
  availability: "admin.fleet.validation.availability",
  locations: "admin.fleet.validation.locations",
  media: "admin.fleet.validation.media",
});

export function validationKey(code) {
  return VALIDATION_KEYS[code] ?? "admin.fleet.validation.generic";
}
