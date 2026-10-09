/**
 * Trip-fit filtering.
 *
 * "Does this car fit my family and our luggage" is the question the fleet
 * grid answers worst when it only offers categories. The rule lives here —
 * pure, so the results row, the category counts and the query all agree on
 * what "fits 3 bags" means.
 *
 * Filtering runs after the repository read. The rule is the domain logic;
 * where it executes is an implementation detail that a Firestore query can
 * replace without touching a component.
 */

export const TRIP_FILTERS = ["passengers", "luggage"];

/**
 * @param {import('../../lib/repositories/contract.js').Vehicle} vehicle
 * @param {{passengers?: number|null, luggage?: number|null}} filters
 * @returns {boolean}
 */
export function matchesTripFilters(vehicle, { passengers = null, luggage = null } = {}) {
  const specs = vehicle?.specs ?? {};
  if (passengers && (specs.seats ?? 0) < passengers) return false;
  if (luggage && (specs.luggage ?? 0) < luggage) return false;
  return true;
}

/** @param {Array} vehicles @param {object} filters */
export function applyTripFilters(vehicles, filters) {
  if (!filters?.passengers && !filters?.luggage) return vehicles;
  return vehicles.filter((vehicle) => matchesTripFilters(vehicle, filters));
}

/** True when any trip-fit filter narrows the result set. */
export function hasTripFilters(filters) {
  return Boolean(filters?.passengers || filters?.luggage);
}
