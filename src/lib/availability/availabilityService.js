import { daysBetween, parseISO } from "../dates.js";

/**
 * Availability service.
 *
 * Phase 1 reads seeded block periods; the shape and the function signatures
 * are the ones Firestore will feed (booking status, maintenance windows).
 * Nothing about availability is decided inside a component.
 *
 * Block semantics: `startDate` and `endDate` are both inclusive — a vehicle
 * blocked to the 17th is not rentable on the 17th.
 *
 * @typedef {Object} BlockPeriod
 * @property {string} vehicleId
 * @property {string} startDate  ISO
 * @property {string} endDate    ISO
 * @property {'booked'|'maintenance'|'blocked'} reason
 *
 * @typedef {'available'|'limited'|'unavailable'|'onRequest'} AvailabilityState
 */

function overlaps(block, pickupISO, returnISO) {
  // ISO yyyy-mm-dd strings compare correctly as strings.
  return block.startDate <= returnISO && block.endDate >= pickupISO;
}

/**
 * @param {object} options
 * @param {object} options.vehicle
 * @param {BlockPeriod[]} options.blocks
 * @param {{pickupDate?: string, returnDate?: string}} [options.range]
 * @returns {{state: AvailabilityState, blocking: BlockPeriod|null}}
 */
export function getAvailability({ vehicle, blocks = [], range = {} }) {
  const pick = range.pickupDate;
  const ret = range.returnDate ?? range.pickupDate;

  if (!vehicle) return { state: "unavailable", blocking: null };
  if (vehicle.status === "archived") return { state: "unavailable", blocking: null };

  const vehicleBlocks = blocks.filter((b) => b.vehicleId === vehicle.id);

  if (pick && ret && parseISO(pick) && parseISO(ret)) {
    const blocking =
      vehicleBlocks.find((b) => overlaps(b, pick, ret)) ?? null;
    if (blocking) {
      return { state: "unavailable", blocking };
    }
    if (vehicle.availability === "unavailable") {
      return { state: "unavailable", blocking: null };
    }
    if (vehicle.availability === "limited") {
      return { state: "limited", blocking: null };
    }
    return { state: "available", blocking: null };
  }

  if (vehicle.availability === "unavailable") {
    return { state: "unavailable", blocking: null };
  }

  // No dates: show the standing state, but surface an upcoming block as
  // "limited" so the card never promises a car that is already spoken for.
  const soon = nearestBlock(vehicleBlocks);
  if (soon) return { state: "limited", blocking: soon };
  if (vehicle.availability === "limited") {
    return { state: "limited", blocking: null };
  }
  return { state: "available", blocking: null };
}

function nearestBlock(blocks) {
  if (!blocks.length) return null;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = blocks
    .filter((b) => daysBetween(today, b.startDate) !== null && daysBetween(today, b.startDate) >= 0)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  return upcoming[0] ?? null;
}

/**
 * Convenience: annotate every vehicle in a result set.
 * @param {object[]} vehicles
 * @param {BlockPeriod[]} blocks
 * @param {{pickupDate?: string, returnDate?: string}} [range]
 */
export function withAvailability(vehicles, blocks, range = {}) {
  return vehicles.map((vehicle) => ({
    vehicle,
    availability: getAvailability({ vehicle, blocks, range }),
  }));
}
