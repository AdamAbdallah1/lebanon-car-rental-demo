/**
 * Location fee derivations.
 *
 * A group card shows one figure — the lowest service fee charged at any point
 * in that group. Computing it here keeps the rule out of the component tree,
 * exactly like the pricing service does for vehicle rates.
 */

/**
 * @param {Array<{serviceFee?: number}>} locations
 * @returns {number} lowest non-negative fee in the set, `0` when there is none
 */
export function lowestServiceFee(locations = []) {
  let lowest = null;
  for (const location of locations) {
    const fee = location?.serviceFee;
    if (typeof fee !== "number" || !Number.isFinite(fee) || fee < 0) continue;
    if (lowest === null || fee < lowest) lowest = fee;
  }
  return lowest ?? 0;
}
