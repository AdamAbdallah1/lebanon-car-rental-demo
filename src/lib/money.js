/**
 * Money is business data. Formatting lives here so no component ever
 * formats currency with its own rules.
 *
 * Currency is configured through the repository (siteSettings), never
 * hardcoded at the call site.
 */

const DEFAULT_CURRENCY = "USD";

const formatterCache = new Map();

function getFormatter(locale, currency, decimals) {
  const key = `${locale}|${currency}|${decimals}`;
  let f = formatterCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatterCache.set(key, f);
  }
  return f;
}

/** Normalize an amount that may be stored as a whole-currency number. */
function decimalsFor(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.abs(value % 1) > 0.0001 ? 2 : 0;
}

/**
 * Format an amount for display.
 * @param {number|null|undefined} value
 * @param {{locale?: string, currency?: string, decimals?: number}} [opts]
 */
export function formatMoney(value, opts = {}) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  const locale = opts.locale || "en-US";
  const currency = opts.currency || DEFAULT_CURRENCY;
  const decimals = opts.decimals ?? decimalsFor(value);
  return getFormatter(locale, currency, decimals).format(value);
}

/**
 * Compact money for tight spaces: $1.2K / $12K.
 * Only used for genuinely large data values (monthly totals).
 */
export function formatMoneyCompact(value, opts = {}) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  const locale = opts.locale || "en-US";
  const currency = opts.currency || DEFAULT_CURRENCY;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Plain number with grouping (mileage, kilometres). */
export function formatNumber(value, opts = {}) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return new Intl.NumberFormat(opts.locale || "en-US", {
    maximumFractionDigits: opts.decimals ?? 0,
  }).format(value);
}

/**
 * Format a configured rate (VAT, discount) as a percentage.
 * The rate stays a fraction in the data; this only decides how it reads.
 */
export function formatPercent(value, opts = {}) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return new Intl.NumberFormat(opts.locale || "en-US", {
    style: "percent",
    minimumFractionDigits: opts.decimals ?? 0,
    maximumFractionDigits: opts.decimals ?? 0,
  }).format(value);
}
