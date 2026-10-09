import seed from "./seed/index.js";

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

/** Two identical submissions closer together than this are one request. */
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

const pad = (n, width = 2) => String(n).padStart(width, "0");

/**
 * A readable, human-quotable reference: `CD-20261009-142301`.
 * Date + time of creation, so a customer can read it out over the phone and
 * support can sort on it. Uniqueness is enforced by `uniqueReference`.
 */
function referenceBase(date) {
  const stamp =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `CD-${stamp}`;
}

function uniqueReference(list, base) {
  let candidate = base;
  let suffix = 2;
  while (list.some((record) => record.reference === candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/**
 * Everything that makes a submission "the same request" for dedupe purposes.
 * Deliberately excludes free-text notes: a driver adding a flight number on
 * a retry is still retrying, not asking for a second car.
 */
function idempotencyKeyFor(payload) {
  const customer = payload.customer ?? {};
  return [
    payload.vehicleId ?? "",
    payload.pickupDate ?? "",
    payload.returnDate ?? "",
    payload.pickupLocationId ?? "",
    (customer.email ?? "").trim().toLowerCase(),
    (customer.phone ?? "").trim(),
  ].join("|");
}

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

  async archiveVehicle(id) {
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
   * Two guarantees the public site depends on:
   *
   *  - **Stable reference.** The reference is built once from the creation
   *    clock and checked against the store, so it can never be handed out
   *    twice and it never changes afterwards.
   *  - **No accidental duplicates.** An identical submission (same vehicle,
   *    dates, location and contact) inside `DUPLICATE_WINDOW_MS` returns the
   *    request that already exists instead of creating a second one. A retry
   *    after a network error therefore cannot double-book.
   *
   * The Firestore adapter must reproduce both with a deterministic document
   * ID derived from `idempotencyKey` (see `src/lib/firebase/README.md`).
   */
  async createBookingRequest(payload) {
    await wait();
    failIfSimulated("createBookingRequest");
    if (FAIL_WRITES) {
      throw new Error("[seed] simulated write failure in createBookingRequest (VITE_DEMO_FAIL_WRITES=1)");
    }

    const idempotencyKey = idempotencyKeyFor(payload);
    const nowMs = Date.now();

    const duplicate = seed.bookingRequests.find(
      (record) =>
        record.idempotencyKey === idempotencyKey &&
        nowMs - Date.parse(record.createdAt) < DUPLICATE_WINDOW_MS,
    );
    if (duplicate) return duplicate;

    const created = new Date(nowMs);
    const reference = uniqueReference(seed.bookingRequests, referenceBase(created));
    const now = created.toISOString();

    const record = {
      id: `req_${reference.slice(3)}`,
      reference,
      idempotencyKey,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      ...payload,
    };

    seed.bookingRequests.unshift(record);
    return record;
  },

  async getBookingById(id) {
    await wait();
    return byId(seed.bookingRequests, id);
  },

  async queryBookingRequests(filters = {}) {
    await wait();
    let list = seed.bookingRequests;
    if (filters.status) list = list.filter((b) => b.status === filters.status);
    return list;
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
