/**
 * Firebase configuration.
 *
 * Every value comes from Vite env vars — nothing secret is committed to the
 * repository and no credentials are invented. `.env.local` is git-ignored.
 *
 * Required to activate Firestore:
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_STORAGE_BUCKET
 *   VITE_FIREBASE_MESSAGING_SENDER_ID
 *   VITE_FIREBASE_APP_ID
 *
 * See `README.md` in this folder for project setup and security rules.
 */

const env = import.meta.env ?? {};

export const firebaseConfig = Object.freeze({
  apiKey: env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: env.VITE_FIREBASE_APP_ID ?? "",
});

/**
 * `apiKey` is not a secret in Firebase web apps — it identifies the project.
 * Access is governed by Firestore security rules, never by hiding the key.
 * Public read-only access must still be gated by rules + App Check.
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.projectId && firebaseConfig.apiKey && firebaseConfig.appId,
);

export const FIREBASE_ENV_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

export class FirebaseNotConfiguredError extends Error {
  constructor(missing = []) {
    super(
      `Firebase is not configured.${missing.length ? ` Missing: ${missing.join(", ")}.` : ""} ` +
        `Add the VITE_FIREBASE_* variables to .env.local — see src/lib/firebase/README.md.`,
    );
    this.name = "FirebaseNotConfiguredError";
    this.missing = missing;
  }
}

export function missingFirebaseEnvKeys() {
  return FIREBASE_ENV_KEYS.filter((key) => !env[key]);
}
