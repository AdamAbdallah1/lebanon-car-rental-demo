import {
  CONTENT_STATUSES,
  documentFrom,
  integer,
  localized,
  number,
  patchFrom,
  text,
} from "./contentInput.js";

/**
 * Offer authoring.
 *
 * Client half of `match /offers` in `firestore.rules`: a localized title, a
 * localized body and a publish status. The discount figures are business data
 * and stay language-neutral; the sentence the customer reads is the body, which
 * is why an offer still needs a human to write it.
 */

const MAX = Object.freeze({ title: 80, body: 400 });

export function emptyOffer() {
  return {
    titleEn: "",
    titleAr: "",
    bodyEn: "",
    bodyAr: "",
    termsKey: "",
    discountPercent: "0",
    minDays: "1",
    status: "draft",
    sortOrder: "0",
  };
}

export function formFromOffer(offer) {
  const base = emptyOffer();
  if (!offer) return base;
  return {
    ...base,
    titleEn: offer.title?.en ?? "",
    titleAr: offer.title?.ar ?? "",
    bodyEn: offer.body?.en ?? "",
    bodyAr: offer.body?.ar ?? "",
    termsKey: offer.termsKey ?? "",
    discountPercent: offer.discountPercent === undefined ? "0" : String(offer.discountPercent),
    minDays: offer.minDays === undefined ? "1" : String(offer.minDays),
    status: CONTENT_STATUSES.includes(offer.status) ? offer.status : "draft",
    sortOrder: offer.sortOrder === undefined ? "0" : String(offer.sortOrder),
  };
}

export function normalizeOfferInput(form) {
  return documentFrom({
    title: localized(form.titleEn, form.titleAr),
    body: localized(form.bodyEn, form.bodyAr),
    termsKey: text(form.termsKey),
    discountPercent: number(form.discountPercent),
    minDays: integer(form.minDays),
    status: CONTENT_STATUSES.includes(form.status) ? form.status : "draft",
    sortOrder: integer(form.sortOrder),
  });
}

const within = (value, max) => typeof value === "string" && value.length > 0 && value.length <= max;

export function validateOfferInput(form) {
  const doc = normalizeOfferInput(form);
  const errors = [];

  if (!doc.title) errors.push("title");
  else if (!within(doc.title.en ?? "", MAX.title)) errors.push("title");
  if (!doc.body) errors.push("body");
  else if (!within(doc.body.en ?? "", MAX.body)) errors.push("body");
  if (typeof doc.minDays !== "number" || doc.minDays < 1) errors.push("minDays");
  if (
    typeof doc.discountPercent !== "number" ||
    doc.discountPercent < 0 ||
    doc.discountPercent > 100
  )
    errors.push("discountPercent");
  if (!CONTENT_STATUSES.includes(doc.status)) errors.push("status");
  if (typeof doc.sortOrder !== "number" || Number.isNaN(doc.sortOrder)) errors.push("sortOrder");

  return errors;
}

export function offerPatch(form, offer) {
  return patchFrom(
    normalizeOfferInput(formFromOffer(offer)),
    normalizeOfferInput(form),
    ["title", "body", "termsKey", "discountPercent", "minDays", "status", "sortOrder", "updatedAt"],
  );
}
