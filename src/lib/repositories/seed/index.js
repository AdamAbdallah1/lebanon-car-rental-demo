import { categories, inclusions } from "./categories.js";
import { locations, LOCATION_GROUPS } from "./locations.js";
import { vehicles, blockPeriods, ratePlans } from "./vehicles.js";
import {
  faqs,
  homeSections,
  navigation,
  offers,
  rentalTerms,
  seo,
  services,
  siteSettings,
} from "./content.js";

/**
 * The seeded dataset that stands in for Firestore in Phase 1.
 * Shapes match the documents described in `src/lib/firebase/README.md`.
 */
export const seed = {
  vehicles,
  categories,
  inclusions,
  locations,
  locationGroups: LOCATION_GROUPS,
  blockPeriods,
  ratePlans,
  homeSections,
  navigation,
  services,
  offers,
  faqs,
  rentalTerms,
  seo,
  siteSettings,
  bookingRequests: [],
  inquiries: [],
};

export default seed;
