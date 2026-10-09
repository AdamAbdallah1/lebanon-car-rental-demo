import { getFirebaseApp } from "./app.js";
import { EMULATOR_PORTS, announceEmulator, emulatorEnabled, emulatorHost } from "./emulator.js";

/**
 * Callable Cloud Functions — the only way the web app may perform a privileged
 * operation.
 *
 * Nothing here trusts the browser: `createBookingRequest` and
 * `submitBookingDecision` are rejected by `firestore.rules` if attempted
 * directly, because the server is where price, status, availability,
 * references and idempotency are decided.
 *
 * Errors arrive as a stable machine `code` (from `error.details.code`) that
 * the UI maps to a localized sentence. Server messages are never rendered.
 */

let functionsPromise = null;

export async function getFunctionsInstance() {
  if (!functionsPromise) {
    functionsPromise = (async () => {
      const app = await getFirebaseApp();
      const { getFunctions, connectFunctionsEmulator } = await import("firebase/functions");
      const instance = getFunctions(app, "europe-west1");
      if (emulatorEnabled) {
        connectFunctionsEmulator(instance, emulatorHost, EMULATOR_PORTS.functions);
        announceEmulator("Cloud Functions");
      }
      return instance;
    })().catch((error) => {
      functionsPromise = null;
      throw error;
    });
  }
  return functionsPromise;
}

/** A rejection carrying the server's machine code rather than its prose. */
export class ServerFunctionError extends Error {
  constructor(code, functionName, cause) {
    super(code);
    this.name = "ServerFunctionError";
    this.code = code;
    this.functionName = functionName;
    this.cause = cause;
  }
}

function normalizeCallError(error, functionName) {
  const details = error?.details && typeof error.details === "object" ? error.details : {};
  const raw = details.code ?? error?.code ?? "unknown";
  const code = String(raw).replace(/^functions\//, "").toLowerCase();
  return new ServerFunctionError(code, functionName, error);
}

/**
 * Invoke a callable.
 *
 * @param {string} name
 * @param {object} data
 * @returns {Promise<any>} the server's result — always the authoritative one
 * @throws {ServerFunctionError} with `.code` set to a stable machine code
 */
export async function callFunction(name, data) {
  const instance = await getFunctionsInstance();
  const { httpsCallable } = await import("firebase/functions");
  try {
    const response = await httpsCallable(instance, name, { timeout: 30_000 })(data ?? {});
    return response.data;
  } catch (error) {
    throw normalizeCallError(error, name);
  }
}
