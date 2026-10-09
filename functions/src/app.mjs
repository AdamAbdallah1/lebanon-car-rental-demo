import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Admin SDK bootstrap.
 *
 * The Functions emulator supplies `FIREBASE_CONFIG` / `GCLOUD_PROJECT`, so no
 * credentials are ever written into this repository. Outside the emulator the
 * default service account is used, which is exactly the boundary we want: only
 * code running here can bypass `firestore.rules`.
 */
export function adminDb() {
  if (!getApps().length) initializeApp();
  return getFirestore();
}
