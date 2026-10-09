import { useId } from "react";
import { cn } from "../../lib/cn.js";
import { useLocaleContext, usePick } from "../../i18n/context.js";
import { formatMoney } from "../../lib/money.js";
import Icon from "../../components/ui/Icon.jsx";

/**
 * Itemised quote.
 *
 * Every figure is read out of a `PricingResult` produced by the pricing
 * service — this component performs no business arithmetic, only formatting.
 * The grouping is the product decision:
 *
 *   Rental charges   base rate, long-duration discount, subtotal
 *   Mandatory fees   location service fee, VAT
 *   Total            excluding VAT, then the all-in figure
 *   Refundable deposit   held, never a charge
 *   Optional extras  only ever opt-in, and empty until priced extras exist
 *
 * Anything a renter would have to guess is printed here instead.
 */

function Money({ value, locale, currency, className }) {
  if (value === null || value === undefined) return null;
  return (
    <span className={cn("font-mono", className)} data-keep-mono>
      {formatMoney(value, { locale: locale === "ar" ? "ar" : "en-US", currency })}
    </span>
  );
}

function Line({ label, value, tone = "default", className }) {
  const toneClass =
    tone === "credit" ? "text-status-open" : tone === "strong" ? "text-ink" : "text-ink-soft";
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-1.5", className)}>
      <dt className={cn("text-body-sm", toneClass)}>{label}</dt>
      <dd className={cn("text-body-sm tabular-nums", toneClass)}>{value}</dd>
    </div>
  );
}

function Group({ title, children, className }) {
  return (
    <div className={className}>
      <p className="label-micro text-ink-faint">{title}</p>
      <dl className="mt-1.5 flex flex-col">{children}</dl>
    </div>
  );
}

export function QuoteBreakdown({ quote, pickupLocation, className, id }) {
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();
  const generatedId = useId();
  const headingId = id ?? generatedId;

  if (!quote?.hasDates) {
    return (
      <p className={cn("text-body-sm text-ink-muted", className)}>{t("quote.empty")}</p>
    );
  }

  const currency = quote.currency;
  const mileage = quote.mileage ?? {};
  const insurance = quote.insurance ?? {};
  const extras = quote.extras ?? { lines: [], total: 0 };
  const feeKind = quote.locationFee?.kind;

  return (
    <section
      id={headingId}
      aria-labelledby={`${headingId}-title`}
      className={cn("flex flex-col gap-5", className)}
    >
      <h3 id={`${headingId}-title`} className="text-title-3 font-medium text-ink">
        {t("quote.title")}
      </h3>

      <Group title={t("quote.charges")}>
        <Line
          label={`${t("card.dayCount", { count: quote.days })} × ${formatMoney(quote.dailyRate, {
            locale: locale === "ar" ? "ar" : "en-US",
            currency,
          })}`}
          value={<Money value={quote.baseTotal} locale={locale} currency={currency} />}
        />
        {quote.discount ? (
          <Line
            tone="credit"
            label={
              quote.rule?.id === "monthly"
                ? t("pricing.monthlyDiscount", { pct: quote.discount.pct })
                : t("pricing.weeklyDiscount", { pct: quote.discount.pct })
            }
            value={`−${formatMoney(quote.discount.amount, {
              locale: locale === "ar" ? "ar" : "en-US",
              currency,
            })}`}
          />
        ) : null}
        <Line
          tone="strong"
          className="mt-1 border-t border-line pt-2.5"
          label={t("quote.subtotal")}
          value={<Money value={quote.subtotal} locale={locale} currency={currency} />}
        />
      </Group>

      <Group title={t("quote.fees")}>
        {quote.locationFee ? (
          <Line
            label={feeKind === "airport" ? t("locations.fee") : t("locations.fee.delivery")}
            value={<Money value={quote.locationFee.amount} locale={locale} currency={currency} />}
          />
        ) : null}
        <Line
          label={t("quote.vatLine", { pct: quote.vat.pct })}
          value={<Money value={quote.vat.amount} locale={locale} currency={currency} />}
        />
      </Group>

      <dl className="flex flex-col border-t border-line pt-2">
        <Line
          label={t("quote.totalExVat")}
          value={<Money value={quote.total} locale={locale} currency={currency} />}
        />
        <Line
          tone="strong"
          className="border-t border-line pt-2.5"
          label={t("quote.totalIncVat", { pct: quote.vat.pct })}
          value={
            <Money
              value={quote.totalWithVat}
              locale={locale}
              currency={currency}
              className="text-title-2 font-medium"
            />
          }
        />
      </dl>

      <p className="text-caption leading-relaxed text-ink-muted">{t("quote.vatNote")}</p>

      <div className="rounded-lg border border-line bg-surface-sunken p-4">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-body-sm font-medium text-ink">{t("quote.depositTitle")}</p>
          <Money
            value={quote.deposit}
            locale={locale}
            currency={currency}
            className="text-title-3 font-medium text-ink"
          />
        </div>
        <p className="mt-1.5 text-caption leading-relaxed text-ink-muted">
          {t("quote.depositNote")}
        </p>
      </div>

      <div>
        <p className="label-micro text-ink-faint">{t("quote.extrasTitle")}</p>
        {extras.lines.length ? (
          <dl className="mt-1.5 flex flex-col">
            {extras.lines.map((line) => (
              <Line
                key={line.id}
                label={pickLocalized(line.name, locale, line.id)}
                value={<Money value={line.amount} locale={locale} currency={currency} />}
              />
            ))}
          </dl>
        ) : (
          <p className="mt-1.5 text-body-sm text-ink-soft">{t("quote.extrasNone")}</p>
        )}
        <p className="mt-1.5 text-caption leading-relaxed text-ink-muted">
          {t("quote.extrasNote")}
        </p>
      </div>

      <div className="border-t border-line pt-4">
        <p className="label-micro text-ink-faint">{t("quote.mileageTitle")}</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {mileage.includedPerDayKm ? (
            <li className="flex items-start gap-2 text-body-sm text-ink-soft">
              <Icon name="route" size={14} className="mt-0.5 shrink-0 text-ink-faint" />
              {t("pricing.mileageIncluded", { count: mileage.includedPerDayKm })}
            </li>
          ) : null}
          {mileage.overagePerKm ? (
            <li className="flex items-start gap-2 text-body-sm text-ink-soft">
              <Icon name="alert" size={14} className="mt-0.5 shrink-0 text-ink-faint" />
              {t("pricing.mileageOverage", {
                amount: formatMoney(mileage.overagePerKm, {
                  locale: locale === "ar" ? "ar" : "en-US",
                  currency,
                }),
              })}
            </li>
          ) : null}
          {insurance.excess ? (
            <li className="flex items-start gap-2 text-body-sm text-ink-soft">
              <Icon name="shield" size={14} className="mt-0.5 shrink-0 text-ink-faint" />
              {t("quote.excess", {
                amount: formatMoney(insurance.excess, {
                  locale: locale === "ar" ? "ar" : "en-US",
                  currency,
                }),
              })}
            </li>
          ) : null}
        </ul>
      </div>

      {pickupLocation ? (
        <p className="text-caption leading-relaxed text-ink-muted">
          {t("quote.pickupNote", {
            location: pickLocalized(pickupLocation.shortName ?? pickupLocation.name, locale),
          })}
        </p>
      ) : null}
    </section>
  );
}

export default QuoteBreakdown;
