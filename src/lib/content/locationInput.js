import {
  CONTENT_STATUSES,
  documentFrom,
  integer,
  localized,
  number,
  patchFrom,
  text,
} from "./contentInput.js";
import { slugify } from "../fleet/vehicleInput.js";

/**
 * Location authoring — the pick-up points the fleet editor and the booking form
 * both read.
 *
 * Client half of `match /locations` in `firestore.rules`: a localized name, a
 * group, a publish status, a non-negative service fee and a display order.
 * `coordinates` are language-neutral business data and never localized.
 */

const MAX = Object.freeze({ name: 80, shortName: 80, group: 40, code: 20, address: 160, area: 120 });

export const LOCATION_TYPES = Object.freeze(["airport", "city", "office", "delivery"]);

export function emptyLocation() {
  return {
    nameEn: "",
    nameAr: "",
    shortNameEn: "",
    shortNameAr: "",
    type: "city",
    group: "cities",
    code: "",
    addressEn: "",
    addressAr: "",
    areaEn: "",
    areaAr: "",
    lat: "",
    lng: "",
    hoursOpen: "08:00",
    hoursClose: "18:00",
    hoursDays: "daily",
    serviceFee: "0",
    allowsDifferentReturn: false,
    deliveryOnly: false,
    status: "draft",
    sortOrder: "0",
  };
}

export function formFromLocation(location) {
  const base = emptyLocation();
  if (!location) return base;
  return {
    ...base,
    nameEn: location.name?.en ?? "",
    nameAr: location.name?.ar ?? "",
    shortNameEn: location.shortName?.en ?? "",
    shortNameAr: location.shortName?.ar ?? "",
    type: LOCATION_TYPES.includes(location.type) ? location.type : "city",
    group: location.group ?? "cities",
    code: location.code ?? "",
    addressEn: location.address?.en ?? "",
    addressAr: location.address?.ar ?? "",
    areaEn: location.area?.en ?? "",
    areaAr: location.area?.ar ?? "",
    lat: location.coordinates?.lat === undefined ? "" : String(location.coordinates.lat),
    lng: location.coordinates?.lng === undefined ? "" : String(location.coordinates.lng),
    hoursOpen: location.hours?.open ?? "",
    hoursClose: location.hours?.close ?? "",
    hoursDays: location.hours?.days ?? "daily",
    serviceFee: location.serviceFee === undefined ? "0" : String(location.serviceFee),
    allowsDifferentReturn: location.allowsDifferentReturn === true,
    deliveryOnly: location.deliveryOnly === true,
    status: CONTENT_STATUSES.includes(location.status) ? location.status : "draft",
    sortOrder: location.sortOrder === undefined ? "0" : String(location.sortOrder),
  };
}

const hhmm = (value) => (/^\d{2}:\d{2}$/.test(value) ? value : null);

export function normalizeLocationInput(form) {
  const name = localized(form.nameEn, form.nameAr);
  return documentFrom({
    name,
    shortName: localized(form.shortNameEn, form.shortNameAr) ?? name,
    type: LOCATION_TYPES.includes(form.type) ? form.type : "city",
    group: text(form.group),
    code: text(form.code),
    address: localized(form.addressEn, form.addressAr),
    area: localized(form.areaEn, form.areaAr),
    coordinates: {
      lat: number(form.lat),
      lng: number(form.lng),
    },
    hours: {
      open: hhmm(text(form.hoursOpen) ?? ""),
      close: hhmm(text(form.hoursClose) ?? ""),
      days: text(form.hoursDays) ?? "daily",
    },
    serviceFee: number(form.serviceFee),
    allowsDifferentReturn: form.allowsDifferentReturn === true,
    deliveryOnly: form.deliveryOnly === true,
    status: CONTENT_STATUSES.includes(form.status) ? form.status : "draft",
    sortOrder: integer(form.sortOrder),
  });
}

const within = (value, max) => typeof value === "string" && value.length > 0 && value.length <= max;

export function validateLocationInput(form) {
  const doc = normalizeLocationInput(form);
  const errors = [];

  if (!doc.name) errors.push("name");
  else if (!within(doc.name.en ?? "", MAX.name)) errors.push("name");
  if (doc.shortName && !within(doc.shortName.en ?? "", MAX.shortName)) errors.push("shortName");
  if (!doc.group || !within(doc.group, MAX.group)) errors.push("group");
  if (doc.code && !within(doc.code, MAX.code)) errors.push("code");
  if (doc.address && !within(doc.address.en ?? "", MAX.address)) errors.push("address");
  if (doc.area && !within(doc.area.en ?? "", MAX.area)) errors.push("area");
  if (!LOCATION_TYPES.includes(doc.type)) errors.push("type");
  if (typeof doc.coordinates.lat !== "number" || Math.abs(doc.coordinates.lat) > 90)
    errors.push("lat");
  if (typeof doc.coordinates.lng !== "number" || Math.abs(doc.coordinates.lng) > 180)
    errors.push("lng");
  if (!doc.hours.open || !doc.hours.close) errors.push("hours");
  if (typeof doc.serviceFee !== "number" || doc.serviceFee < 0) errors.push("serviceFee");
  if (!CONTENT_STATUSES.includes(doc.status)) errors.push("status");
  if (typeof doc.sortOrder !== "number" || Number.isNaN(doc.sortOrder)) errors.push("sortOrder");

  return errors;
}

export function locationPatch(form, location) {
  return patchFrom(
    normalizeLocationInput(formFromLocation(location)),
    normalizeLocationInput(form),
    [
      "name", "shortName", "type", "group", "code", "address", "area", "coordinates",
      "hours", "serviceFee", "allowsDifferentReturn", "deliveryOnly", "status",
      "sortOrder", "updatedAt",
    ],
  );
}

/** A slug for the public route, when one is ever needed. */
export function locationSlug(name) {
  return slugify(name);
}
