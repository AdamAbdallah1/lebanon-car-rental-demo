import { FirebaseNotConfiguredError, firebaseConfig, isFirebaseConfigured, missingFirebaseEnvKeys } from "./config.js";
import { EMULATOR_PORTS, announceEmulator, emulatorEnabled, emulatorHost } from "./emulator.js";

/**
 * Firebase is loaded lazily and only when configuration exists.
 *
 * Until a real project is connected, the public site runs on the seeded
 * adapter (see `src/lib/repositories/index.js`) — the Firebase SDK is never
 * downloaded by the browser, so it cannot inflate the bundle for a demo.
 */

let appPromise = null;
let dbPromise = null;

export async function getFirebaseApp() {
  if (!isFirebaseConfigured) {
    throw new FirebaseNotConfiguredError(missingFirebaseEnvKeys());
  }
  if (!appPromise) {
    appPromise = (async () => {
      const { getApp, getApps, initializeApp } = await import("firebase/app");
      return getApps().length ? getApp() : initializeApp(firebaseConfig);
    })().catch((error) => {
      appPromise = null;
      throw error;
    });
  }
  return appPromise;
}

export async function getFirestore() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const app = await getFirebaseApp();
      const { getFirestore: openFirestore, connectFirestoreEmulator } = await import(
        "firebase/firestore"
      );
      const db = openFirestore(app);
      if (emulatorEnabled) {
        connectFirestoreEmulator(db, emulatorHost, EMULATOR_PORTS.firestore);
        announceEmulator("Firestore");
      }
      return db;
    })().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

/** Test/teardown helper — resets the memoized handles. */
export function __resetFirebaseHandles() {
  appPromise = null;
  dbPromise = null;
}
