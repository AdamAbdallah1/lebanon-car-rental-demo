# Firebase / Firestore

This project is written **Firestore-first**:

```
React UI → feature/domain logic → repositories (src/lib/repositories) → Firebase/Firestore
```

Nothing outside this folder talks to Firestore. Components call the repository
layer only, so the public site and the future admin dashboard read and write the
same documents.

## Current state

No Firebase credentials are committed. Until `.env.local` provides them, the app
runs on the **seed adapter** (`src/lib/repositories/seedAdapter.js`), which serves
the *same document shapes* out of `src/lib/repositories/seed/`.

| `VITE_FIREBASE_PROJECT_ID` etc. present? | Adapter used |
| --- | --- |
| no | `seedAdapter` (local, no network) |
| yes | `firestoreAdapter` (lazy-loaded, separate chunk) |

The Firebase SDK is therefore **never downloaded** by a demo build.

## Connecting a real project

1. Create a Firebase project → add a Web app → copy the config.
2. Create `.env.local` (already git-ignored) and add:

```
VITE_FIREBASE_API_KEY=…
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=…
VITE_FIREBASE_APP_ID=…
```

3. Enable **Cloud Firestore**.
4. Run the seed migration (Phase 1 ships the data under
   `src/lib/repositories/seed/`; write it with stable IDs, e.g.
   `setDoc(doc(db, 'vehicles', 'kia-picanto-2024'), data)`).
5. Restart the dev server. `repositories.adapter` becomes `"firestore"`.

No secret belongs in the repo. `VITE_FIREBASE_API_KEY` is a public identifier —
access is governed by **security rules**, not by hiding it.

## Collections

`vehicles` · `categories` · `inclusions` · `locations` · `locationGroups` ·
`bookingRequests` · `bookings` · `customers` · `inquiries` · `blockPeriods` ·
`ratePlans` · `extras` · `offers` · `services` · `faqs` · `articles` ·
`homeSections` · `navigation` · `seo` · `siteSettings` · `mediaAssets` ·
`users` · `roles` · `activityLogs`

Phase 1 seeds: vehicles, categories, inclusions, locations, locationGroups,
blockPeriods, ratePlans, offers, services, faqs, rentalTerms, homeSections,
navigation, seo, siteSettings, plus empty `bookingRequests` / `inquiries`.

## Localization rules

* **One document per entity.** Never an `en` collection and an `ar` collection.
* Localized strings are embedded objects: `name: { en: "…", ar: "…" }`.
* Never localized (language-neutral business data): prices, dates, IDs,
  status, availability, coordinates, media references, booking references.

## Security rules (do not weaken)

Never ship:

```
allow read, write: if true;    // ← forbidden
```

Phase 1 ships **no rules file** rather than a permissive one, and the public
site performs no writes other than creating a booking request / inquiry — both
of which will move behind an HTTPS callable function or an App Check–guarded
`create` rule in the authentication phase.

Intentional Phase 1 limitation, documented here:

> There is **no authentication and no role-based admin authorization yet**.
> Until that phase, the Firestore adapter is only instantiated when
> configuration exists, and write operations are expected to be exercised from
> the admin build once roles/claims land. Do not open read/write to `true`
> "just to make the demo work" — seed locally instead.

Recommended starting rules for the read-only public phase:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    // Public catalogue: readable by anyone, writable only by admins.
    match /{collection=vehicles|categories|locations|offers|services|
                 faqs|homeSections|navigation|seo|siteSettings|
                 ratePlans|inclusions|locationGroups|rentalTerms|mediaAssets}/{doc} {
      allow read: if true;
      allow write: if isSignedIn() && request.auth.token.role in ['admin', 'editor'];
    }

    // Private business data: never public.
    match /{collection=bookingRequests|bookings|customers|inquiries|
                 users|roles|activityLogs|blockPeriods}/{doc} {
      allow read, write: if isSignedIn()
        && request.auth.token.role in ['admin', 'agent'];
    }

    match /{doc=**} {
      allow read, write: if false;
    }
  }
}
```

`blockPeriods` is grouped with private data because it reveals bookings.

## Public ⇄ admin loop

```
PUBLIC SITE                    FIRESTORE                 ADMIN
reads  vehicles/pricing/  →   /vehicles            ←  creates/edits vehicles
       locations/availability                            pricing, locations
       content
creates bookingRequests/ →   /bookingRequests      ←  reviews → confirms
       inquiries                                         → /bookings
```

No separate fake admin dataset exists or will be created.

## Booking requests: reference and duplicate protection

`createBookingRequest` gives every request a **stable, readable reference**
(`CD-YYYYMMDD-HHMMSS`, with `-2`, `-3`… appended on collision) and returns the
same record when the same request is submitted twice within a ten-minute
**idempotency window**. The reference is language-neutral business data — it is
never localized — and the UI only ever shows `pending` for it: a submitted
request is *not* a confirmed rental.

Both guarantees are currently computed in `seedAdapter.js` by reading the
in-memory store. On Firestore they must move **server-side**, because a client
cannot atomically scan a collection:

| Guarantee | Seed adapter today | Firestore equivalent |
| --- | --- | --- |
| Unique reference | loop over `bookingRequests` | `runTransaction` over a `bookingRequests/referenceIndex/<ref>` marker doc, or an idempotency doc written with `create()` so a duplicate key fails |
| Duplicate submission | scan for `idempotencyKey` | `get()` on `bookingRequests/idem/<sha256(key)>`; write the marker and the request in the same transaction |
| Stable reference after a client retry | same key → same record | same — the idempotency doc is the source of truth, not the client timestamp |

Until a live project exists, this behaviour is proven against the seed adapter
only. Until it is re-implemented inside a transaction (or an HTTPS callable),
a real Firestore deployment should treat client-supplied references and
idempotency keys as **untrusted input**, not as a lock.

Reproducible with:

* `VITE_DEMO_FAIL=1` — every read *and* write rejects (error states).
* `VITE_DEMO_FAIL_WRITES=1` — reads succeed, only `createBookingRequest`
  rejects (the submit-failure and retry path on the review step).

## QA hooks

* `VITE_SEED_LATENCY_MS=0` — remove simulated latency.
* `VITE_DEMO_FAIL=1` — make the seed adapter reject, to exercise error states.
* `VITE_DEMO_FAIL_WRITES=1` — make only `createBookingRequest` reject, to
  exercise the request form's submit-failure and retry path.
