import {
  CONTENT_STATUSES,
  documentFrom,
  integer,
  localized,
  patchFrom,
} from "./contentInput.js";

/**
 * FAQ authoring.
 *
 * Client half of `match /faqs` in `firestore.rules`: a localized question, a
 * localized answer and a numeric display order.
 *
 * FAQs previously had no publish state, which meant a half-written answer was
 * live the moment it was saved. They now carry the same status the rest of the
 * catalogue does, and the public read filters to `active` — the same rule the
 * fleet already follows.
 */

const MAX = Object.freeze({ question: 160, answer: 900 });

export function emptyFaq() {
  return {
    questionEn: "",
    questionAr: "",
    answerEn: "",
    answerAr: "",
    status: "draft",
    sortOrder: "0",
  };
}

export function formFromFaq(faq) {
  const base = emptyFaq();
  if (!faq) return base;
  return {
    ...base,
    questionEn: faq.question?.en ?? "",
    questionAr: faq.question?.ar ?? "",
    answerEn: faq.answer?.en ?? "",
    answerAr: faq.answer?.ar ?? "",
    status: faq.status === undefined ? "active" : CONTENT_STATUSES.includes(faq.status) ? faq.status : "draft",
    sortOrder: faq.sortOrder === undefined ? "0" : String(faq.sortOrder),
  };
}

export function normalizeFaqInput(form) {
  return documentFrom({
    question: localized(form.questionEn, form.questionAr),
    answer: localized(form.answerEn, form.answerAr),
    status: CONTENT_STATUSES.includes(form.status) ? form.status : "draft",
    sortOrder: integer(form.sortOrder),
  });
}

const within = (value, max) => typeof value === "string" && value.length > 0 && value.length <= max;

export function validateFaqInput(form) {
  const doc = normalizeFaqInput(form);
  const errors = [];

  if (!doc.question) errors.push("question");
  else if (!within(doc.question.en ?? "", MAX.question)) errors.push("question");
  if (!doc.answer) errors.push("answer");
  else if (!within(doc.answer.en ?? "", MAX.answer)) errors.push("answer");
  if (!CONTENT_STATUSES.includes(doc.status)) errors.push("status");
  if (typeof doc.sortOrder !== "number" || Number.isNaN(doc.sortOrder)) errors.push("sortOrder");

  return errors;
}

export function faqPatch(form, faq) {
  return patchFrom(
    normalizeFaqInput(formFromFaq(faq)),
    normalizeFaqInput(form),
    ["question", "answer", "status", "sortOrder", "updatedAt"],
  );
}

/** The public read: only published entries, in display order. */
export function publishedFaqs(rows) {
  return rows
    .filter((faq) => faq.status === undefined || faq.status === "active")
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}
