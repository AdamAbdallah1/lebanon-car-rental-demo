import { getFirestore } from "./app.js";
import { FirebaseNotConfiguredError } from "./config.js";

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
 * Writes are intentionally absent from the public site in Phase 1 —
 * mutations belong to the admin and will be gated by role claims.
 */

async function fs() {
  const db = await getFirestore();
  const mod = await import("firebase/firestore");
  return { db, ...mod };
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
  const snap = await getDocs(constraints.length ? query(collection(db, collectionName), ...constraints) : collection(db, collectionName));
  return snapshotToList(snap);
}

async function readOne(collectionName, id) {
  if (!id) return null;
  const { db, doc, getDoc } = await fs();
  const snap = await getDoc(doc(db, collectionName, id));
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

  async getVehicleBySlug(slug) {
    const rows = await list("vehicles", { whereClause: ["slug", "==", slug] });
    return rows.find((v) => v.status !== "archived") ?? null;
  },

  async updateVehicle(id, patch) {
    const { db, doc, updateDoc, serverTimestamp } = await fs();
    await updateDoc(doc(db, "vehicles", id), { ...patch, updatedAt: serverTimestamp() });
    return this.getVehicleById(id);
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

  async createBookingRequest(payload) {
    const { db, collection, addDoc, serverTimestamp, doc } = await fs();
    const now = serverTimestamp();
    const reference = `CD-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const record = {
      ...payload,
      reference,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    const created = await addDoc(collection(db, "bookingRequests"), record);
    // Stable, human-shareable id alongside the auto id.
    await import("firebase/firestore").then(({ updateDoc }) =>
      updateDoc(doc(db, "bookingRequests", created.id), { publicId: created.id }),
    );
    return { id: created.id, ...record, status: "pending" };
  },

  async getBookingById(id) {
    return readOne("bookingRequests", id);
  },

  async queryBookingRequests(filters = {}) {
    if (filters.status) return list("bookingRequests", { whereClause: ["status", "==", filters.status] });
    return list("bookingRequests");
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
    return readOne("seo", path === "/" ? "home" : path);
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
