import { Link } from "react-router-dom";
import { cn } from "../../lib/cn.js";
import { useLocaleContext, usePick } from "../../i18n/context.js";
import { formatMoney } from "../../lib/money.js";
import { useJourneyLink } from "../search/useJourneyLink.js";
import Button from "../../components/ui/Button.jsx";
import Icon from "../../components/ui/Icon.jsx";
import { availabilityLabelKey } from "../fleet/vehicleDisplay.js";

function money(value, locale, currency) {
  return formatMoney(value, { locale: locale === "ar" ? "ar" : "en-US", currency });
}

/**
 * Price block — every figure comes from the PricingResult.
 * Nothing here multiplies, divides or decides a rate.
 */
export function PriceSummary({ vehicle, quote, availabilityState }) {
  const { t, locale } = useLocaleContext();
  const currency = quote?.currency ?? vehicle.pricing?.currency ?? "USD";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="label-micro text-ink-muted">
            {quote?.hasDates ? t("vehicle.dailyRate") : t("pricing.from")}
          </p>
          <p className="mt-1 text-display-3 font-medium leading-none tracking-tight text-ink" data-keep-mono>
            {money(
              quote?.hasDates ? quote.discountedDailyRate : quote?.dailyRate,
              locale,
              currency,
            )}
          </p>
          <p className="mt-1.5 text-caption text-ink-muted">{t("pricing.perDay")}</p>
        </div>

        {availabilityState ? (
          <span className="label-micro rounded-pill border border-line bg-surface-sunken px-2.5 py-1 text-ink-soft">
            {t(availabilityLabelKey(availabilityState))}
          </span>
        ) : null}
      </div>

      {quote?.hasDates ? (
        <dl className="flex flex-col gap-2.5 text-body-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-muted">
              {t("card.dayCount", { count: quote.days })}
              {" × "}
              {money(quote.dailyRate, locale, currency)}
            </dt>
            <dd className="font-mono text-ink-soft" data-keep-mono>
              {money(quote.baseTotal, locale, currency)}
            </dd>
          </div>

          {quote.discount ? (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-status-open">
                {quote.rule?.id === "monthly"
                  ? t("pricing.monthlyDiscount", { pct: quote.discount.pct })
                  : t("pricing.weeklyDiscount", { pct: quote.discount.pct })}
              </dt>
              <dd className="font-mono text-status-open" data-keep-mono>
                {`−${money(quote.discount.amount, locale, currency)}`}
              </dd>
            </div>
          ) : null}

          {quote.locationFee ? (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-muted">
                {quote.locationFee.kind === "airport"
                  ? t("locations.fee")
                  : t("locations.group.delivery")}
              </dt>
              <dd className="font-mono text-ink-soft" data-keep-mono>
                {money(quote.locationFee.amount, locale, currency)}
              </dd>
            </div>
          ) : null}

          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
            <dt className="font-medium text-ink">{t("vehicle.tripTotal")}</dt>
            <dd className="font-mono text-title-2 font-medium text-ink" data-keep-mono>
              {money(quote.total, locale, currency)}
            </dd>
          </div>

          <p className="text-caption text-ink-muted">{t("vehicle.priceNote")}</p>
        </dl>
      ) : (
        <div className="flex flex-col gap-2 text-body-sm">
          <p className="text-ink-muted">{t("vehicle.noDates")}</p>
          {quote?.monthlyEquivalent != null ? (
            <p className="text-ink-muted">
              {t("vehicle.monthlyEquivalent")}:{" "}
              <span className="font-mono text-ink-soft" data-keep-mono>
                {money(quote.monthlyEquivalent, locale, currency)}
              </span>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * Desktop sticky rail + mobile sticky bar for the vehicle page.
 * Both render the same actions; only the position changes.
 */
export function BookingRail({ vehicle, quote, availabilityState, compact = false }) {
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();
  const name = pickLocalized(vehicle.name, locale, vehicle.model);
  const blocked = availabilityState === "unavailable";

  // The pick-up point and dates the customer already chose travel with the
  // request — `/book` reads them straight out of this query string.
  const journeyLink = useJourneyLink();
  const bookHref = journeyLink(`/book?vehicle=${encodeURIComponent(vehicle.id)}`);

  const whatsappNumber = "+96171000000";
  const waDigits = whatsappNumber.replace(/[^\d]/g, "");
  const waText = encodeURIComponent(
    locale === "ar"
      ? `مرحبًا، أود الاستفسار عن ${name}.`
      : `Hello, I'd like to ask about the ${name}.`,
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        compact ? "flex-row items-center justify-between gap-4" : "",
      )}
    >
      {compact ? (
        <div className="min-w-0">
          <p className="truncate text-body-sm font-medium text-ink">{name}</p>
          <p className="text-caption text-ink-muted">
            {quote?.hasDates
              ? `${money(quote.discountedDailyRate, locale, quote.currency)} ${t("pricing.perDay")} · ${money(quote.total, locale, quote.currency)} ${t("pricing.total")}`
              : `${money(vehicle.pricing.daily, locale, vehicle.pricing.currency)} ${t("pricing.perDay")}`}
          </p>
        </div>
      ) : null}

      <div className={cn("flex flex-col gap-2.5", compact && "flex-row shrink-0 items-center gap-2")}>
        {blocked ? (
          <span
            aria-disabled="true"
            className={cn(
              "inline-flex items-center justify-center rounded-md border border-line bg-surface-sunken font-mono text-ink-muted",
              compact ? "min-h-11 whitespace-nowrap px-4 text-caption" : "min-h-12 w-full px-6 text-body-sm",
            )}
          >
            {t("card.availability.unavailable")}
          </span>
        ) : (
          <Button
            as={Link}
            to={bookHref}
            size={compact ? "md" : "lg"}
            className={compact ? "whitespace-nowrap" : "w-full"}
          >
            {t("vehicle.request")}
          </Button>
        )}

        {!compact ? (
          <Button
            as="a"
            href={`https://wa.me/${waDigits}?text=${waText}`}
            target="_blank"
            rel="noreferrer noopener"
            variant="quiet"
            size="lg"
            aria-label={t("vehicle.whatsappLabel", { name })}
          >
            <Icon name="whatsapp" size={16} />
            {t("vehicle.whatsapp")}
            <span className="sr-only">{t("a11y.openInNewTab")}</span>
          </Button>
        ) : null}
      </div>

      {!compact ? (
        <p className="text-center text-caption text-ink-muted">{t("booking.subtitle")}</p>
      ) : null}
    </div>
  );
}

export default BookingRail;
