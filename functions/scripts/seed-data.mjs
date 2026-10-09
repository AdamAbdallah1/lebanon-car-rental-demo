/**
 * Write the demo catalogue into an (already reset) Firestore database.
 *
 * Shared by `seed-emulator.mjs` and the emulator test suite so both operate on
 * identical data — one document shape, defined once, in `src/lib/`
 * repositories/seed`.
 *
 * Never writes `bookingRequests` or `inquiries`: those hold personal data and
 * are created only through the real callable.
 */

const LIST_COLLECTIONS = (seed) => ({
  vehicles: seed.vehicles,
  categories: seed.categories,
  inclusions: seed.inclusions,
  locations: seed.locations,
  locationGroups: seed.locationGroups,
  ratePlans: seed.ratePlans,
  blockPeriods: seed.blockPeriods,
  homeSections: seed.homeSections,
  services: seed.services,
  offers: seed.offers,
  faqs: seed.faqs,
});

/** Singleton documents the repository reads by a fixed id. */
const singletons = (seed) => [
  ["navigation", "main", seed.navigation],
  ["rentalTerms", "main", seed.rentalTerms],
  ["siteSettings", "main", seed.siteSettings],
];

/** SEO is stored one document per route; document ids cannot contain `/`. */
export const seoId = (path) => (path === "/" ? "home" : path.replace(/^\//, ""));

const omitId = ({ id: _ignored, ...rest }) => rest;

export async function seedCatalogue(db, seed) {
  let written = 0;

  for (const [collectionName, rows] of Object.entries(LIST_COLLECTIONS(seed))) {
    const coll = db.collection(collectionName);
    for (const row of rows) {
      const id = row.id ?? coll.doc().id;
      await coll.doc(id).set(omitId(row));
      written += 1;
    }
  }

  for (const [collectionName, id, row] of singletons(seed)) {
    await db.collection(collectionName).doc(id).set(omitId(row));
    written += 1;
  }

  for (const [path, entry] of Object.entries(seed.seo)) {
    await db.collection("seo").doc(seoId(path)).set({ path, ...entry });
    written += 1;
  }

  return written;
}

/** Drop anything in the two personal-data collections. */
export async function emptyCustomerCollections(db) {
  for (const collectionName of ["bookingRequests", "inquiries"]) {
    const snap = await db.collection(collectionName).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
    if (!snap.empty) console.log(`cleared ${snap.size} ${collectionName} document(s)`);
  }
}

/** Wipe the emulated database so a re-run is idempotent. */
export async function resetEmulator(projectId, host) {
  const response = await fetch(
    `http://${host}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    throw new Error(`failed to reset the emulated database: HTTP ${response.status}`);
  }
}
