import {
  categoryPatch,
  emptyCategory,
  formFromCategory,
  normalizeCategoryInput,
  validateCategoryInput,
} from "../../lib/content/categoryInput.js";
import {
  faqPatch,
  emptyFaq,
  formFromFaq,
  normalizeFaqInput,
  validateFaqInput,
} from "../../lib/content/faqInput.js";
import {
  emptyOffer,
  formFromOffer,
  normalizeOfferInput,
  offerPatch,
  validateOfferInput,
} from "../../lib/content/offerInput.js";
import { repositories } from "../../lib/repositories/index.js";

/**
 * One description per editable collection that has the same shape as another.
 *
 * The list page and the editor are built once and configured from here, because
 * a second copy of a form for "title, body, status, order" is a second place for
 * a bug to live. Locations and rental terms look different enough that they have
 * their own pages.
 */

export const CONTENT_SECTIONS = {
  categories: {
    id: "categories",
    base: "/admin/categories",
    param: "categoryId",
    collection: "categories",
    titleKey: "admin.content.categories.title",
    subtitleKey: "admin.content.categories.subtitle",
    newKey: "admin.content.categories.new",
    primaryField: ["name"],
    primaryLabelKey: "admin.content.categories.col.name",
    secondaryField: ["slug"],
    secondaryLabelKey: "admin.content.categories.col.slug",
    slugTaken: true,
    load: () => repositories.queryAllCategories({ sort: "sortOrder" }),
    readOne: (id) => repositories.getContentById("categories", id),
    create: (input) => repositories.createCategory(input),
    update: (id, patch) => repositories.updateCategory(id, patch),
    setStatus: (id, status) => repositories.setCategoryStatus(id, status),
    form: {
      empty: emptyCategory,
      from: formFromCategory,
      normalize: normalizeCategoryInput,
      validate: validateCategoryInput,
      patch: categoryPatch,
    },
  },

  offers: {
    id: "offers",
    base: "/admin/offers",
    param: "offerId",
    collection: "offers",
    titleKey: "admin.content.offers.title",
    subtitleKey: "admin.content.offers.subtitle",
    newKey: "admin.content.offers.new",
    primaryField: ["title"],
    primaryLabelKey: "admin.content.offers.col.title",
    secondaryField: ["termsKey"],
    secondaryLabelKey: "admin.content.offers.col.terms",
    load: () => repositories.queryAllOffers({ sort: "sortOrder" }),
    create: (input) => repositories.createOffer(input),
    update: (id, patch) => repositories.updateOffer(id, patch),
    setStatus: (id, status) => repositories.setOfferStatus(id, status),
    form: {
      empty: emptyOffer,
      from: formFromOffer,
      normalize: normalizeOfferInput,
      validate: validateOfferInput,
      patch: offerPatch,
    },
  },

  faqs: {
    id: "faqs",
    base: "/admin/faqs",
    param: "faqId",
    collection: "faqs",
    titleKey: "admin.content.faqs.title",
    subtitleKey: "admin.content.faqs.subtitle",
    newKey: "admin.content.faqs.new",
    primaryField: ["question"],
    primaryLabelKey: "admin.content.faqs.col.question",
    secondaryLabelKey: "admin.content.faqs.col.answer",
    removable: true,
    load: () => repositories.queryAllFaqs(),
    create: (input) => repositories.createFaq(input),
    update: (id, patch) => repositories.updateFaq(id, patch),
    setStatus: (id, status) => repositories.setFaqStatus(id, status),
    remove: (id) => repositories.deleteFaq(id),
    form: {
      empty: emptyFaq,
      from: formFromFaq,
      normalize: normalizeFaqInput,
      validate: validateFaqInput,
      patch: faqPatch,
    },
  },
};

/** Which configured collection a path belongs to, if any. */
export function sectionForContentPath(pathname) {
  return Object.values(CONTENT_SECTIONS).find(
    (section) => pathname === section.base || pathname.startsWith(`${section.base}/`),
  ) ?? null;
}
