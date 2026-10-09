import { rentalDays } from "../dates.js";
import { formatMoney } from "../money.js";

/**
 * Pricing service.
 *
 * Firestore data → pricing service → PricingResult → UI.
 *
 * Components never do arithmetic on business numbers. They render what the
 * service returned, so the same rules apply on cards, the vehicle page and
 * (later) the booking flow.
 *
 * Phase 1 supports: daily, weekly, monthly, location fees, mileage, deposit
 * and VAT disclosure. Seasonal rules, driver age, protection tiers and
 * cancellation fees are accepted as inputs but only wired when those
 * features ship.
 *
 * The result carries its charges already grouped, so a caller can render
 * "rental charges / mandatory fees / refundable deposit / optional extras"
 * without deciding for itself what belongs where:
 *   baseTotal − discount   = subtotal        (rental charges)
 *   + locationFee          = total           (mandatory, one-off)
 *   + vat.amount           = totalWithVat    (mandatory, charged at confirmation)
 *   deposit                = refundable, never part of `total`
 *   extras                 = optional; empty until priced extras exist
 *
 * @typedef {Object} PricingContext
 * @property {string|null} pickupDate      ISO yyyy-mm-dd
 * @property {string|null} returnDate      ISO yyyy-mm-dd
 * @property {object|null} pickupLocation  location record (fee source)
 * @property {object|null} ratePlan        rate plan record
 * @property {string} [currency]
 *
 * @typedef {Object} PricingResult
 * @property {boolean} hasDates
 * @property {number|null} days
 * @property {string} currency
 * @property {number} dailyRate
 * @property {number|null} total
 * ...
 */

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function ruleForDays(days, ratePlan) {
  if (!ratePlan) return null;
  if (days >= (ratePlan.monthlyMinDays ?? Infinity)) {
    return { id: "monthly", pct: ratePlan.monthlyDiscountPct ?? 0, minDays: ratePlan.monthlyMinDays };
  }
  if (days >= (ratePlan.weeklyMinDays ?? Infinity)) {
    return { id: "weekly", pct: ratePlan.weeklyDiscountPct ?? 0, minDays: ratePlan.weeklyMinDays };
  }
  return null;
}

/**
 * Price one vehicle for one search context.
 * @param {import('../contract.js').Vehicle} vehicle
 * @param {PricingContext} ctx
 * @returns {PricingResult}
 */
export function quoteVehicle(vehicle, ctx = {}) {
  const currency = ctx.currency || vehicle.pricing?.currency || "USD";
  const dailyRate = vehicle.pricing?.daily ?? 0;
  const ratePlan = ctx.ratePlan ?? null;
  const days = rentalDays(ctx.pickupDate, ctx.returnDate);
  const hasDates = days !== null && days > 0;

  const vatRate = ratePlan?.vatRate ?? 0.11;
  const deposit = vehicle.deposit ?? 0;
  const mileage = vehicle.mileage ?? { includedPerDayKm: null, overagePerKm: null };

  const monthlyEquivalent = hasDates
    ? null
    : Math.round(dailyRate * 30 * (1 - (vehicle.pricing?.monthlyDiscountPct ?? 0) / 100));

  // Optional extras are quoted, never assumed. The Phase 1 dataset has no
  // priced extras, so the group is present and empty rather than omitted —
  // the UI can then say "none" honestly instead of silently hiding a column.
  const extras = { lines: [], total: 0 };

  if (!hasDates) {
    return {
      hasDates: false,
      days: null,
      currency,
      dailyRate,
      discountedDailyRate: dailyRate,
      rule: null,
      baseTotal: null,
      discount: null,
      locationFee: null,
      subtotal: null,
      total: null,
      totalWithVat: null,
      effectiveDaily: null,
      vat: { rate: vatRate, pct: Math.round(vatRate * 100), amount: null, appliedAtConfirmation: true, includedInTotal: false },
      deposit,
      extras,
      monthlyEquivalent,
      mileage,
      insurance: vehicle.insurance,
    };
  }

  const baseTotal = round2(dailyRate * days);

  const rule = ruleForDays(days, ratePlan);
  const discountPct = rule?.pct ?? 0;
  const discountAmount = round2((baseTotal * discountPct) / 100);
  const subtotal = round2(baseTotal - discountAmount);

  // Location fees are one-off per rental, sourced from the location record.
  const pickup = ctx.pickupLocation;
  const locationFee =
    pickup && pickup.serviceFee > 0
      ? {
          amount: round2(pickup.serviceFee),
          locationId: pickup.id,
          locationName: pickup.shortName ?? pickup.name,
          kind: pickup.type === "airport" ? "airport" : "delivery",
        }
      : null;

  const total = round2(subtotal + (locationFee?.amount ?? 0));
  const vatAmount = round2(total * vatRate);

  return {
    hasDates: true,
    days,
    currency,
    dailyRate,
    discountedDailyRate: round2(dailyRate * (1 - discountPct / 100)),
    rule: rule ? { ...rule, pct: discountPct } : null,
    baseTotal,
    discount: discountAmount > 0 ? { pct: discountPct, amount: discountAmount } : null,
    locationFee,
    subtotal,
    total,
    // VAT is charged at confirmation, never inside `total`. Both figures are
    // returned so no component has to multiply anything to show the real
    // all-in number.
    totalWithVat: round2(total + vatAmount),
    effectiveDaily: round2(total / days),
    vat: {
      rate: vatRate,
      pct: Math.round(vatRate * 100),
      amount: vatAmount,
      appliedAtConfirmation: true,
      includedInTotal: false,
    },
    deposit,
    extras,
    monthlyEquivalent: null,
    mileage,
    insurance: vehicle.insurance,
  };
}

/**
 * Price a whole result set in one call (fleet cards, search results).
 * @param {Array} vehicles
 * @param {PricingContext} ctx
 * @returns {Map<string, PricingResult>} keyed by vehicle id
 */
export function quoteFleet(vehicles, ctx = {}) {
  const out = new Map();
  for (const v of vehicles) out.set(v.id, quoteVehicle(v, ctx));
  return out;
}

/** Human summary used by tooltips/aria — never a source of truth for math. */
export function describeQuote(result, locale = "en") {
  if (!result) return "";
  if (!result.hasDates) {
    return `${formatMoney(result.dailyRate, { locale, currency: result.currency })} / day`;
  }
  return `${formatMoney(result.effectiveDaily, { locale, currency: result.currency })} per day · ${formatMoney(
    result.total,
    { locale, currency: result.currency },
  )} total`;
}
