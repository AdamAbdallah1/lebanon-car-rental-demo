import { documentFrom, localized, patchFrom, text } from "./contentInput.js";

/**
 * Rental terms authoring.
 *
 * `match /rentalTerms` in `firestore.rules` requires `sections` to be a list and
 * restricts writes to an admin. This is the one document-shaped collection, so
 * the form is the whole page rather than a row in a table.
 *
 * A section's `titleKey` points at a translation key — the section headings are
 * navigation, not content, and translating them in five languages is not
 * something an editor should be asked to do inline. The body is content and is
 * authored in both languages.
 */

const MAX = Object.freeze({ introduction: 600, body: 1200, titleKey: 60 });

export function emptyTerms() {
  return {
    introductionEn: "",
    introductionAr: "",
    sections: [],
  };
}

function emptySection(index) {
  return { id: `section-${index}-${Math.random().toString(36).slice(2, 7)}`, titleKey: "", bodyEn: "", bodyAr: "" };
}

export function formFromTerms(terms) {
  const base = emptyTerms();
  if (!terms) return { ...base, sections: [emptySection(0)] };
  return {
    introductionEn: terms.introduction?.en ?? "",
    introductionAr: terms.introduction?.ar ?? "",
    sections: (terms.sections ?? []).map((section) => ({
      id: section.id ?? "",
      titleKey: section.titleKey ?? "",
      bodyEn: section.body?.en ?? "",
      bodyAr: section.body?.ar ?? "",
    })),
  };
}

export function normalizeTermsInput(form) {
  const sections = (form.sections ?? [])
    .map((section) => ({
      id: text(section.id) ?? "",
      titleKey: text(section.titleKey) ?? "",
      body: localized(section.bodyEn, section.bodyAr),
    }))
    .filter((section) => section.titleKey && section.body);

  return documentFrom({
    introduction: localized(form.introductionEn, form.introductionAr),
    sections,
  });
}

/** A stable id for a section that has none yet. */
export function sectionId(index) {
  return `section-${index + 1}`;
}

export function normalizeSections(sections) {
  return (sections ?? []).map((section, index) => ({
    id: section.id || sectionId(index),
    titleKey: section.titleKey,
    bodyEn: section.bodyEn,
    bodyAr: section.bodyAr,
  }));
}

export function validateTermsInput(form) {
  const doc = normalizeTermsInput(form);
  const errors = [];

  if (!doc.introduction) errors.push("introduction");
  else if (doc.introduction.en.length > MAX.introduction) errors.push("introduction");
  if (doc.sections.length === 0) errors.push("sections");
  if (doc.sections.some((section) => section.titleKey.length > MAX.titleKey))
    errors.push("titleKey");
  if (doc.sections.some((section) => section.body.en.length > MAX.body)) errors.push("body");

  return errors;
}

export function termsPatch(form, terms) {
  return patchFrom(
    normalizeTermsInput(formFromTerms(terms)),
    normalizeTermsInput(form),
    ["introduction", "sections", "updatedAt"],
  );
}
