# Firebase / Firestore

This project is written **Firestore-first**:

```
React UI → feature/domain logic → repositories (src/lib/repositories) → Firebase/Firestore
```

Nothing outside `src/lib/firebase/` and `functions/src/` talks to Firebase.
Components call the repository layer only, so the public site and the admin
surface read and write the same documents.

---

## Current state

No Firebase credentials are committed. Until `.env.local` provides them, the app
runs on the **seed adapter** (`src/lib/repositories/seedAdapter.js`), which serves
the *same document shapes* out of `src/lib/repositories/seed/`.

| `.env.local` provides a config? | Adapter used | `repositories.adapter` |
| --- | --- | --- |
| no | `seedAdapter` (local, no network) | `"seed"` |
| yes | `firestoreAdapter` (lazy, separate chunk) | `"firestore"` |

The Firebase SDK is therefore **never downloaded** by a demo build — it is a
dynamic `import()` reached only when `fs()` runs.

Everything below the boundary (rules, callables, roles) is real and is tested
against the **Emulator Suite**. What is *not* verified here is a connection to a
live Firebase project: no project is linked, no credentials exist, and nothing
in this repository implies otherwise.

---

## The trusted boundary

Client code cannot decide anything about a booking. Three callables in
`functions/src/` own the privileged operations; they use the Admin SDK, which
bypasses `firestore.rules` entirely, and they run in one transaction each.

| Callable | Who may call | What it owns |
| --- | --- | --- |
| `createBookingRequest` | anyone | pricing, availability check, status (`pending`), reference, idempotency |
| `getBookingStatus` | anyone holding a reference | the authoritative state and dates, **never** customer data or staff notes |
| `submitBookingDecision` | `admin`, `agent` (custom claim) | confirm / decline / propose / cancel, conflict check, block periods, audit history |

Region: `europe-west1`. Runtime: `nodejs22`. Entry: `functions/lib/index.js`,
bundled from `functions/src/*.mjs` by `npm run functions:build`.

What a client is trusted with on `createBookingRequest` is *intent only*: which
car, which dates, which counter, who it is. It is never trusted with:

* a price or total — `quoteVehicle` re-prices from the committed vehicle and
  rate plan;
* a status — always written as `pending`;
* a reference — allocated against `requestReferences/<ref>` markers;
* an idempotency guarantee — enforced by `requestIdempotency/<sha256(key)>`.

`firestore.rules` denies **all** client writes to `bookingRequests`,
`blockPeriods`, `requestIdempotency` and `requestReferences`, so there is no
code path that reaches the database without going through this boundary.

---

## Roles

Roles live in **Firebase Auth custom claims**, minted only by
`functions/scripts/set-role.mjs` with the Admin SDK:

| Role | Content / fleet | Customer records | Booking decisions |
| --- | --- | --- | --- |
| `admin` | read + write + delete | read | yes |
| `editor` | read + write | — | no |
| `agent` | read | read | yes |
| *(none)* | public read only | — | no |

```
npm run roles:set -- you@example.com agent          # dry run
npm run roles:set -- you@example.com agent --apply  # writes the claim
npm run roles:set -- you@example.com --clear --apply
```

There is no `roles` collection, no `users` collection, and no rule that reads a
document to decide who someone is. Editing local storage changes nothing.

---

## Security rules

`firestore.rules` is deployed with `firebase deploy --only firestore:rules`.
It is never `allow read, write: if true`, and that line must never be
reintroduced:

```
allow read, write: if true;    // ← forbidden, in any collection
```

Shape of the current rules:

* **Public catalogue** (`vehicles`, `categories`, `locations`, `locationGroups`,
  `inclusions`, `offers`, `services`, `faqs`, `homeSections`, `navigation`,
  `seo`, `siteSettings`, `rentalTerms`, `ratePlans`, `blockPeriods`) — readable
  by anyone, writable only by `admin`/`editor`, with field-level validation on
  write (unknown fields and rewritten `createdAt` are rejected).
* **Customer records** (`bookingRequests`, `inquiries`) — `bookingRequests` is
  read-only for `admin`/`agent` and unwritable by *any* client; `inquiries` may
  be created with a validated shape and never read back by the sender.
* **Server-only markers** (`requestIdempotency`, `requestReferences`) — deny
  everything, including `admin`.
* **Catch-all** — deny.

Indexes live in `firestore.indexes.json` (three composites, each one used by an
actual query). Deploy them together with the rules.

### Verified

```
npm test              # rules (33) + callables (24) against the Emulator Suite
npm run test:rules    # firestore.rules only
npm run test:functions
```

`tests/rules.test.mjs` loads the real `firestore.rules` into the emulator and
asserts what a *client* may do — including that an admin cannot forge a booking
from a browser, that an editor cannot read customer data, and that no client can
write a block period. `functions/test/functions.test.mjs` exercises the
transaction logic directly and then over HTTP with emulator-issued ID tokens.

---

## Local development (Emulator Suite)

Requires the Firebase CLI and Java. The project id `demo-cedars-drive` is
emulator-only: it has no credentials behind it, so nothing can accidentally
deploy or reach a production database.

```bash
# terminal 1 — auth 9099, firestore 8080, functions 5001
npm run emulators:start

# terminal 2 — write the catalogue (guarded: refuses without an emulator host)
npm run emulators:seed

# terminal 3 — web app pointed at the emulator
cp .env.example .env.local      # then uncomment VITE_FIREBASE_EMULATOR=1
npm run dev
```

`emulators:seed` writes the same catalogue the public site has always shown —
vehicles, categories, locations, rate plans, availability blocks and page
content — and **deliberately leaves `bookingRequests` and `inquiries` empty**,
because those hold personal data and are created only through the callable. The
script refuses to run unless `FIRESTORE_EMULATOR_HOST` is set: pointing it at a
real project would insert demo records into a production database.

To create a staff user locally:

```bash
# create the account (console → Authentication → Users, or the Auth REST API), then:
npm run roles:set -- you@example.com admin --apply
```

---

## Connecting a real project

1. Create a Firebase project and add a **Web app**; copy the config.
2. Enable **Cloud Firestore** and **Authentication → Email/Password**.
3. Create `.env.local` (already git-ignored) from `.env.example`:

   ```
   VITE_FIREBASE_API_KEY=…
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=…
   VITE_FIREBASE_APP_ID=…
   ```

   `VITE_FIREBASE_API_KEY` is a public identifier — access is governed by
   security rules, not by hiding it. No secret belongs in the repo.

4. Select the project: `firebase use --add` (this writes `.firebaserc`; the
   committed default is the emulator-only `demo-cedars-drive`).
5. Deploy rules and indexes: `firebase deploy --only firestore:rules,firestore:indexes`.
6. Deploy the callables: `npm run functions:build && firebase deploy --only functions`.
7. Create staff accounts in the console, then grant roles:
   `npm run roles:set -- you@example.com admin --apply`.
8. Populate the catalogue (see *Known limitations*), then `npm run build` and
   serve `dist/`.
9. Restart the dev server. `repositories.adapter` becomes `"firestore"`.

### App Check

App Check is **not enforced yet**, and saying otherwise would be false:

* `enforceAppCheck` is left at its default (`false`) in `functions/src/index.mjs`.
* No rule currently requires `request.app`.

To turn it on: create the project → App Check → register a provider (Play
Integrity / reCAPTCHA Enterprise) → issue a debug token → add
`VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN` to `.env.local` for local work → set
`enforceAppCheck: true` on the callables and redeploy. Only enable it for real
once the debug token path is verified, or the browser app will be locked out.

### Billing

* **Emulator Suite: free.** No project, no credentials, no billing account.
* **Cloud Functions (2nd gen): requires the Blaze (pay-as-you-go) plan.** You
  cannot deploy `functions/` on Spark. Expected cost at demo traffic is
  effectively the free tier (2M invocations/month, 400,000 GB-seconds).
* **Firestore:** Spark covers development comfortably; production cost is driven
  by reads/writes, which are already indexed and transaction-scoped. The
  callables deliberately read inside the transaction they commit, so there is no
  polling or unbounded scan.

---

## Collections

`vehicles` · `categories` · `inclusions` · `locations` · `locationGroups` ·
`ratePlans` · `blockPeriods` · `bookingRequests` · `requestIdempotency` ·
`requestReferences` · `inquiries` · `offers` · `services` · `faqs` ·
`homeSections` · `navigation` · `rentalTerms` · `seo` · `siteSettings`

Singleton documents use the id `main` (`navigation/main`,
`rentalTerms/main`, `siteSettings/main`). `seo` uses one document per route with
the leading slash stripped (`/` → `home`, `/fleet` → `fleet`).

Collections named in earlier planning documents that **do not exist**:
`bookings`, `customers`, `extras`, `articles`, `mediaAssets`, `users`, `roles`,
`activityLogs`.

## Localization rules

* **One document per entity.** Never an `en` collection and an `ar` collection.
* Localized strings are embedded objects: `name: { en: "…", ar: "…" }`.
* Never localized (language-neutral business data): prices, dates, IDs,
  status, availability, coordinates, media references, booking references.

---

## Booking requests: reference and duplicate protection

Every request gets a **stable, readable reference** —
`CD-YYYYMMDD-HHMMSS` in `Asia/Beirut`, with `-2`, `-3`… appended on collision —
and an identical submission inside a ten-minute **idempotency window** returns
the record that already exists instead of a second one. The reference is
language-neutral business data: never localized, never changed after issue.

Both guarantees are implemented **inside one Firestore transaction** in
`functions/src/create.mjs`, using the shared domain module
`src/lib/booking/bookingRecord.js` that the seed adapter also runs. The two
backends therefore produce identical records:

| Guarantee | How it is enforced server-side |
| --- | --- |
| Unique reference | allocate against `requestReferences/<ref>` marker docs in the same transaction |
| No duplicates | read `requestIdempotency/<sha256(key)>` first; return the existing request |
| Retry after a network error | same key → same marker → same record |
| Live availability | block periods re-read *inside* the transaction |
| Honest price | `quoteVehicle` against the committed vehicle and rate plan |

Confirming a request (`submitBookingDecision`) is the only operation that
reserves the vehicle: it writes `blockPeriods/<requestId>` and the status change
in the same transaction, after checking both the block periods and every other
confirmed request for that vehicle. Cancelling deletes the block again.

A submitted request is **pending**, and the UI never says otherwise.

---

## Public ⇄ admin loop

```
PUBLIC SITE                    FIRESTORE                 ADMIN
reads  vehicles/pricing/  →   /vehicles            ←  creates/edits vehicles
        locations/availability                            pricing, locations
        content
creates bookingRequests/ →   /bookingRequests      ←  reviews → confirms
        (callable only)         ↑ server only          (callable only)
creates inquiries/       →   /inquiries            ←  reads
```

No separate fake admin dataset exists or will be created.

## QA hooks

Read from `.env.local`, never committed:

* `VITE_SEED_LATENCY_MS=0` — remove simulated latency.
* `VITE_DEMO_FAIL=1` — make every seed read reject, to exercise error states.
  `getNavigation` / `getSiteSettings` are excluded on purpose: the shell must
  survive a content outage.
* `VITE_DEMO_FAIL_WRITES=1` — reads succeed, only `createBookingRequest`
  rejects, to exercise the submit-failure and retry path.
* `VITE_FIREBASE_EMULATOR=1` — point the app at the Emulator Suite instead of a
  real project. Opt-in, never inferred, never set in a deployment.

## Known limitations

* **No live project has been exercised.** Rules, callables, roles and index
  queries are verified against the Emulator Suite only. Deploying to a real
  project still requires the steps in *Connecting a real project*.
* **The catalogue has no production writer yet.** `emulators:seed` is
  emulator-only by design — it clears the customer collections, which would be
  destructive on a live database. Populating a real project's catalogue is a
  deliberate one-off until Stage 4's content management lands.
* **App Check is not enforced** (see above).
* **`getBookingStatus` has no rate limiting.** References are second-resolution
  and generated server-side, so they are not enumerable, but an abusive caller
  could still probe them. Put Cloud Armor / an App Check policy in front of it
  before production traffic.
