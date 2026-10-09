/**
 * Firestore security-rule tests.
 *
 * Runs against the real Firestore Emulator with `firestore.rules` loaded —
 * not a simulation of the rule language. Every assertion below is about what a
 * *client* is allowed to do; the Cloud Functions use the Admin SDK, which
 * bypasses rules entirely and is tested separately in `tests/functions.test.mjs`.
 *
 * Run: npm run test:rules
 */
import { after, before, beforeEach, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT = process.env.GCLOUD_PROJECT ?? "demo-cedars-drive";

let env;

/** A vehicle document that satisfies every constraint in `validVehicle()`. */
function validVehicle(overrides = {}) {
  return {
    slug: "nissan-sunny-2024",
    status: "active",
    categoryId: "economy",
    make: "Nissan",
    model: "Sunny",
    year: 2024,
    name: { en: "Nissan Sunny", ar: "نيسان صني" },
    trimName: { en: "SV", ar: "SV" },
    bodyType: { en: "Sedan", ar: "سيدان" },
    description: { en: "A dependable city sedan.", ar: "سيارة مدينة موثوقة." },
    pricing: { currency: "USD", daily: 35 },
    deposit: 300,
    mileage: { includedPerDayKm: 200, overagePerKm: 0.15 },
    insurance: { excess: 750, plan: "standard" },
    inclusionIds: ["insurance"],
    availability: "available",
    locationIds: ["tripoli"],
    media: [],
    featured: true,
    specs: { transmission: "automatic", fuel: "petrol", seats: 5, doors: 4, luggage: 2 },
    sortOrder: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const VALID_SETTINGS = {
  vatRate: 0.11,
  reservationWindowDays: 90,
  contact: { email: "hello@cedarsdrive.example" },
};

async function adminWrite(path, data) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { rules: readFileSync(resolve(ROOT, "firestore.rules"), "utf8") },
  });
});

after(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await adminWrite("vehicles/veh1", validVehicle());
  await adminWrite(
    "locations/tripoli",
    {
      id: "tripoli",
      type: "airport",
      group: "north",
      code: "KYE",
      status: "active",
      name: { en: "Tripoli", ar: "طرابلس" },
      shortName: { en: "Tripoli", ar: "طرابلس" },
      address: { en: "Tripoli", ar: "طرابلس" },
      serviceFee: 15,
      sortOrder: 1,
      pickupGuidance: { en: "", ar: "" },
      hours: { en: "", ar: "" },
      flags: [],
      coordinates: { lat: 34.43, lng: 35.83 },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  );
  await adminWrite("siteSettings/default", VALID_SETTINGS);
  await adminWrite("blockPeriods/blk1", {
    vehicleId: "veh1",
    startDate: "2026-11-01",
    endDate: "2026-11-05",
    reason: "booked",
    source: "request",
    requestId: "req1",
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  await adminWrite("bookingRequests/req1", {
    reference: "CD-20261009-142301",
    status: "pending",
    vehicleId: "veh1",
    pickupDate: "2026-11-01",
    returnDate: "2026-11-05",
    createdAt: "2026-01-01T00:00:00.000Z",
  });
});

const anon = () => env.unauthenticatedContext().firestore();
const as = (role, uid = "user-1") =>
  env.authenticatedContext(uid, role ? { role } : {}).firestore();
const asAdmin = () => as("admin", "admin-1");
const asEditor = () => as("editor", "editor-1");
const asAgent = () => as("agent", "agent-1");

describe("public catalogue", () => {
  it("anonymous users can read a vehicle", async () => {
    await assertSucceeds(getDoc(doc(anon(), "vehicles", "veh1")));
  });

  it("anonymous users can list the fleet", async () => {
    await assertSucceeds(getDocs(query(collection(anon(), "vehicles"), where("status", "==", "active"))));
  });

  it("anonymous users cannot write a vehicle", async () => {
    await assertFails(setDoc(doc(anon(), "vehicles", "veh2"), validVehicle()));
  });

  it("an editor can create a vehicle", async () => {
    await assertSucceeds(setDoc(doc(asEditor(), "vehicles", "veh2"), validVehicle()));
  });

  it("an agent cannot write content", async () => {
    await assertFails(setDoc(doc(asAgent(), "vehicles", "veh2"), validVehicle()));
  });

  it("an update may not introduce a field outside the vehicle schema", async () => {
    await assertFails(
      setDoc(doc(asEditor(), "vehicles", "veh1"), validVehicle({ evil: "nope" })),
    );
  });

  it("an update may not rewrite createdAt", async () => {
    await assertFails(
      setDoc(doc(asEditor(), "vehicles", "veh1"), validVehicle({ createdAt: "1999-01-01" })),
    );
  });

  it("an update may not set an unknown status", async () => {
    await assertFails(
      updateDoc(doc(asEditor(), "vehicles", "veh1"), { status: "rented-out" }),
    );
  });

  it("an update may not set a negative daily rate", async () => {
    await assertFails(
      updateDoc(doc(asEditor(), "vehicles", "veh1"), {
        pricing: { currency: "USD", daily: -5 },
      }),
    );
  });

  it("a valid publish/archive update succeeds", async () => {
    await assertSucceeds(updateDoc(doc(asEditor(), "vehicles", "veh1"), { status: "archived" }));
  });

  it("only an admin may delete a vehicle", async () => {
    await assertFails(deleteDoc(doc(asEditor(), "vehicles", "veh1")));
    await assertSucceeds(deleteDoc(doc(asAdmin(), "vehicles", "veh1")));
  });
});

describe("site settings", () => {
  it("anyone may read them", async () => {
    await assertSucceeds(getDoc(doc(anon(), "siteSettings", "default")));
  });

  it("anonymous users may not change the VAT rate", async () => {
    await assertFails(updateDoc(doc(anon(), "siteSettings", "default"), { vatRate: 0 }));
  });

  it("an editor may not change the VAT rate", async () => {
    await assertFails(updateDoc(doc(asEditor(), "siteSettings", "default"), { vatRate: 0 }));
  });

  it("an admin may set a realistic VAT rate", async () => {
    await assertSucceeds(updateDoc(doc(asAdmin(), "siteSettings", "default"), { vatRate: 0.11 }));
  });

  it("an admin may not set an impossible VAT rate", async () => {
    await assertFails(updateDoc(doc(asAdmin(), "siteSettings", "default"), { vatRate: 5 }));
  });
});

describe("booking requests are server-only", () => {
  it("anonymous users cannot read them", async () => {
    await assertFails(getDoc(doc(anon(), "bookingRequests", "req1")));
    await assertFails(getDocs(collection(anon(), "bookingRequests")));
  });

  it("an agent can read the inbox", async () => {
    await assertSucceeds(getDoc(doc(asAgent(), "bookingRequests", "req1")));
    await assertSucceeds(getDocs(collection(asAgent(), "bookingRequests")));
  });

  it("an editor cannot read customer records", async () => {
    await assertFails(getDocs(collection(asEditor(), "bookingRequests")));
    await assertFails(getDocs(collection(asEditor(), "inquiries")));
  });

  it("even an admin cannot create one from a client", async () => {
    await assertFails(
      setDoc(doc(asAdmin(), "bookingRequests", "forged"), {
        reference: "CD-FORGED-000001",
        status: "confirmed",
        vehicleId: "veh1",
      }),
    );
  });

  it("even an admin cannot change a status from a client", async () => {
    await assertFails(updateDoc(doc(asAdmin(), "bookingRequests", "req1"), { status: "confirmed" }));
  });

  it("an agent cannot change a status from a client", async () => {
    await assertFails(updateDoc(doc(asAgent(), "bookingRequests", "req1"), { status: "confirmed" }));
  });
});

describe("availability is public but server-owned", () => {
  it("anyone may see block periods", async () => {
    await assertSucceeds(getDoc(doc(anon(), "blockPeriods", "blk1")));
    await assertSucceeds(
      getDocs(query(collection(anon(), "blockPeriods"), where("vehicleId", "==", "veh1"))),
    );
  });

  it("no client may write one, admin included", async () => {
    await assertFails(
      setDoc(doc(asAdmin(), "blockPeriods", "blk2"), {
        vehicleId: "veh1",
        startDate: "2026-12-01",
        endDate: "2026-12-02",
        reason: "booked",
      }),
    );
    await assertFails(deleteDoc(doc(asAdmin(), "blockPeriods", "blk1")));
  });
});

describe("dedupe and reference markers", () => {
  it("no client may write idempotency markers", async () => {
    await assertFails(
      setDoc(doc(asAdmin(), "requestIdempotency", "abc"), { requestId: "req1" }),
    );
    await assertFails(getDoc(doc(anon(), "requestIdempotency", "abc")));
  });

  it("no client may write reference markers", async () => {
    await assertFails(setDoc(doc(asAdmin(), "requestReferences", "CD-1"), { requestId: "req1" }));
    await assertFails(getDoc(doc(anon(), "requestReferences", "CD-1")));
  });
});

describe("inquiries", () => {
  it("anyone may send a valid inquiry", async () => {
    await assertSucceeds(
      addDoc(collection(anon(), "inquiries"), {
        name: "Nour",
        email: "nour@example.com",
        message: "Is the Sunny free next week?",
        status: "new",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );
  });

  it("an inquiry with a malformed address is rejected", async () => {
    await assertFails(
      addDoc(collection(anon(), "inquiries"), {
        name: "Nour",
        email: "not-an-email",
        message: "hello",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );
  });

  it("an inquiry cannot be stamped with a non-new status", async () => {
    await assertFails(
      addDoc(collection(anon(), "inquiries"), {
        name: "Nour",
        email: "nour@example.com",
        message: "hello",
        status: "resolved",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );
  });

  it("the sender cannot read inboxes back", async () => {
    await assertFails(getDocs(collection(anon(), "inquiries")));
    await assertFails(getDocs(collection(as("anything-else"), "inquiries")));
  });
});

describe("catch-all deny", () => {
  it("unknown collections are unreadable", async () => {
    await assertFails(getDoc(doc(anon(), "serviceAccountKeys", "k1")));
    await assertFails(getDoc(doc(asAdmin(), "roles", "admin-1")));
  });

  it("an authenticated user without a role is not staff", async () => {
    await assertFails(getDocs(collection(as(null, "plain-user"), "bookingRequests")));
  });

  it("a forged role claim that the client controls is the only role honored — and clients cannot set claims", async () => {
    // `authenticatedContext` is the *test harness* standing in for the Admin
    // SDK; a real client cannot mint this token. What matters is that the rule
    // reads the claim and not a document a user could edit.
    await assertSucceeds(getDocs(collection(as("admin", "legit-admin"), "bookingRequests")));
    await assertFails(getDocs(collection(as("root", "wannabe"), "bookingRequests")));
  });
});
