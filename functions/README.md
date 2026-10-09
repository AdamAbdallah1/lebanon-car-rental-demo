# `functions/` — the trusted server-side boundary

Everything a browser must not decide lives here.

```
functions/
  src/            ESM sources (.mjs — explicitly typed; package.json has no "type")
    index.mjs     the three onCall wrappers
    create.mjs    createBookingRequest  — price, availability, reference, dedupe
    decision.mjs  submitBookingDecision — role claim, transitions, conflicts, audit
    status.mjs    getBookingStatus      — authoritative state, no personal data
    app.mjs       Admin SDK bootstrap (no credentials in this repo)
    readers.mjs   shared Firestore reads, usable inside or outside a transaction
    errors.mjs    domain error → HttpsError with a stable machine code
    hash.mjs      sha256 for document ids
  scripts/
    seed-emulator.mjs   catalogue-only emulator seeding (refuses without an emulator host)
    seed-data.mjs       the shared write/reset helpers used by the script and the tests
    set-role.mjs        the only code that writes a role custom claim
  test/
    functions.test.mjs  handler-level + HTTP-level tests against the Emulator Suite
  build.mjs      esbuild → lib/index.js (CJS bundle; firebase-* left external)
  lib/           build output, git-ignored
```

## Shared domain logic

`src/` imports two pure modules from the app:

* `src/lib/booking/bookingRecord.js` — validation, reference format,
  idempotency key, record shape
* `src/lib/booking/bookingDecision.js` — transition table, conflict detection,
  re-quote on confirm, `publicStatusOf`

The seed adapter runs the same two modules, so a record produced locally and a
record produced by the server are identical. Hashing stays in `functions/src/`
because `node:crypto` and the browser cannot both load it.

## Build

```bash
npm run functions:build     # from the repository root
```

`firebase.json` has a `predeploy` hook that runs this automatically, so a plain
`firebase deploy --only functions` also builds.

## Test

```bash
npm run test:functions      # builds, then runs under `emulators:exec`
```

The suite seeds the emulator from `src/lib/repositories/seed/`, resets between
tests, and covers: server-side pricing, reference uniqueness, the idempotency
window, conflict prevention, the transition table, audit history, the absence of
customer data in block periods and status responses, plus the three HTTP
endpoints with and without a role claim.

## Runtime

| | |
| --- | --- |
| Region | `europe-west1` |
| Runtime | `nodejs22` |
| Entry | `lib/index.js` (CJS) |
| App Check | not enforced — see `src/lib/firebase/README.md` § App Check |

## Deploy

Requires the Blaze plan (Cloud Functions 2nd gen cannot run on Spark):

```bash
npm run functions:build
firebase deploy --only functions
```
