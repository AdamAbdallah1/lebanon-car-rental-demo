import {
  CONTENT_STATUSES,
  documentFrom,
  integer,
  localized,
  patchFrom,
  text,
} from "./contentInput.js";

/**
 * Category authoring.
 *
 * Client half of `match /categories` in `firestore.rules`: a localized name,
 * a status in the publish set, and a numeric display order. `slug` feeds the
 * public route, so it is never localized and may not be reused.
 */

const MAX = Object.freeze({ name: 60, slug: 80, tagline: 120 });

export function emptyCategory() {
  return {
    nameEn: "",
    nameAr: "",
    slug: "",
    taglineEn: "",
    taglineAr: "",
    status: "draft",
    sortOrder: "0",
  };
}

export function formFromCategory(category) {
  const base = emptyCategory();
  if (!category) return base;
  return {
    ...base,
    nameEn: category.name?.en ?? "",
    nameAr: category.name?.ar ?? "",
    slug: category.slug ?? "",
    taglineEn: category.tagline?.en ?? "",
    taglineAr: category.tagline?.ar ?? "",
    status: CONTENT_STATUSES.includes(category.status) ? category.status : "draft",
    sortOrder: category.sortOrder === undefined ? "0" : String(category.sortOrder),
  };
}

export function normalizeCategoryInput(form) {
  return documentFrom({
    name: localized(form.nameEn, form.nameAr),
    slug: text(form.slug),
    tagline: localized(form.taglineEn, form.taglineAr),
    status: CONTENT_STATUSES.includes(form.status) ? form.status : "draft",
    sortOrder: integer(form.sortOrder),
  });
}

const within = (value, max) => typeof value === "string" && value.length > 0 && value.length <= max;

export function validateCategoryInput(form) {
  const doc = normalizeCategoryInput(form);
  const errors = [];

  if (!doc.name) errors.push("name");
  else if (!within(doc.name.en ?? "", MAX.name)) errors.push("name");
  if (!doc.slug || !within(doc.slug, MAX.slug)) errors.push("slug");
  if (doc.tagline && !within(doc.tagline.en ?? "", MAX.tagline)) errors.push("tagline");
  if (!CONTENT_STATUSES.includes(doc.status)) errors.push("status");
  if (typeof doc.sortOrder !== "number" || Number.isNaN(doc.sortOrder)) errors.push("sortOrder");

  return errors;
}

export function categoryPatch(form, category) {
  return patchFrom(
    normalizeCategoryInput(formFromCategory(category)),
    normalizeCategoryInput(form),
    ["name", "slug", "tagline", "status", "sortOrder", "updatedAt"],
  );
}
