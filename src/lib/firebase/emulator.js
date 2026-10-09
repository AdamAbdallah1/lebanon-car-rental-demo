/**
 * Emulator wiring for local development and QA.
 *
 * Set `VITE_FIREBASE_EMULATOR=1` in `.env.local` (never committed) to point
 * the web app at a running Emulator Suite. Nothing else changes: the app still
 * uses the Firestore adapter, still authenticates, and still calls the same
 * callables — the only difference is that the other end is localhost.
 *
 * This flag is deliberately opt-in and separate from the Firebase config: a
 * build with real configuration and no flag talks to the real project, and a
 * build with the flag talks to the emulator. There is no third case where the
 * app silently reports success against the wrong backend.
 *
 * WARNING: never commit `.env.local`. `.env.example` documents the variables.
 */

const env = import.meta.env ?? {};

export const EMULATOR_PORTS = Object.freeze({
  auth: 9099,
  firestore: 8080,
  functions: 5001,
});

export const emulatorHost = env.VITE_FIREBASE_EMULATOR_HOST ?? "127.0.0.1";

/** True only when explicitly asked for — never inferred. */
export const emulatorEnabled = env.VITE_FIREBASE_EMULATOR === "1";

export function emulatorAuthUrl() {
  return `http://${emulatorHost}:${EMULATOR_PORTS.auth}`;
}

let warned = false;

/** One loud line in the console so a local run is never mistaken for live. */
export function announceEmulator(service) {
  if (!emulatorEnabled || warned) return;
  warned = true;
  console.info(
    `%c[cedars-drive] ${service} connected to the Firebase Emulator at ${emulatorHost} — this is not a live database.`,
    "font-weight:bold",
  );
}
