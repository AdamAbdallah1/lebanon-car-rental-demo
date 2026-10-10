import { getFirestore } from "./app.js";
import { FirebaseNotConfiguredError } from "./config.js";
import { VEHICLE_STATUSES } from "../fleet/vehicleInput.js";

/**
 * Firestore adapter — implements the same repository contract as the seed
 * adapter (`src/lib/repositories/contract.js`).
 *
 * All Firebase specifics live in this folder. The SDK is imported lazily so
 * that a demo build without credentials never downloads it.
 *
 * Collection map (see README.md for the full document shapes):
 *   vehicles · categories · locations · bookingRequests · inquiries ·
 *   blockPeriods · ratePlans · homeSections · navigation · services ·
 *   offers · faqs · rentalTerms · siteSettings · seo
 *
 * Writes on the public site go one of two ways:
 *   • content and fleet data  → direct client writes, gated by role claims in
 *     `firestore.rules` and shaped by this adapter;
 *   • booking requests        → callable Cloud Functions only. Price,
 *     availability, status, reference and idempotency are decided server-side
 *     (`functions/src/`), because `firestore.rules` denies client writes to
 *     `bookingRequests` outright.
 */

/**
 * How many vehicles the console will read in one query. A fleet larger than
 * this is a real limit, so the UI states it rather than silently truncating.
 */
const FLEET_FETCH_CAP = 500;

async function fs() {
  const db = await getFirestore();
  const mod = await import("firebase/firestore");
  return { db, ...mod };
}

/** Never leave an operator on a control that never resolves. */
const OPERATION_TIMEOUT_MS = 10_000;

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Retry a write once after re-establishing the connection, and never wait
 * forever. Reads are deliberately not wrapped: they reject on their own and the
 * console already shows that failure with a retry button.
 *
 * A dropped WebChannel leaves the SDK reporting "the client is offline" and the
 * operation pending — which, without this, strands an operator on a "Saving…"
 * button that never resolves and offers no way out but a reload. `enableNetwork()`
 * is the documented way to bring the channel back; the timeout is what turns the
 * remaining cases into an error the UI can actually show.
 */
async function withConnectionRetry(operation, label, { timeout = OPERATION_TIMEOUT_MS } = {}) {
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await (timeout === null ? operation() : withTimeout(operation(), timeout, label));
    } catch (error) {
      lastError = error;
      const message = String(error?.message ?? error);
      const retryable = /offline|unavailable|network|deadline|timed out/i.test(message);
      if (attempt === 1 || !retryable) throw error;
      try {
        const { enableNetwork } = await import("firebase/firestore");
        await withTimeout(
          enableNetwork(await getFirestore()),
          OPERATION_TIMEOUT_MS,
          "enableNetwork",
        );
      } catch {
        /* Re-establishing failed; the retry below surfaces the real error. */
      }
    }
  }
  throw lastError;
}

function snapshotToList(snapshot) {
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function list(collectionName, { whereClause = null, order = null, max = null } = {}) {
  const { db, collection, query, where, orderBy, limit, getDocs } = await fs();
  const constraints = [];
  if (whereClause) constraints.push(where(whereClause[0], whereClause[1], whereClause[2]));
  if (order) constraints.push(orderBy(order.field, order.direction ?? "asc"));
  if (max) constraints.push(limit(max));
  const snap = await withConnectionRetry(
    async () =>
      getDocs(
        constraints.length ? query(collection(db, collectionName), ...constraints) : collection(db, collectionName),
      ),
    `list ${collectionName}`,
    // No timeout: a read that rejects already surfaces as an error the console
    // shows with a retry button. Only writes need the cap.
    { timeout: null },
  );
  return snapshotToList(snap);
}

async function readOne(collectionName, id) {
  if (!id) return null;
  const { db, doc, getDoc } = await fs();
  const snap = await withConnectionRetry(
    async () => getDoc(doc(db, collectionName, id)),
    `read ${collectionName}/${id}`,
    { timeout: null },
  );
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export const firestoreAdapter = {
  name: "firestore",
  configured: true,

  async queryVehicles(filters = {}) {
    let rows;
    try {
      rows = await list("vehicles", {
        whereClause: ["status", "==", filters.status ?? "active"],
      });
    } catch (error) {
      throw wrap(error, "queryVehicles");
    }

    if (filters.categoryId && filters.categoryId !== "all") {
      rows = rows.filter((v) => v.categoryId === filters.categoryId);
    }
    if (filters.locationId) {
      rows = rows.filter((v) => (v.locationIds ?? []).includes(filters.locationId));
    }
    if (filters.featured) rows = rows.filter((v) => v.featured === true);

    const sort = filters.sort ?? "sortOrder";
    rows = [...rows].sort((a, b) => {
      if (sort === "priceAsc") return a.pricing.daily - b.pricing.daily;
      if (sort === "priceDesc") return b.pricing.daily - a.pricing.daily;
      if (sort === "name") return a.name.en.localeCompare(b.name.en);
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });

    if (filters.limit) rows = rows.slice(0, filters.limit);
    return rows;
  },

  async getVehicleById(id) {
    try {
      const v = await readOne("vehicles", id);
      return v && v.status !== "archived" ? v : null;
    } catch (error) {
      throw wrap(error, "getVehicleById");
    }
  },

  /** The console's read: an archived vehicle still exists and must open. */
  async getVehicleForAdmin(id) {
    try {
      return await readOne("vehicles", id);
    } catch (error) {
      throw wrap(error, "getVehicleForAdmin");
    }
  },

  async getVehicleBySlug(slug) {
    const rows = await list("vehicles", { whereClause: ["slug", "==", slug] });
    return rows.find((v) => v.status !== "archived") ?? null;
  },

  /**
   * The fleet as an authoring surface: every status, no public filter.
   *
   * One `in` query on a single field (which needs no composite index), then
   * the same in-memory filter and sort the public query uses, so an operator
   * and a customer never compute a different list from the same documents.
   */
  async queryAllVehicles(filters = {}) {
    let rows;
    try {
      rows = await list("vehicles", {
        whereClause: ["status", "in", ["active", "draft", "archived"]],
        max: FLEET_FETCH_CAP,
      });
    } catch (error) {
      throw wrap(error, "queryAllVehicles");
    }

    if (filters.status && filters.status !== "all") {
      rows = rows.filter((v) => v.status === filters.status);
    }
    if (filters.categoryId && filters.categoryId !== "all") {
      rows = rows.filter((v) => v.categoryId === filters.categoryId);
    }
    if (filters.availability && filters.availability !== "all") {
      rows = rows.filter((v) => v.availability === filters.availability);
    }
    if (filters.term) {
      const term = filters.term.trim().toLowerCase();
      rows = rows.filter((v) => {
        const haystack = [v.slug, v.make, v.model, v.name?.en, v.name?.ar, v.id]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      });
    }

    const sort = filters.sort ?? "sortOrder";
    rows = [...rows].sort((a, b) => {
      if (sort === "priceAsc") return a.pricing.daily - b.pricing.daily;
      if (sort === "priceDesc") return b.pricing.daily - a.pricing.daily;
      if (sort === "name") return a.name.en.localeCompare(b.name.en);
      if (sort === "updatedAt") return String(b.updatedAt).localeCompare(String(a.updatedAt));
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });

    return rows;
  },

  /** Assigns the id; `slug` stays a field so it can be renamed without moving. */
  async createVehicle(input) {
    const { db, collection, doc, setDoc } = await fs();
    const fields = {};
    for (const [key, value] of Object.entries(input)) {
      if (key.startsWith("_")) continue;
      fields[key] = value;
    }
    const now = new Date().toISOString();
    const ref = doc(collection(db, "vehicles"));
    await setDoc(ref, { ...fields, createdAt: now, updatedAt: now });
    return { id: ref.id, ...fields, createdAt: now, updatedAt: now };
  },

  /**
   * Patches only what changed. `updatedAt` is an ISO string, like every other
   * timestamp in this data model — a Firestore `Timestamp` sentinel would make
   * the fleet editor and the public site disagree about a vehicle's type.
   */
  async updateVehicle(id, patch) {
    const { db, doc, updateDoc } = await fs();
    const keys = Object.keys(patch);
    if (!keys.length) return this.getVehicleById(id);
    await withConnectionRetry(
      async () => {
        await updateDoc(doc(db, "vehicles", id), {
          ...patch,
          updatedAt: new Date().toISOString(),
        });
      },
      `update vehicles/${id}`,
    );
    // The write has landed. A confirmation read that struggles must not make
    // the operator think it did not, so the page reloads rather than erroring.
    try {
      return await this.getVehicleById(id);
    } catch {
      return { id };
    }
  },

  async setVehicleStatus(id, status) {
    if (!VEHICLE_STATUSES.includes(status)) {
      throw new Error(`invalid vehicle status: ${status}`);
    }
    return this.updateVehicle(id, { status });
  },

  async archiveVehicle(id) {
    return this.updateVehicle(id, { status: "archived" });
  },

  async queryCategories() {
    const rows = await list("categories");
    return rows.filter((c) => c.status !== "archived").sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getCategoryById(id) {
    return readOne("categories", id);
  },

  async queryInclusions() {
    return list("inclusions");
  },

  async queryLocations(filters = {}) {
    let rows = await list("locations");
    rows = rows.filter((l) => l.status !== "archived");
    if (filters.group) rows = rows.filter((l) => l.group === filters.group);
    if (filters.type) rows = rows.filter((l) => l.type === filters.type);
    return rows.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getLocationGroups() {
    return list("locationGroups");
  },

  async getLocationById(id) {
    return readOne("locations", id);
  },

  /**
   * Public booking creation.
   *
   * Delegates entirely to the callable: the client sends intent (which car,
   * which dates, which counter, who is asking) and the server answers with a
   * record it priced, de-duplicated and referenced itself. Rules deny writing
   * this collection directly, so there is no code path that skips the server.
   */
  async createBookingRequest(payload) {
    const { callFunction } = await import("./functions.js");
    return callFunction("createBookingRequest", payload);
  },

  /** Authoritative state for one reference — no customer data returned. */
  async getBookingStatus(reference) {
    const { callFunction } = await import("./functions.js");
    return callFunction("getBookingStatus", { reference });
  },

  /** Staff review action; server-enforced role claim and transition table. */
  async submitBookingDecision(input) {
    const { callFunction } = await import("./functions.js");
    return callFunction("submitBookingDecision", input);
  },

  async getBookingById(id) {
    return readOne("bookingRequests", id);
  },

  async queryBookingRequests(filters = {}) {
    const { db, collection, query, where, orderBy, limit, getDocs } = await fs();
    const constraints = [];

    // Narrow server-side where the composite indexes already cover the query
    // (`firestore.indexes.json`). The vehicle filter deliberately skips
    // `orderBy` rather than inventing an index nobody has deployed; the shared
    // filter re-sorts either way.
    if (filters.status) constraints.push(where("status", "==", filters.status));
    if (filters.vehicleId) constraints.push(where("vehicleId", "==", filters.vehicleId));
    if (!filters.vehicleId) constraints.push(orderBy("createdAt", "desc"));
    if (filters.max) constraints.push(limit(filters.max));

    const snap = await getDocs(
      constraints.length
        ? query(collection(db, "bookingRequests"), ...constraints)
        : collection(db, "bookingRequests"),
    );
    const { applyBookingFilters } = await import("../../lib/booking/bookingQuery.js");
    return applyBookingFilters(snapshotToList(snap), filters);
  },

  async createInquiry(payload) {
    const { db, collection, addDoc, serverTimestamp } = await fs();
    const record = { ...payload, status: "new", createdAt: serverTimestamp() };
    const created = await addDoc(collection(db, "inquiries"), record);
    return { id: created.id, ...record };
  },

  async queryBlockPeriods(vehicleId, range = {}) {
    const rows = await list("blockPeriods", {
      whereClause: vehicleId ? ["vehicleId", "==", vehicleId] : null,
    });
    if (!range.pickupDate || !range.returnDate) return rows;
    return rows.filter((b) => b.startDate <= range.returnDate && b.endDate >= range.pickupDate);
  },

  async queryAllBlockPeriods() {
    return list("blockPeriods");
  },

  async getHomeSections() {
    const rows = await list("homeSections");
    return rows.filter((s) => s.enabled !== false).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getNavigation() {
    return readOne("navigation", "main");
  },

  async getServices() {
    const rows = await list("services");
    return rows.filter((s) => s.status !== "archived").sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getOffers() {
    const rows = await list("offers");
    return rows.filter((s) => s.status !== "archived").sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getFaqs() {
    const rows = await list("faqs");
    return rows.filter((s) => s.status !== "archived").sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getRentalTerms() {
    return readOne("rentalTerms", "main");
  },

  async getSiteSettings() {
    return readOne("siteSettings", "main");
  },

  async getSeo(path) {
    // Document ids cannot contain `/`, so the leading slash is dropped and the
    // root route keeps its own id. The seed script writes the same mapping.
    const id = path === "/" ? "home" : String(path).replace(/^\//, "");
    return readOne("seo", id);
  },

  async queryRatePlans() {
    const rows = await list("ratePlans");
    return rows.filter((r) => r.status !== "archived");
  },
};

function wrap(error, op) {
  if (error instanceof FirebaseNotConfiguredError) return error;
  const e = new Error(`Firestore ${op} failed: ${error?.message ?? error}`);
  e.cause = error;
  return e;
}

export default firestoreAdapter;
