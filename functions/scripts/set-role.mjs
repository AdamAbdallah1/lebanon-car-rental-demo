#!/usr/bin/env node
/**
 * Mint or clear a staff role **custom claim**.
 *
 * This is the only code in the repository that writes a role. It runs with the
 * Admin SDK, outside the app, so nothing reachable from a browser can grant
 * itself `admin`. `firestore.rules` and `submitBookingDecision` both read
 * `request.auth.token.role`; neither reads a document anyone can edit.
 *
 * Usage:
 *   node functions/scripts/set-role.mjs <email|uid> <admin|agent|editor> [--apply]
 *   node functions/scripts/set-role.mjs <email|uid> --clear [--apply]
 *
 * Without `--apply` it is a dry run and prints exactly what would change —
 * review that before touching a real project.
 *
 * Credentials: Application Default Credentials (`gcloud auth application-default login`)
 * for a real project, or the Auth Emulator when `FIREBASE_AUTH_EMULATOR_HOST`
 * is set. No key file is ever written to this repository.
 *
 * Roles:
 *   admin   everything: content, fleet, settings, booking decisions
 *   agent   booking review, read-only content
 *   editor  content and fleet authoring; no customer records, no decisions
 */
const ROLES = ["admin", "agent", "editor"];

function usage(message) {
  if (message) console.error(`Error: ${message}\n`);
  console.error(
    [
      "Usage:",
      "  node functions/scripts/set-role.mjs <email|uid> <admin|agent|editor> [--apply]",
      "  node functions/scripts/set-role.mjs <email|uid> --clear [--apply]",
      "",
      "Omit --apply for a dry run (prints the change, writes nothing).",
    ].join("\n"),
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const clear = args.includes("--clear");
const positional = args.filter((arg) => !arg.startsWith("--"));

let identifier;
let role = null;

if (clear) {
  if (positional.length !== 1) usage("--clear takes exactly one identifier and no role");
  identifier = positional[0];
} else {
  if (positional.length !== 2) usage("expected <email|uid> <admin|agent|editor>");
  [identifier, role] = positional;
  if (!ROLES.includes(role)) usage(`role must be one of ${ROLES.join(", ")}`);
}

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const usingEmulator = Boolean(authHost);
const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? null;

if (!usingEmulator && !projectId) {
  usage(
    "no project selected. Set GCLOUD_PROJECT, run inside `firebase emulators:exec`, " +
      "or select a real project with `firebase use <alias>` (see src/lib/firebase/README.md).",
  );
}

const { initializeApp } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");

initializeApp(projectId ? { projectId } : {});
const auth = getAuth();

const looksLikeEmail = identifier.includes("@");
let user;
try {
  user = looksLikeEmail ? await auth.getUserByEmail(identifier) : await auth.getUser(identifier);
} catch {
  console.error(
    `\nNo user matches "${identifier}".\n` +
      (looksLikeEmail
        ? "Create the account in the Firebase console (Authentication → Users) first."
        : "Pass the uid, or the account's email address."),
  );
  process.exit(1);
}

const current = user.customClaims ?? {};
const next = { ...current };
if (clear) delete next.role;
else next.role = role;

console.log(
  [
    "",
    `Project   ${projectId ?? "(unset)"}`,
    `Backend   ${usingEmulator ? `Auth Emulator @ ${authHost}` : "real Firebase project"}`,
    `User      ${user.email ?? "(no email)"}  (uid ${user.uid})`,
    `Claims    ${JSON.stringify(current)}`,
    `After     ${clear ? "{ role removed }" : JSON.stringify(next)}`,
    apply ? "\nWriting…" : "\nDry run — nothing was written. Re-run with --apply to commit this change.",
  ].join("\n"),
);

if (!apply) process.exit(0);

await auth.setCustomUserClaims(user.uid, next);

const fresh = await auth.getUser(user.uid);
console.log(
  `\nDone. ${fresh.email ?? user.uid} now carries role "${next.role ?? "(none)"}".\n` +
    "The user must sign out and in again — or the app must force a token refresh —\n" +
    "before the new claim appears on their token.",
);
