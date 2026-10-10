import { isFirebaseConfigured } from "../firebase/config.js";
import seedAdapter from "./seedAdapter.js";

/**
 * Repository layer — the single door between the app and its data.
 *
 *   React UI → feature/domain logic → repositories → Firebase/Firestore
 *
 * Components and pages never import an adapter, and never see a Firestore
 * call. The same repository object will serve the future admin dashboard, so
 * public and admin always read and write the same documents.
 *
 * When `VITE_FIREBASE_*` configuration exists the Firestore adapter is loaded
 * lazily; otherwise the seeded adapter serves the identical document shapes.
 */

const METHOD_NAMES = [
  "queryVehicles",
  "queryAllVehicles",
  "getVehicleById",
  "getVehicleForAdmin",
  "getVehicleBySlug",
  "updateVehicle",
  "createVehicle",
  "setVehicleStatus",
  "archiveVehicle",
  "queryCategories",
  "getCategoryById",
  "queryInclusions",
  "queryLocations",
  "getLocationGroups",
  "getLocationById",
  "createBookingRequest",
  "getBookingStatus",
  "submitBookingDecision",
  "getBookingById",
  "queryBookingRequests",
  "createInquiry",
  "queryBlockPeriods",
  "queryAllBlockPeriods",
  "queryAllCategories",
  "getContentById",
  "createCategory",
  "updateCategory",
  "setCategoryStatus",
  "queryAllLocations",
  "createLocation",
  "updateLocation",
  "setLocationStatus",
  "queryAllOffers",
  "getOfferById",
  "createOffer",
  "updateOffer",
  "setOfferStatus",
  "queryAllFaqs",
  "getFaqById",
  "createFaq",
  "updateFaq",
  "setFaqStatus",
  "deleteFaq",
  "updateRentalTerms",
  "getHomeSections",
  "getNavigation",
  "getServices",
  "getOffers",
  "getFaqs",
  "getRentalTerms",
  "getSiteSettings",
  "getSeo",
  "queryRatePlans",
];

let adapterPromise = null;

function resolveAdapter() {
  if (!adapterPromise) {
    adapterPromise = isFirebaseConfigured
      ? import("../firebase/firestoreAdapter.js").then((m) => m.firestoreAdapter)
      : Promise.resolve(seedAdapter);
  }
  return adapterPromise;
}

function buildRepository() {
  const repository = {
    /** Which backend is serving this build — surfaced in the demo footer. */
    adapter: isFirebaseConfigured ? "firestore" : "seed",
    /** Force a re-resolution (tests / hot swap). */
    __reset() {
      adapterPromise = null;
    },
  };

  for (const name of METHOD_NAMES) {
    repository[name] = (...args) =>
      resolveAdapter().then((adapter) => {
        const method = adapter[name];
        if (typeof method !== "function") {
          throw new Error(`Repository method not implemented by "${adapter.name}": ${name}`);
        }
        return method.apply(adapter, args);
      });
  }

  return repository;
}

export const repositories = buildRepository();

export default repositories;
