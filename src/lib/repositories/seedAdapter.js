import seed from "./seed/index.js";
import {
  BookingInputError,
  DUPLICATE_WINDOW_MS,
  buildBookingRecord,
  evaluateRequest,
  idempotencyKeyFor,
  normalizeBookingInput,
  referenceBase,
  referenceCandidate,
} from "../booking/bookingRecord.js";
import {
  applyDecision,
  normalizeDecisionInput,
  publicStatusOf,
} from "../booking/bookingDecision.js";
import { VEHICLE_STATUSES, slugify } from "../fleet/vehicleInput.js";

/**
 * Seed adapter — the local, Firestore-shaped data source used until a real
 * Firebase project is connected. Every method is async and returns the same
 * documents the Firestore adapter returns, so swapping adapters changes no
 * component code.
 *
 * QA hooks (read from `.env.local`, never committed):
 *   VITE_SEED_LATENCY_MS     simulated round-trip, default 120
 *   VITE_DEMO_FAIL=1         every read/write rejects, so each page's loading,
 *                            empty and error states can be inspected. The
 *                            header/footer reads (`getNavigation`,
 *                            `getSiteSettings`) are excluded on purpose — the
 *                            shell must survive a content outage.
 *   VITE_DEMO_FAIL_WRITES=1  reads succeed and only `createBookingRequest`
 *                            rejects, so the request form's submit-failure
 *                            and retry path can be inspected end to end.
 */

const LATENCY = Number(import.meta.env?.VITE_SEED_LATENCY_MS ?? 120);
const FAIL = import.meta.env?.VITE_DEMO_FAIL === "1";
const FAIL_WRITES = import.meta.env?.VITE_DEMO_FAIL_WRITES === "1";

const wait = () => (LATENCY > 0 ? new Promise((r) => setTimeout(r, LATENCY)) : Promise.resolve());

function failIfSimulated(where) {
  if (FAIL) {
    throw new Error(`[seed] simulated data failure in ${where} (VITE_DEMO_FAIL=1)`);
  }
}

const byId = (list, id) => list.find((item) => item.id === id) ?? null;
const active = (list) => list.filter((item) => item.status !== "archived");

/** Allocate a reference nobody in this store already holds. */
function uniqueReference(list, base) {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const candidate = referenceCandidate(base, attempt);
    if (!list.some((record) => record.reference === candidate)) return candidate;
  }
  throw new Error("[seed] reference space exhausted");
}

/** The rate plan the storefront prices with — mirrors the server read. */
function activeRatePlan() {
  return seed.ratePlans.find((plan) => plan.status === "active") ?? seed.ratePlans[0] ?? null;
}

/** Actor recorded on decisions taken in local demo mode. */
const LOCAL_ACTOR = Object.freeze({ uid: "local-demo", email: null, role: "admin" });

export const seedAdapter = {
  name: "seed",
  configured: true,

  // ---------------------------------------------------------------- vehicles
  async queryVehicles(filters = {}) {
    await wait();
    failIfSimulated("queryVehicles");

    let list = active(seed.vehicles);

    if (filters.categoryId && filters.categoryId !== "all") {
      list = list.filter((v) => v.categoryId === filters.categoryId);
    }
    if (filters.status) {
      list = list.filter((v) => v.status === filters.status);
    }
    if (Array.isArray(filters.ids) && filters.ids.length) {
      const set = new Set(filters.ids);
      list = list.filter((v) => set.has(v.id));
    }
    if (filters.locationId) {
      list = list.filter(
        (v) => Array.isArray(v.locationIds) && v.locationIds.includes(filters.locationId),
      );
    }
    if (filters.featured) {
      list = list.filter((v) => v.featured === true);
    }

    const sort = filters.sort ?? "sortOrder";
    list = [...list].sort((a, b) => {
      if (sort === "priceAsc") return a.pricing.daily - b.pricing.daily;
      if (sort === "priceDesc") return b.pricing.daily - a.pricing.daily;
      if (sort === "name") return a.name.en.localeCompare(b.name.en);
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });

    if (filters.limit) list = list.slice(0, filters.limit);
    return list;
  },

  async getVehicleById(id) {
    await wait();
    failIfSimulated("getVehicleById");
    const v = byId(seed.vehicles, id);
    return v && v.status !== "archived" ? v : null;
  },

  /** The console's read: an archived vehicle still exists and must open. */
  async getVehicleForAdmin(id) {
    await wait();
    return byId(seed.vehicles, id);
  },

  /**
   * Every status, no public filter — the authoring view. Same filters and sort
   * as the Firestore adapter's, so one UI serves both data sources.
   */
  async queryAllVehicles(filters = {}) {
    await wait();
    let list = [...seed.vehicles];

    if (filters.status && filters.status !== "all") {
      list = list.filter((v) => v.status === filters.status);
    }
    if (filters.categoryId && filters.categoryId !== "all") {
      list = list.filter((v) => v.categoryId === filters.categoryId);
    }
    if (filters.availability && filters.availability !== "all") {
      list = list.filter((v) => v.availability === filters.availability);
    }
    if (filters.term) {
      const term = filters.term.trim().toLowerCase();
      list = list.filter((v) =>
        [v.slug, v.make, v.model, v.name?.en, v.name?.ar, v.id]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term),
      );
    }

    const sort = filters.sort ?? "sortOrder";
    list = list.sort((a, b) => {
      if (sort === "priceAsc") return a.pricing.daily - b.pricing.daily;
      if (sort === "priceDesc") return b.pricing.daily - a.pricing.daily;
      if (sort === "name") return a.name.en.localeCompare(b.name.en);
      if (sort === "updatedAt") return String(b.updatedAt).localeCompare(String(a.updatedAt));
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });

    return list;
  },

  async getVehicleBySlug(slug) {
    await wait();
    failIfSimulated("getVehicleBySlug");
    const v = seed.vehicles.find((item) => item.slug === slug && item.status !== "archived");
    return v ?? null;
  },

  async updateVehicle(id, patch) {
    await wait();
    const v = byId(seed.vehicles, id);
    if (!v) throw new Error(`vehicle not found: ${id}`);
    Object.assign(v, patch, { updatedAt: new Date().toISOString() });
    return v;
  },

  /** seed: no database to assign an id, so the slug is the document id. */
  async createVehicle(input) {
    await wait();
    const id = slugify(input.slug);
    if (!id) throw new Error("[seed] createVehicle requires a usable slug");
    if (byId(seed.vehicles, id)) throw new Error(`vehicle already exists: ${id}`);
    const now = new Date().toISOString();
    const fields = {};
    for (const [key, value] of Object.entries(input)) {
      if (key.startsWith("_")) continue;
      fields[key] = value;
    }
    const created = { id, ...fields, createdAt: now, updatedAt: now };
    seed.vehicles.push(created);
    return created;
  },

  async setVehicleStatus(id, status) {
    if (!VEHICLE_STATUSES.includes(status)) {
      throw new Error(`invalid vehicle status: ${status}`);
    }
    return this.updateVehicle(id, { status });
  },

  async archiveVehicle(id) {
    await wait();
    const v = byId(seed.vehicles, id);
    if (!v) throw new Error(`vehicle not found: ${id}`);
    return this.updateVehicle(id, { status: "archived" });
  },

  // -------------------------------------------------------------- categories
  async queryCategories() {
    await wait();
    failIfSimulated("queryCategories");
    return active(seed.categories).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getCategoryById(id) {
    await wait();
    failIfSimulated("getCategoryById");
    return byId(seed.categories, id);
  },

  async queryInclusions() {
    await wait();
    failIfSimulated("queryInclusions");
    return seed.inclusions;
  },

  // --------------------------------------------------------------- locations
  async queryLocations(filters = {}) {
    await wait();
    failIfSimulated("queryLocations");
    let list = active(seed.locations);
    if (filters.group) list = list.filter((l) => l.group === filters.group);
    if (filters.type) list = list.filter((l) => l.type === filters.type);
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getLocationGroups() {
    await wait();
    failIfSimulated("getLocationGroups");
    return [...seed.locationGroups].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getLocationById(id) {
    await wait();
    failIfSimulated("getLocationById");
    return byId(seed.locations, id);
  },

  // --------------------------------------------------------------- bookings
  /**
   * Create a booking request.
   *
   * The demo adapter runs the *same* domain code as the Cloud Function —
   * `normalizeBookingInput` → `evaluateRequest` → `buildBookingRecord` — so a
   * record produced locally and a record produced by the server are identical
   * down to the field. What differs is only where the guarantee is enforced:
   * here against an in-memory array, there inside a Firestore transaction.
   *
   * Guarantees both must keep:
   *
   *  - **Stable reference.** Built from the creation clock, checked against the
   *    store, never handed out twice, never changed afterwards.
   *  - **No accidental duplicates.** The same vehicle/dates/counter/contact
   *    inside `DUPLICATE_WINDOW_MS` returns the request that already exists.
   *  - **Server-owned price.** A client payload is read for intent only; the
   *    total comes from `quoteVehicle`.
   *
   * Fire-and-retry cannot double-book, in either backend.
   */
  async createBookingRequest(payload) {
    await wait();
    failIfSimulated("createBookingRequest");
    if (FAIL_WRITES) {
      throw new Error("[seed] simulated write failure in createBookingRequest (VITE_DEMO_FAIL_WRITES=1)");
    }

    const input = normalizeBookingInput(payload);
    const now = new Date();
    const nowMs = now.getTime();
    const idempotencyKey = idempotencyKeyFor(input);

    const duplicate = seed.bookingRequests.find(
      (record) =>
        record.idempotencyKey === idempotencyKey &&
        nowMs - Date.parse(record.createdAt) < DUPLICATE_WINDOW_MS,
    );
    if (duplicate) return { ...duplicate, duplicate: true };

    const vehicle = byId(seed.vehicles, input.vehicleId);
    const location = byId(seed.locations, input.pickupLocationId);
    const ratePlan = activeRatePlan();
    const blocks = seed.blockPeriods.filter((b) => b.vehicleId === input.vehicleId);

    const { availability, quote } = evaluateRequest({ vehicle, location, ratePlan, blocks, input });
    if (availability.state === "unavailable") {
      throw new BookingInputError("vehicle-unavailable", "the vehicle is not free for these dates");
    }

    const reference = uniqueReference(seed.bookingRequests, referenceBase(now));
    const record = buildBookingRecord({
      input,
      vehicle,
      location,
      quote,
      reference,
      idempotencyKey,
      availabilityCheckedAt: now.toISOString(),
    });
    record.id = `req_${reference.slice(3)}`;
    record.createdAt = now.toISOString();
    record.updatedAt = now.toISOString();

    seed.bookingRequests.unshift(record);
    return { ...record, duplicate: false };
  },

  /**
   * Authoritative status for one reference — the payload the server returns.
   * Personal details and internal notes are stripped by `publicStatusOf`.
   */
  async getBookingStatus(reference) {
    await wait();
    const wanted = String(reference ?? "").trim().toUpperCase();
    const record = seed.bookingRequests.find((r) => r.reference === wanted);
    if (!record) {
      const error = new Error("not-found");
      error.code = "not-found";
      throw error;
    }
    return publicStatusOf(record);
  },

  /**
   * Staff review action.
   *
   * In local demo mode the role check has nothing to check against — there is
   * no Firebase project and therefore no identity — so the actor is recorded
   * as `local-demo` and the admin surface labels itself accordingly. Against
   * Firestore the same call goes through the callable, which reads the Auth
   * custom claim and cannot be reached without one.
   */
  async submitBookingDecision(payload) {
    await wait();
    failIfSimulated("submitBookingDecision");

    const input = normalizeDecisionInput(payload);
    const request = byId(seed.bookingRequests, input.requestId);
    if (!request) {
      const error = new Error("not-found");
      error.code = "not-found";
      throw error;
    }

    const result = applyDecision({
      request,
      input,
      actor: LOCAL_ACTOR,
      blocks: seed.blockPeriods.filter((b) => b.vehicleId === request.vehicleId),
      confirmedRequests: seed.bookingRequests.filter((r) => r.status === "confirmed"),
      vehicle: byId(seed.vehicles, request.vehicleId),
      location: byId(seed.locations, request.pickupLocationId),
      ratePlan: activeRatePlan(),
    });

    if (result.noop) return { ...request, noop: true };

    Object.assign(request, result.changes);

    const index = seed.blockPeriods.findIndex((b) => b.id === request.id);
    if (result.block) {
      const block = { ...result.block, id: request.id };
      if (index >= 0) seed.blockPeriods[index] = block;
      else seed.blockPeriods.push(block);
    } else if (result.deleteBlock && index >= 0) {
      seed.blockPeriods.splice(index, 1);
    }

    return { ...request, noop: false };
  },

  async getBookingById(id) {
    await wait();
    return byId(seed.bookingRequests, id);
  },

  async queryBookingRequests(filters = {}) {
    await wait();
    const { applyBookingFilters } = await import("../../lib/booking/bookingQuery.js");
    return applyBookingFilters(seed.bookingRequests, filters);
  },

  async createInquiry(payload) {
    await wait();
    failIfSimulated("createInquiry");
    const now = new Date().toISOString();
    const record = {
      id: `inq_${Date.now().toString(36)}`,
      status: "new",
      createdAt: now,
      ...payload,
    };
    seed.inquiries.unshift(record);
    return record;
  },

  // ------------------------------------------------------------ availability
  async queryBlockPeriods(vehicleId, range = {}) {
    await wait();
    failIfSimulated("queryBlockPeriods");
    return seed.blockPeriods.filter((b) => {
      if (vehicleId && b.vehicleId !== vehicleId) return false;
      if (range.pickupDate && range.returnDate) {
        return b.startDate <= range.returnDate && b.endDate >= range.pickupDate;
      }
      return true;
    });
  },

  async queryAllBlockPeriods() {
    await wait();
    failIfSimulated("queryAllBlockPeriods");
    return seed.blockPeriods;
  },

  // ----------------------------------------------------------------- content
  // `getNavigation` and `getSiteSettings` deliberately stay readable under a
  // simulated failure: the app shell must survive a content outage.
  async getHomeSections() {
    await wait();
    failIfSimulated("getHomeSections");
    return seed.homeSections.filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getNavigation() {
    await wait();
    return seed.navigation;
  },

  async getServices() {
    await wait();
    failIfSimulated("getServices");
    return active(seed.services).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getOffers() {
    await wait();
    failIfSimulated("getOffers");
    return active(seed.offers).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getFaqs() {
    await wait();
    failIfSimulated("getFaqs");
    return active(seed.faqs).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getRentalTerms() {
    await wait();
    failIfSimulated("getRentalTerms");
    return seed.rentalTerms;
  },

  async getSiteSettings() {
    await wait();
    return seed.siteSettings;
  },

  async getSeo(path) {
    await wait();
    failIfSimulated("getSeo");
    return seed.seo[path] ?? null;
  },

  async queryRatePlans() {
    await wait();
    failIfSimulated("queryRatePlans");
    return seed.ratePlans;
  },
};

export default seedAdapter;
