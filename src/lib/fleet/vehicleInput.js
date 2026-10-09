import { buildVehicleMedia, mediaRefs } from "./media.js";

/**
 * Vehicle authoring — the shared, pure rules of the fleet editor.
 *
 * This module is the client half of the deal that `firestore.rules` is the
 * other half of: `validVehicle()` in the rules accepts what
 * `normalizeVehicleInput()` here produces, and rejects everything else. Both
 * sides are written from this list so they cannot drift.
 *
 * It contains no React, no network and no arithmetic on prices — it only
 * decides the *shape* of a vehicle document and whether a form is valid. Money,
 * availability and conflicts are decided elsewhere (pricingService and the
 * callables), never here.
 */

/** Publish states. `draft` is authored work that the storefront must not show. */
export const VEHICLE_STATUSES = Object.freeze(["active", "draft", "archived"]);

/** Operator-facing availability. Not derived from bookings — that is derived. */
export const AVAILABILITY_MODES = Object.freeze(["available", "limited", "unavailable"]);

/** Exactly the keys an update is allowed to touch (mirrors `vehicleMutableKeys`). */
export const VEHICLE_MUTABLE_KEYS = Object.freeze([
  "slug",
  "status",
  "categoryId",
  "make",
  "model",
  "year",
  "name",
  "trimName",
  "bodyType",
  "description",
  "pricing",
  "deposit",
  "mileage",
  "insurance",
  "inclusionIds",
  "availability",
  "locationIds",
  "media",
  "featured",
  "sortOrder",
  "specs",
  "updatedAt",
]);

const LIMITS = Object.freeze({
  slug: 80,
  categoryId: 60,
  make: 60,
  model: 60,
  availability: 20,
  money: 1_000_000,
});

const CURRENCY_LENGTH = 3;

/**
 * URL segment from free text. Never localized: a vehicle has one slug and the
 * public route uses it in both languages.
 */
export function slugify(text) {
  return String(text ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, LIMITS.slug)
    || "";
}

/** Trimmed string, or `null` when empty. */
function text(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length ? trimmed : null;
}

/** Non-negative number, or `null`. Business data never comes from a locale string. */
function number(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  const parsed = Number(trimmed.replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function integer(value) {
  const parsed = number(value);
  return parsed === null ? null : Math.trunc(parsed);
}

/** `{ en, ar }` with the AR half omitted when it is empty. */
function localized(en, ar) {
  const english = text(en);
  const arabic = text(ar);
  if (english === null) return null;
  return arabic === null || arabic === english ? { en: english } : { en: english, ar: arabic };
}

function list(values) {
  return (values ?? []).map((value) => String(value)).filter(Boolean);
}

/** An empty draft. `id` is assigned by Firestore on create. */
export function emptyVehicle() {
  return {
    slug: "",
    status: "draft",
    categoryId: "",
    make: "",
    model: "",
    year: String(new Date().getUTCFullYear()),
    nameEn: "",
    nameAr: "",
    trimEn: "",
    trimAr: "",
    bodyTypeEn: "",
    bodyTypeAr: "",
    descriptionEn: "",
    descriptionAr: "",
    daily: "",
    currency: "USD",
    weeklyDiscountPct: "0",
    weeklyMinDays: "7",
    monthlyDiscountPct: "0",
    monthlyMinDays: "28",
    deposit: "",
    includedKm: "",
    overagePerKm: "",
    seats: "",
    doors: "",
    luggage: "",
    transmission: "automatic",
    fuel: "petrol",
    insuranceExcess: "",
    insurancePlan: "standard",
    availability: "available",
    featured: false,
    sortOrder: "0",
    locationIds: [],
    inclusionIds: [],
    mediaRefs: [],
  };
}

/** A document back into the editor's shape, so the form can be left as typed. */
export function formFromVehicle(vehicle) {
  const base = emptyVehicle();
  if (!vehicle) return base;
  const media = vehicle.media ?? [];
  return {
    ...base,
    slug: vehicle.slug ?? "",
    status: VEHICLE_STATUSES.includes(vehicle.status) ? vehicle.status : "draft",
    categoryId: vehicle.categoryId ?? "",
    make: vehicle.make ?? "",
    model: vehicle.model ?? "",
    year: vehicle.year === undefined || vehicle.year === null ? "" : String(vehicle.year),
    nameEn: vehicle.name?.en ?? "",
    nameAr: vehicle.name?.ar ?? "",
    trimEn: vehicle.trimName?.en ?? "",
    trimAr: vehicle.trimName?.ar ?? "",
    bodyTypeEn: vehicle.bodyType?.en ?? "",
    bodyTypeAr: vehicle.bodyType?.ar ?? "",
    descriptionEn: vehicle.description?.en ?? "",
    descriptionAr: vehicle.description?.ar ?? "",
    daily:
      vehicle.pricing?.daily === undefined || vehicle.pricing?.daily === null
        ? ""
        : String(vehicle.pricing.daily),
    currency: vehicle.pricing?.currency ?? "USD",
    weeklyDiscountPct: String(vehicle.pricing?.weeklyDiscountPct ?? 0),
    weeklyMinDays: String(vehicle.pricing?.weeklyMinDays ?? 7),
    monthlyDiscountPct: String(vehicle.pricing?.monthlyDiscountPct ?? 0),
    monthlyMinDays: String(vehicle.pricing?.monthlyMinDays ?? 28),
    deposit: vehicle.deposit === undefined || vehicle.deposit === null ? "" : String(vehicle.deposit),
    includedKm:
      vehicle.mileage?.includedPerDayKm === undefined || vehicle.mileage?.includedPerDayKm === null
        ? ""
        : String(vehicle.mileage.includedPerDayKm),
    overagePerKm:
      vehicle.mileage?.overagePerKm === undefined || vehicle.mileage?.overagePerKm === null
        ? ""
        : String(vehicle.mileage.overagePerKm),
    seats: vehicle.specs?.seats === undefined ? "" : String(vehicle.specs.seats),
    doors: vehicle.specs?.doors === undefined ? "" : String(vehicle.specs.doors),
    luggage: vehicle.specs?.luggage === undefined ? "" : String(vehicle.specs.luggage),
    transmission: vehicle.specs?.transmission ?? "automatic",
    fuel: vehicle.specs?.fuel ?? "petrol",
    insuranceExcess:
      vehicle.insurance?.excess === undefined ? "" : String(vehicle.insurance.excess),
    insurancePlan: vehicle.insurance?.plan ?? "standard",
    availability: vehicle.availability ?? "available",
    featured: vehicle.featured === true,
    sortOrder: String(vehicle.sortOrder ?? 0),
    locationIds: [...(vehicle.locationIds ?? [])],
    inclusionIds: [...(vehicle.inclusionIds ?? [])],
    mediaRefs: mediaRefs(media),
  };
}

/**
 * Form → the document the rules expect.
 *
 * Returns `null` for a group of fields when that group cannot be built, which
 * `validateVehicleInput()` reports as a single error code. This keeps the
 * validator and the writer agreeing: anything that cannot be normalised cannot
 * be written, so nothing is ever written half-shaped.
 */
export function normalizeVehicleInput(form) {
  const slug = text(form.slug);
  const name = localized(form.nameEn, form.nameAr);
  const bodyType = localized(form.bodyTypeEn, form.bodyTypeAr);
  const description = localized(form.descriptionEn, form.descriptionAr);
  const trim = localized(form.trimEn, form.trimAr);

  const pricing = {
    currency: text(form.currency)?.toUpperCase() ?? "USD",
    daily: number(form.daily),
    weeklyDiscountPct: number(form.weeklyDiscountPct) ?? 0,
    weeklyMinDays: integer(form.weeklyMinDays) ?? 7,
    monthlyDiscountPct: number(form.monthlyDiscountPct) ?? 0,
    monthlyMinDays: integer(form.monthlyMinDays) ?? 28,
  };

  const specs = {
    seats: integer(form.seats),
    doors: integer(form.doors),
    luggage: integer(form.luggage),
    transmission: text(form.transmission) ?? "automatic",
    fuel: text(form.fuel) ?? "petrol",
  };

  const mediaRefs = list(form.mediaRefs);
  const year = integer(form.year);

  return {
    slug: slug ?? "",
    status: VEHICLE_STATUSES.includes(form.status) ? form.status : "draft",
    categoryId: text(form.categoryId) ?? "",
    make: text(form.make) ?? "",
    model: text(form.model) ?? "",
    year,
    name,
    trimName: trim,
    bodyType,
    description,
    pricing,
    deposit: number(form.deposit),
    mileage: {
      includedPerDayKm: integer(form.includedKm),
      overagePerKm: number(form.overagePerKm) ?? 0,
    },
    insurance: {
      excess: number(form.insuranceExcess) ?? 0,
      plan: text(form.insurancePlan) ?? "standard",
    },
    specs,
    inclusionIds: list(form.inclusionIds),
    locationIds: list(form.locationIds),
    availability: AVAILABILITY_MODES.includes(form.availability)
      ? form.availability
      : "available",
    featured: form.featured === true,
    sortOrder: integer(form.sortOrder) ?? 0,
    media: name ? buildVehicleMedia(mediaRefs, name) : buildVehicleMedia(mediaRefs, { en: "" }),
  };
}

function withinLength(value, max) {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

function isMoney(value) {
  return typeof value === "number" && value >= 0 && value <= LIMITS.money;
}

function isLocalized(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.en === "string" &&
    (value.ar === undefined || typeof value.ar === "string")
  );
}

/**
 * Validate an editor form. Returns an ordered list of machine codes, each of
 * which maps to one localized sentence. An empty list means the rules will
 * accept the write.
 */
export function validateVehicleInput(form) {
  const errors = [];
  const doc = normalizeVehicleInput(form);

  if (!withinLength(doc.slug, LIMITS.slug)) errors.push("slug");
  if (!VEHICLE_STATUSES.includes(doc.status)) errors.push("status");
  if (!withinLength(doc.categoryId, LIMITS.categoryId)) errors.push("categoryId");
  if (!withinLength(doc.make, LIMITS.make)) errors.push("make");
  if (!withinLength(doc.model, LIMITS.model)) errors.push("model");
  if (typeof doc.year !== "number" || doc.year < 1900 || doc.year > 2200) errors.push("year");
  if (!isLocalized(doc.name)) errors.push("name");
  if (!isLocalized(doc.description)) errors.push("description");
  if (!isLocalized(doc.bodyType)) errors.push("bodyType");
  if (
    typeof doc.pricing.currency !== "string" ||
    doc.pricing.currency.length !== CURRENCY_LENGTH
  )
    errors.push("currency");
  if (!isMoney(doc.pricing.daily)) errors.push("daily");
  if (!isMoney(doc.deposit)) errors.push("deposit");
  if (typeof doc.mileage.includedPerDayKm !== "number" || doc.mileage.includedPerDayKm < 0)
    errors.push("includedKm");
  if (typeof doc.specs.seats !== "number" || doc.specs.seats < 1) errors.push("seats");
  if (typeof doc.specs.doors !== "number" || doc.specs.doors < 1) errors.push("doors");
  if (typeof doc.specs.luggage !== "number" || doc.specs.luggage < 0) errors.push("luggage");
  if (!withinLength(doc.availability, LIMITS.availability)) errors.push("availability");
  if (doc.locationIds.length === 0) errors.push("locations");
  if (doc.media.length === 0) errors.push("media");

  return errors;
}

function sameValue(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The minimal write. Comparing the normalised document against the one already
 * stored keeps the patch inside `vehicleMutableKeys` and means an untouched
 * field is never sent — so an accidental blank cannot wipe a good value.
 */
export function vehiclePatch(form, vehicle) {
  const before = normalizeVehicleInput(formFromVehicle(vehicle));
  const after = normalizeVehicleInput(form);
  const patch = {};

  for (const key of Object.keys(after)) {
    if (!VEHICLE_MUTABLE_KEYS.includes(key)) continue;
    if (!sameValue(before[key], after[key])) patch[key] = after[key];
  }

  return patch;
}
