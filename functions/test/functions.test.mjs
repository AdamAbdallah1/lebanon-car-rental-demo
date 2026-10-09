/**
 * Cloud Function tests against the real Emulator Suite.
 *
 * Two layers, deliberately:
 *
 *   1. **Handlers directly** — the transaction logic, the shared domain rules,
 *      the reference/idempotency guarantees and the conflict prevention. These
 *      hit the real Firestore Emulator; nothing is mocked.
 *   2. **Over HTTP** — the actual `onCall` endpoints with a real
 *      emulator-issued ID token, proving that the role claim reaches
 *      `request.auth` and that unauthenticated callers are turned away.
 *
 * Run: npm run test:functions
 */
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { handleCreateBookingRequest } from "../src/create.mjs";
import { handleSubmitBookingDecision } from "../src/decision.mjs";
import { handleGetBookingStatus } from "../src/status.mjs";
import { BOOKING_BLOCK_FIELDS } from "../../src/lib/booking/bookingRecord.js";
import { quoteVehicle } from "../../src/lib/pricing/pricingService.js";
import { seed } from "../../src/lib/repositories/seed/index.js";
import {
  emptyCustomerCollections,
  resetEmulator,
  seedCatalogue,
} from "../scripts/seed-data.mjs";

const PROJECT = process.env.GCLOUD_PROJECT ?? "demo-cedars-drive";
const REGION = "europe-west1";
const FUNCTIONS_HOST = process.env.FUNCTIONS_EMULATOR_HOST ?? "127.0.0.1:5001";
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";

if (!getApps().length) initializeApp({ projectId: PROJECT });
const db = getFirestore();
const auth = getAuth();

/** A date `days` ahead, in yyyy-mm-dd. Kept well clear of the business day. */
function futureDate(days) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

const CUSTOMER = {
  fullName: "Test Customer",
  email: "customer@test.invalid",
  phone: "+961 71 000 000",
};

/** A vehicle with no scheduled blocks, so dates can be chosen freely. */
const openVehicle = seed.vehicles.find(
  (v) =>
    v.status !== "archived" &&
    v.availability === "available" &&
    !seed.blockPeriods.some((b) => b.vehicleId === v.id),
) ?? seed.vehicles[0];

/** A scheduled block far enough ahead that its dates are still bookable. */
const scheduledBlock =
  seed.blockPeriods.find((b) => {
    const vehicle = seed.vehicles.find((v) => v.id === b.vehicleId);
    return (
      vehicle &&
      vehicle.status !== "archived" &&
      vehicle.availability !== "unavailable" &&
      b.startDate >= futureDate(1)
    );
  }) ?? seed.blockPeriods[0];

const blockedVehicle = seed.vehicles.find((v) => v.id === scheduledBlock.vehicleId);
const location = seed.locations.find((l) => l.status !== "archived") ?? seed.locations[0];

function bookingPayload(overrides = {}) {
  const { customer, ...rest } = overrides;
  return {
    vehicleId: openVehicle.id,
    pickupLocationId: location.id,
    pickupDate: futureDate(30),
    returnDate: futureDate(33),
    notes: null,
    locale: "en",
    customer: { ...CUSTOMER, ...customer },
    ...rest,
  };
}

/** Assert a handler rejects with one of our stable machine codes. */
async function rejects(fn, expectedCode, label = "") {
  try {
    await fn();
  } catch (error) {
    const code = error?.details?.code ?? error?.code ?? error?.message;
    assert.equal(
      code,
      expectedCode,
      `${label || expectedCode}: expected code "${expectedCode}", got "${code}" (${error?.message})`,
    );
    return error;
  }
  assert.fail(`${label || expectedCode}: expected a rejection, but it succeeded`);
}

async function createRequest(overrides = {}) {
  return handleCreateBookingRequest(bookingPayload(overrides));
}

const asAgent = { uid: "agent-uid", email: "agent@cedarsdrive.example", token: { role: "agent" } };
const asAdmin = { uid: "admin-uid", email: "admin@cedarsdrive.example", token: { role: "admin" } };
const asEditor = { uid: "editor-uid", email: "editor@cedarsdrive.example", token: { role: "editor" } };
const asNobody = { uid: "plain-uid", email: "plain@example.com", token: {} };

before(async () => {
  await resetEmulator(PROJECT, process.env.FIRESTORE_EMULATOR_HOST);
  await seedCatalogue(db, seed);
});

after(async () => {
  await emptyCustomerCollections(db);
});

beforeEach(async () => {
  await resetEmulator(PROJECT, process.env.FIRESTORE_EMULATOR_HOST);
  await seedCatalogue(db, seed);
});

// ---------------------------------------------------------------------------
// 1. Creation — the trusted boundary
// ---------------------------------------------------------------------------

describe("createBookingRequest", () => {
  it("prices the request server-side and stores it as pending", async () => {
    const created = await createRequest();

    assert.equal(created.status, "pending");
    assert.match(created.reference, /^CD-\d{8}-\d{6}(-\d+)?$/);
    assert.ok(created.estimatedTotal > 0, "a total must be computed");
    assert.equal(created.quote.total, created.estimatedTotal);
    assert.ok(created.quote.vat.pct > 0, "VAT must be itemised");
    assert.equal(created.duplicate, false);

    // A pending request reserves nothing — only a decision does that.
    const blocks = await db.collection("blockPeriods").get();
    assert.equal(
      blocks.docs.filter((d) => d.id === created.id).length,
      0,
      "a pending request must not create a block period",
    );
  });

  it("writes a reference no other request can claim", async () => {
    const first = await createRequest();
    const second = await createRequest({
      customer: { ...CUSTOMER, email: "second@test.invalid" },
    });

    assert.notEqual(first.reference, second.reference);
    assert.match(first.reference, /^CD-\d{8}-\d{6}(-\d+)?$/);
    assert.match(second.reference, /^CD-\d{8}-\d{6}(-\d+)?$/);
  });

  it("returns the existing request for an identical submission", async () => {
    const first = await createRequest();
    const second = await createRequest();

    assert.equal(second.duplicate, true);
    assert.equal(second.reference, first.reference);
    assert.equal(second.id, first.id);

    const all = await db.collection("bookingRequests").get();
    assert.equal(all.size, 1, "a duplicate submission must not create a second document");
  });

  it("still creates a second request once the dedupe window has passed", async () => {
    const first = await createRequest();
    const markerId = (await db.collection("requestIdempotency").get()).docs[0].id;
    await db
      .doc(`requestIdempotency/${markerId}`)
      .set({ createdAtMs: Date.now() - 11 * 60 * 1000 }, { merge: true });

    const second = await createRequest();
    assert.equal(second.duplicate, false);
    assert.notEqual(second.id, first.id);
  });

  it("ignores every price, status and reference a client sends", async () => {
    const honest = await createRequest();
    const forged = await createRequest({
      customer: { ...CUSTOMER, email: "forged@test.invalid" },
      status: "confirmed",
      estimatedTotal: 1,
      totalWithVat: 1,
      deposit: 0,
      reference: "CD-FORGED-000001",
      history: [{ action: "confirm" }],
    });

    assert.equal(forged.status, "pending");
    assert.equal(forged.estimatedTotal, honest.estimatedTotal, "price must be recomputed, not read");
    assert.equal(forged.totalWithVat, honest.totalWithVat);
    assert.notEqual(forged.reference, "CD-FORGED-000001");
    assert.deepEqual(forged.history, [], "a client cannot pre-seed an audit trail");
  });

  it("rejects a vehicle that is already booked for those dates", async () => {
    await rejects(
      () =>
        handleCreateBookingRequest(
          bookingPayload({
            vehicleId: blockedVehicle.id,
            pickupDate: scheduledBlock.startDate,
            returnDate: scheduledBlock.endDate,
          }),
        ),
      "vehicle-unavailable",
      "blocked range",
    );
  });

  it("rejects a past pickup date", async () => {
    await rejects(
      () => handleCreateBookingRequest(bookingPayload({ pickupDate: "2020-01-01", returnDate: "2020-01-05" })),
      "past-date",
    );
  });

  it("rejects a malformed email and an unknown vehicle", async () => {
    await rejects(
      () => createRequest({ customer: { ...CUSTOMER, email: "not-an-email" } }),
      "invalid-email",
    );
    await rejects(() => createRequest({ vehicleId: "does-not-exist" }), "vehicle-not-found");
    await rejects(() => createRequest({ pickupLocationId: "nowhere" }), "location-not-found");
  });
});

// ---------------------------------------------------------------------------
// 2. Decisions — role claims, transitions, conflicts, audit
// ---------------------------------------------------------------------------

describe("submitBookingDecision", () => {
  it("refuses callers without an authenticated staff role", async () => {
    const request = await createRequest();
    const payload = { requestId: request.id, action: "confirm" };

    await rejects(() => handleSubmitBookingDecision(payload, null), "unauthenticated");
    await rejects(() => handleSubmitBookingDecision(payload, asNobody), "permission-denied");
    await rejects(() => handleSubmitBookingDecision(payload, asEditor), "permission-denied");

    const stored = await db.doc(`bookingRequests/${request.id}`).get();
    assert.equal(stored.data().status, "pending", "a refused decision must change nothing");
  });

  it("lets an agent confirm, and materialises a data-free block period", async () => {
    const request = await createRequest();
    const result = await handleSubmitBookingDecision(
      { requestId: request.id, action: "confirm" },
      asAgent,
    );

    assert.equal(result.status, "confirmed");
    assert.deepEqual(result.bookedDates, {
      pickupDate: request.pickupDate,
      returnDate: request.returnDate,
    });

    const block = await db.doc(`blockPeriods/${request.id}`).get();
    assert.equal(block.exists, true, "confirming must hold the vehicle");
    assert.equal(block.data().startDate, request.pickupDate);
    assert.equal(block.data().endDate, request.returnDate);

    const extra = Object.keys(block.data()).filter((k) => !BOOKING_BLOCK_FIELDS.includes(k));
    assert.deepEqual(extra, [], "block periods may never carry customer data");

    const entry = result.history.at(-1);
    assert.equal(entry.actor.uid, asAgent.uid);
    assert.equal(entry.actor.role, "agent");
    assert.equal(entry.from, "pending");
    assert.equal(entry.to, "confirmed");
  });

  it("prevents a second confirmation of overlapping dates", async () => {
    const first = await createRequest();
    const second = await createRequest({
      customer: { ...CUSTOMER, email: "rival@test.invalid" },
    });

    await handleSubmitBookingDecision({ requestId: first.id, action: "confirm" }, asAgent);

    await rejects(
      () => handleSubmitBookingDecision({ requestId: second.id, action: "confirm" }, asAgent),
      "vehicle-unavailable",
      "overlapping confirmation",
    );

    const stored = await db.doc(`bookingRequests/${second.id}`).get();
    assert.equal(stored.data().status, "pending", "a rejected confirmation must change nothing");

    const blocks = await db.collection("blockPeriods").get();
    const held = blocks.docs.filter((d) => d.id === first.id || d.id === second.id);
    assert.equal(held.length, 1, "only the winner may hold the vehicle");
    assert.equal(held[0].id, first.id);
  });

  it("treats a repeated decision as a no-op, not an error", async () => {
    const request = await createRequest();
    const first = await handleSubmitBookingDecision(
      { requestId: request.id, action: "confirm" },
      asAgent,
    );
    const again = await handleSubmitBookingDecision(
      { requestId: request.id, action: "confirm" },
      asAgent,
    );

    assert.equal(first.noop, false);
    assert.equal(again.noop, true);
    assert.equal(again.status, "confirmed");

    const stored = await db.doc(`bookingRequests/${request.id}`).get();
    assert.equal(stored.data().history.length, 1, "a retry must not duplicate the audit entry");
  });

  it("walks the transition table and stops at terminal states", async () => {
    const request = await createRequest();
    const ref = db.doc(`bookingRequests/${request.id}`);

    await rejects(
      () => handleSubmitBookingDecision({ requestId: request.id, action: "cancel" }, asAgent),
      "invalid-transition",
      "cancel a pending request",
    );

    const declined = await handleSubmitBookingDecision(
      { requestId: request.id, action: "decline", note: "Vehicle sold." },
      asAgent,
    );
    assert.equal(declined.status, "declined");

    await rejects(
      () => handleSubmitBookingDecision({ requestId: request.id, action: "confirm" }, asAdmin),
      "invalid-transition",
      "confirm a declined request",
    );

    assert.equal((await ref.get()).data().status, "declined");
  });

  it("proposes alternative dates without holding the vehicle", async () => {
    const request = await createRequest();
    const alternative = { pickupDate: futureDate(40), returnDate: futureDate(44) };

    const proposed = await handleSubmitBookingDecision(
      { requestId: request.id, action: "propose", alternative, note: "Sunny is out that week." },
      asAgent,
    );

    assert.equal(proposed.status, "proposed");
    assert.deepEqual(proposed.proposed, alternative);
    assert.deepEqual(
      { pickupDate: proposed.pickupDate, returnDate: proposed.returnDate },
      { pickupDate: request.pickupDate, returnDate: request.returnDate },
      "the original request must never be overwritten",
    );

    const hold = await db.doc(`blockPeriods/${request.id}`).get();
    assert.equal(hold.exists, false, "a proposal reserves nothing");
  });

  it("re-prices against the proposed dates when confirming them", async () => {
    const request = await createRequest();
    const alternative = { pickupDate: futureDate(40), returnDate: futureDate(54) };

    await handleSubmitBookingDecision(
      { requestId: request.id, action: "propose", alternative },
      asAgent,
    );
    const confirmed = await handleSubmitBookingDecision(
      { requestId: request.id, action: "confirm", dates: "proposed" },
      asAdmin,
    );

    assert.equal(confirmed.status, "confirmed");
    assert.deepEqual(confirmed.bookedDates, alternative);
    assert.equal(confirmed.days, 14, "the quote must follow the dates actually booked");

    const expected = quoteVehicle(openVehicle, {
      pickupDate: alternative.pickupDate,
      returnDate: alternative.returnDate,
      pickupLocation: location,
      ratePlan: seed.ratePlans.find((r) => r.status === "active") ?? null,
      currency: openVehicle.pricing.currency,
    });
    assert.equal(confirmed.estimatedTotal, expected.total, "confirming must re-price");
    assert.ok(confirmed.estimatedTotal > request.estimatedTotal);
    assert.equal(confirmed.history.at(-1).previousDates.pickupDate, request.pickupDate);

    const block = (await db.doc(`blockPeriods/${request.id}`).get()).data();
    assert.equal(block.startDate, alternative.pickupDate);
    assert.equal(block.endDate, alternative.returnDate);
  });

  it("frees the vehicle again when a confirmed request is cancelled", async () => {
    const request = await createRequest();
    await handleSubmitBookingDecision({ requestId: request.id, action: "confirm" }, asAgent);
    const cancelled = await handleSubmitBookingDecision(
      { requestId: request.id, action: "cancel" },
      asAdmin,
    );

    assert.equal(cancelled.status, "cancelled");
    const block = await db.doc(`blockPeriods/${request.id}`).get();
    assert.equal(block.exists, false, "cancelling must release the hold");
  });

  it("rejects malformed decisions", async () => {
    const request = await createRequest();
    await rejects(
      () => handleSubmitBookingDecision({ requestId: request.id, action: "detonate" }, asAgent),
      "invalid-action",
    );
    await rejects(
      () => handleSubmitBookingDecision({ requestId: "missing", action: "confirm" }, asAgent),
      "not-found",
    );
    await rejects(
      () =>
        handleSubmitBookingDecision(
          { requestId: request.id, action: "propose", alternative: { pickupDate: "soon" } },
          asAgent,
        ),
      "invalid-dates",
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Public status — authoritative state, no personal data
// ---------------------------------------------------------------------------

describe("getBookingStatus", () => {
  it("returns state for a reference without leaking customer data", async () => {
    const request = await createRequest();
    await handleSubmitBookingDecision({ requestId: request.id, action: "confirm" }, asAgent);

    const status = await handleGetBookingStatus({ reference: request.reference });

    assert.equal(status.status, "confirmed");
    assert.equal(status.effective.pickupDate, request.pickupDate);
    assert.equal(status.timeline.at(-1).action, "confirm");
    assert.equal(status.customer, undefined, "no customer block");
    assert.equal(status.note, undefined, "no internal notes");
    assert.equal(status.history, undefined, "no audit actors");

    const serialized = JSON.stringify(status);
    assert.ok(!serialized.includes(CUSTOMER.email), "email must never be returned");
    assert.ok(!serialized.includes(CUSTOMER.phone), "phone must never be returned");
    assert.ok(!serialized.includes(CUSTOMER.fullName), "name must never be returned");
  });

  it("rejects an unknown or malformed reference", async () => {
    await rejects(() => handleGetBookingStatus({ reference: "CD-00000000-000000" }), "not-found");
    await rejects(() => handleGetBookingStatus({ reference: "" }), "invalid-request");
    await rejects(() => handleGetBookingStatus({}), "invalid-request");
  });
});

// ---------------------------------------------------------------------------
// 4. The real HTTP endpoints
// ---------------------------------------------------------------------------

async function signIn(email, password) {
  const response = await fetch(
    `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const body = await response.json();
  if (!response.ok) throw new Error(`sign-in failed: ${JSON.stringify(body)}`);
  return body.idToken;
}

async function call(name, data, idToken) {
  const response = await fetch(`http://${FUNCTIONS_HOST}/${PROJECT}/${REGION}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ data }),
  });
  const body = await response.json();
  if (body.error) {
    const error = new Error(body.error.message);
    error.status = body.error.status;
    error.details = body.error.details;
    throw error;
  }
  return body.result;
}

describe("callable endpoints over HTTP", () => {
  let agentEmail;
  let agentToken;
  let plainEmail;
  let plainToken;

  before(async () => {
    agentEmail = `agent-${Date.now()}@cedarsdrive.test`;
    plainEmail = `plain-${Date.now()}@example.test`;
    const agent = await auth.createUser({ email: agentEmail, password: "correct-horse-battery" });
    await auth.createUser({ email: plainEmail, password: "correct-horse-battery" });
    await auth.setCustomUserClaims(agent.uid, { role: "agent" });
    agentToken = await signIn(agentEmail, "correct-horse-battery");
    plainToken = await signIn(plainEmail, "correct-horse-battery");
  });

  it("accepts a public booking request from an anonymous caller", async () => {
    const created = await call("createBookingRequest", bookingPayload());
    assert.equal(created.status, "pending");
    assert.match(created.reference, /^CD-\d{8}-\d{6}(-\d+)?$/);
  });

  it("rejects an anonymous decision", async () => {
    const created = await call("createBookingRequest", bookingPayload());
    const error = await rejects(
      () => call("submitBookingDecision", { requestId: created.id, action: "confirm" }),
      "unauthenticated",
      "anonymous decision",
    );
    // The wire `status` is normalized by the SDK; our stable code rides in
    // `details.code`, which is what the web app maps its messages from.
    assert.equal(error.status?.toLowerCase(), "unauthenticated");
    assert.equal(error.details?.code, "unauthenticated");
  });

  it("rejects a signed-in user with no role claim", async () => {
    const created = await call("createBookingRequest", bookingPayload());
    await rejects(
      () => call("submitBookingDecision", { requestId: created.id, action: "confirm" }, plainToken),
      "permission-denied",
      "roleless decision",
    );
  });

  it("honors a real custom claim from the Auth emulator", async () => {
    const created = await call("createBookingRequest", bookingPayload());
    const decided = await call(
      "submitBookingDecision",
      { requestId: created.id, action: "confirm" },
      agentToken,
    );
    assert.equal(decided.status, "confirmed");

    const block = await db.doc(`blockPeriods/${created.id}`).get();
    assert.equal(block.exists, true);
  });

  it("serves the status endpoint to anyone holding the reference", async () => {
    const created = await call("createBookingRequest", bookingPayload());
    const status = await call("getBookingStatus", { reference: created.reference });
    assert.equal(status.status, "pending");
    assert.equal(status.customer, undefined);
  });
});
