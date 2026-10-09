import { getFirebaseApp } from "./app.js";
import { announceEmulator, emulatorAuthUrl, emulatorEnabled } from "./emulator.js";

/**
 * Authentication for the admin surface.
 *
 * Roles (`admin` / `agent` / `editor`) are **custom claims**, minted by
 * `functions/scripts/set-role.mjs` with the Admin SDK. The client can read
 * them; it can never write them. Security rules and the decision callable both
 * read the claim, so a user who edits local storage changes nothing.
 *
 * The Firebase SDK is loaded lazily, exactly as for Firestore, so a build with
 * no configuration never downloads `firebase/auth`.
 */

let authPromise = null;

export async function getAuthInstance() {
  if (!authPromise) {
    authPromise = (async () => {
      const app = await getFirebaseApp();
      const { getAuth, connectAuthEmulator } = await import("firebase/auth");
      const auth = getAuth(app);
      if (emulatorEnabled) {
        connectAuthEmulator(auth, emulatorAuthUrl(), { disableWarnings: true });
        announceEmulator("Authentication");
      }
      return auth;
    })().catch((error) => {
      authPromise = null;
      throw error;
    });
  }
  return authPromise;
}

/**
 * @typedef {Object} StaffSession
 * @property {string} uid
 * @property {string|null} email
 * @property {string|null} role  `admin` | `agent` | `editor` | null
 * @property {number|null} expiresAt  epoch ms, null when unknown
 */

/** Claims → a plain, serializable session. Never stores the ID token. */
function sessionOf(user, token) {
  const role = token?.claims?.role;
  return {
    uid: user.uid,
    email: user.email ?? null,
    role: typeof role === "string" && role.length > 0 ? role : null,
    expiresAt: token?.expirationTime ? Date.parse(token.expirationTime) : null,
  };
}

export async function readSession(user, { forceRefresh = false } = {}) {
  const token = await user.getIdTokenResult(forceRefresh);
  return sessionOf(user, token);
}

/**
 * Subscribe to sign-in / sign-out changes.
 *
 * @param {(session: StaffSession|null) => void} callback
 * @returns {Promise<() => Promise<void>>} unsubscribe
 */
export async function observeAuth(callback) {
  const auth = await getAuthInstance();
  const { onAuthStateChanged } = await import("firebase/auth");
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }
    try {
      callback(await readSession(user));
    } catch {
      callback({ uid: user.uid, email: user.email ?? null, role: null, expiresAt: null });
    }
  });
}

/**
 * Sign in with email and password.
 *
 * @throws {Error} `.code` is the Firebase auth code (`auth/invalid-credential`, …)
 */
export async function signIn(email, password) {
  const auth = await getAuthInstance();
  const { signInWithEmailAndPassword } = await import("firebase/auth");
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return await readSession(credential.user, { forceRefresh: true });
  } catch (error) {
    const wrapped = new Error(error?.code ?? "auth/error");
    wrapped.name = "AuthError";
    wrapped.code = typeof error?.code === "string" ? error.code : "auth/error";
    wrapped.cause = error;
    throw wrapped;
  }
}

export async function signOutUser() {
  const auth = await getAuthInstance();
  const { signOut } = await import("firebase/auth");
  await signOut(auth);
}

/** Re-read claims — used after a role is granted to a signed-in user. */
export async function refreshSession() {
  const auth = await getAuthInstance();
  const user = auth.currentUser;
  if (!user) return null;
  return readSession(user, { forceRefresh: true });
}
