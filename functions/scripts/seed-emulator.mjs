#!/usr/bin/env node
/**
 * Seed the **emulator** with the demo catalogue.
 *
 * Refuses to run anywhere else. This script exists so the real security rules,
 * the real Cloud Functions and the real admin UI can be exercised end to end
 * without a Firebase project, credentials, or invented records in a live
 * database.
 *
 * Writes the same catalogue the public site has always shown — vehicles,
 * categories, locations, rate plans, availability blocks and page content —
 * and deliberately leaves `bookingRequests` / `inquiries` empty, because those
 * hold personal data and only the callable may create them.
 *
 * Usage (emulators must already be running):
 *   npm run emulators:seed
 *
 * Guarded by `FIRESTORE_EMULATOR_HOST`, which the Emulator Suite sets and a
 * real deployment never does.
 */
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    "\nRefusing to run: FIRESTORE_EMULATOR_HOST is not set.\n" +
      "This script only writes to the Firestore Emulator. Point it at a real\n" +
      "project and it would insert demo records into a production database,\n" +
      "which is exactly what this repository must never do.\n",
  );
  process.exit(1);
}

const projectId = process.env.GCLOUD_PROJECT ?? "demo-cedars-drive";
const host = process.env.FIRESTORE_EMULATOR_HOST;

const { initializeApp } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");
const { seed } = await import("../../src/lib/repositories/seed/index.js");
const { emptyCustomerCollections, resetEmulator, seedCatalogue } = await import(
  "./seed-data.mjs"
);

initializeApp({ projectId });
const db = getFirestore();

try {
  await resetEmulator(projectId, host);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const written = await seedCatalogue(db, seed);
await emptyCustomerCollections(db);

console.log(`Seeded ${written} documents into the Firestore Emulator (${projectId} @ ${host}).`);
console.log("bookingRequests and inquiries were left empty on purpose.");
