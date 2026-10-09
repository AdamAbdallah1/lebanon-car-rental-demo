import { Link } from "react-router-dom";
import { cn } from "../../lib/cn.js";
import { useLocaleContext, usePick } from "../../i18n/context.js";
import { formatMoney } from "../../lib/money.js";
import { useJourneyLink } from "../search/useJourneyLink.js";
import Picture from "../../components/ui/Picture.jsx";
import StatusMark from "../../components/ui/StatusMark.jsx";
import Icon from "../../components/ui/Icon.jsx";
import {
  availabilityLabelKey,
  specCells,
  vehicleAlt,
  vehicleName,
} from "./vehicleDisplay.js";

/**
 * The fleet's primary object: photo first, then identity, then the numbers
 * the renter is actually comparing.
 *
 * Every number comes from a PricingResult / AvailabilityResult — this
 * component formats them, it never computes them.
 */
export function VehicleCard({ vehicle, quote, availability, category, inclusions = [], className }) {
  const { locale, t } = useLocaleContext();
  const pickLocalized = usePick();
  const journeyLink = useJourneyLink();

  const name = vehicleName(vehicle, locale);
  const href = journeyLink(`/vehicle/${vehicle.id}`);
  const cover = vehicle.media?.[0];
  const state = availability?.state ?? vehicle.availability;
  const cells = specCells(vehicle, locale, t).slice(0, 4);
  const currency = quote?.currency ?? vehicle.pricing?.currency ?? "USD";
  const fmt = (v) => formatMoney(v, { locale: locale === "ar" ? "ar" : "en-US", currency });

  const inclusionLabels = (vehicle.inclusionIds ?? [])
    .map((id) => inclusions.find((inc) => inc.id === id))
    .filter(Boolean)
    .slice(0, 4);

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface",
        "transition-[border-color,box-shadow] duration-[280ms] ease-out",
        "hover:border-line-strong hover:shadow-lift",
        className,
      )}
    >
      <Link
        to={href}
        aria-label={t("card.viewLabel", { name })}
        className="absolute inset-0 z-10 rounded-lg focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent"
      />

      <div className="relative">
        <Picture
          asset={cover}
          alt={vehicleAlt(vehicle, locale, 0)}
          ratio="4 / 3"
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="transition-transform duration-[760ms] ease-out group-hover:scale-[1.02]"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="label-micro rounded-xs bg-canvas/92 px-2 py-1 text-ink backdrop-blur-sm">
            {pickLocalized(category?.name ?? { en: vehicle.categoryId }, locale, vehicle.categoryId)}
          </span>
          <StatusMark tone={state} label={t(availabilityLabelKey(state))} size="sm" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-title-3 font-medium tracking-tight text-ink">
              <span className="pointer-events-none">{name}</span>
            </h3>
            <p className="label-micro mt-1 text-ink-faint" data-keep-mono>
              {[pickLocalized(vehicle.trimName, locale), vehicle.year]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        {/* 2×2, not 4-across: "Transmission"/"Automatic" need ~95px/62px and a
            4-up cell only offers 55–80px at any breakpoint (4-up cards are the
            narrowest). Two columns clear both at 390 → 1920 with room to spare. */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-y border-line py-3">
          {cells.map((cell) => (
            <div key={cell.key} className="min-w-0">
              <dt className="label-micro truncate text-ink-faint">{cell.label}</dt>
              <dd className="mt-0.5 flex items-center gap-1 text-caption font-medium text-ink-soft">
                <Icon name={cell.icon} size={13} className="text-ink-faint" />
                <span className="truncate">{cell.value}</span>
              </dd>
            </div>
          ))}
        </dl>

        {inclusionLabels.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {inclusionLabels.map((inc) => (
              <li
                key={inc.id}
                className="inline-flex items-center gap-1 rounded-xs bg-surface-sunken px-2 py-1 text-caption text-ink-muted"
              >
                <Icon name="check" size={11} className="text-status-open" />
                {pickLocalized(inc.name, locale)}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-auto flex flex-col gap-3 pt-1">
          <div className="flex items-end justify-between gap-3">
            <p className="min-w-0">
              {quote?.hasDates ? (
                <>
                  <span className="block text-caption text-ink-muted">
                    {t("card.perDay")}
                  </span>
                  <span className="block text-title-2 font-medium tracking-tight text-ink">
                    {fmt(quote.discountedDailyRate ?? quote.dailyRate)}
                  </span>
                  <span className="block text-caption text-ink-muted">
                    {t("card.tripTotal")}{" "}
                    <span data-keep-mono className="text-ink-soft">
                      {fmt(quote.total)}
                    </span>{" "}
                    · {t("card.dayCount", { count: quote.days })}
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-caption text-ink-muted">
                    {t("card.from")}
                  </span>
                  <span className="block text-title-2 font-medium tracking-tight text-ink">
                    {fmt(quote?.dailyRate ?? vehicle.pricing.daily)}
                  </span>
                  <span className="block text-caption text-ink-muted">
                    {t("card.perDay")}
                  </span>
                </>
              )}
            </p>

            <span
              aria-hidden="true"
              className="pointer-events-none inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-all duration-[280ms] ease-out group-hover:border-accent group-hover:bg-accent group-hover:text-white"
            >
              <Icon name={locale === "ar" ? "arrowLeft" : "arrowRight"} size={15} />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default VehicleCard;
