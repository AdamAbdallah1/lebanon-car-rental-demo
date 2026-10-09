import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useLocaleContext, usePick } from "../i18n/context.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { repositories } from "../lib/repositories/index.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { useJourneyLink } from "../features/search/useJourneyLink.js";
import { useSearchState } from "../features/search/useSearchState.js";
import { formatMoney } from "../lib/money.js";
import PageHeader from "../components/layout/PageHeader.jsx";
import Button from "../components/ui/Button.jsx";
import Icon from "../components/ui/Icon.jsx";
import { FleetGrid } from "../features/fleet/FleetStates.jsx";
import VehicleCard from "../features/fleet/VehicleCard.jsx";
import { quoteVehicle } from "../lib/pricing/pricingService.js";
import { withAvailability } from "../lib/availability/availabilityService.js";

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-line py-3 last:border-b-0">
      <dt className="text-body-sm text-ink-muted">{label}</dt>
      <dd className="text-right text-body-sm text-ink" data-keep-mono>
        {value}
      </dd>
    </div>
  );
}

export function LocationDetailPage() {
  const { locationId } = useParams();
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();
  const journeyLink = useJourneyLink();
  const { state: searchState } = useSearchState();

  const { data: location, loading, error, reload } = useAsyncData(
    () => repositories.getLocationById(locationId),
    [locationId],
  );

  // What can actually be collected here, plus the seeded handover guidance
  // that applies to this kind of point. Both come from the repository — no
  // page-level data access and no invented instructions.
  const { data: onsite } = useAsyncData(
    async () => {
      const [vehicles, blocks, categories, services, ratePlans] = await Promise.all([
        repositories.queryVehicles({ locationId }),
        repositories.queryAllBlockPeriods(),
        repositories.queryCategories(),
        repositories.getServices(),
        repositories.queryRatePlans(),
      ]);
      return { vehicles, blocks, categories, services, ratePlan: ratePlans?.[0] ?? null };
    },
    [locationId],
    { keepPrevious: true },
  );

  // Priced with the renter's own dates when they travelled here with the
  // journey, so the figures match the fleet and the request form.
  const onsiteItems = useMemo(() => {
    if (!onsite) return [];
    const range =
      searchState.pickupDate && searchState.returnDate
        ? { pickupDate: searchState.pickupDate, returnDate: searchState.returnDate }
        : {};
    return withAvailability(onsite.vehicles, onsite.blocks, range).map(
      ({ vehicle, availability }) => ({
        vehicle,
        availability,
        quote: quoteVehicle(vehicle, {
          pickupDate: range.pickupDate ?? null,
          returnDate: range.returnDate ?? null,
          pickupLocation: location ?? null,
          ratePlan: onsite.ratePlan,
        }),
      }),
    );
  }, [onsite, location, searchState.pickupDate, searchState.returnDate]);

  useDocumentMeta({
    title: location
      ? pickLocalized(location.shortName ?? location.name, locale)
      : "Location",
    description: location
      ? pickLocalized(location.address, locale)
      : "Pick-up and return point.",
    path: `/locations/${locationId ?? ""}`,
  });

  if (error) {
    return (
      <section className="block-pad">
        <div className="container-page">
          <div role="alert" className="rounded-lg border border-status-closed/30 bg-status-closed-soft px-6 py-16 text-center">
            <p className="text-title-2 text-ink">{t("locations.error.title")}</p>
            <p className="mt-2 text-body-sm text-ink-soft">{t("locations.error.body")}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-6 min-h-11 rounded-md border border-ink px-5 font-mono text-body-sm text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {t("states.retry")}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (loading && !location) {
    return (
      <section className="block-pad" aria-busy="true" aria-live="polite">
        <div className="container-page flex flex-col gap-6">
          <div className="h-10 w-64 animate-pulse rounded bg-surface-sunken" />
          <div className="h-40 w-full animate-pulse rounded-lg bg-surface-sunken" />
          <span className="sr-only">{t("states.loading")}</span>
        </div>
      </section>
    );
  }

  if (!location) {
    return (
      <section className="block-pad">
        <div className="container-page py-16 text-center">
          <p className="font-display text-display-2 text-ink" data-display-font>
            {t("locations.notFound.title")}
          </p>
          <Link
            to="/locations"
            className="mt-6 inline-flex min-h-11 items-center rounded-md border border-ink px-5 font-mono text-body-sm text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t("nav.locations")}
          </Link>
        </div>
      </section>
    );
  }

  const name = pickLocalized(location.shortName ?? location.name, locale);
  const fee = location.serviceFee ?? 0;

  // Seeded handover guidance that matches this kind of point. City and
  // office points have no authored guidance, so none is shown rather than
  // inventing instructions.
  const guidanceServiceId = location.deliveryOnly
    ? "delivery"
    : location.type === "airport"
      ? "airport-meet"
      : null;
  const guidance = guidanceServiceId
    ? ((onsite?.services ?? []).find((service) => service.id === guidanceServiceId) ?? null)
    : null;

  return (
    <>
      <PageHeader
        eyebrow={t(`locations.group.${location.group}`)}
        title={name}
        lede={pickLocalized(location.address, locale)}
        actions={
          <Button
            as={Link}
            to={journeyLink(`/fleet?loc=${encodeURIComponent(location.id)}`)}
            variant="primary"
          >
            {t("search.submit")}
            <Icon name={locale === "ar" ? "arrowLeft" : "arrowRight"} size={15} />
          </Button>
        }
      />

      <section className="block-pad" aria-label={name}>
        <div className="container-page grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-6">
            <h2 className="text-title-1 font-medium text-ink">{t("locations.details")}</h2>

            <p className="max-w-2xl font-display text-display-3 leading-snug text-ink" data-display-font>
              {pickLocalized(location.name, locale)}
            </p>

            <p className="max-w-2xl text-body-lg leading-relaxed text-ink-soft">
              {pickLocalized(location.address, locale)}
            </p>

            <dl className="rounded-lg border border-line bg-surface">
              <DetailRow label={t("locations.area")} value={pickLocalized(location.area, locale)} />
              <DetailRow label={t("locations.hours")} value={`${location.hours.open} – ${location.hours.close} · ${location.hours.days}`} />
              <DetailRow
                label={t("locations.fee")}
                value={
                  fee > 0
                    ? `+${formatMoney(fee, { locale: locale === "ar" ? "ar" : "en-US" })}`
                    : t("locations.free")
                }
              />
              <DetailRow label={t("spec.availability")} value={location.status === "active" ? t("card.availability.available") : t("card.availability.unavailable")} />
              <DetailRow
                label={t("locations.flag.counter")}
                value={location.deliveryOnly ? t("locations.flag.deliveryOnly") : t("locations.flag.counterPresent")}
              />
              <DetailRow
                label={t("locations.flag.return")}
                value={location.allowsDifferentReturn ? t("locations.flag.returnDiff") : t("locations.flag.returnSame")}
              />
            </dl>

            {guidance ? (
              <section aria-labelledby="location-guidance" className="rounded-lg border border-line bg-surface p-5">
                <h2 id="location-guidance" className="text-title-3 font-medium text-ink">
                  {t("locations.guidance")}
                </h2>
                <p className="mt-2 flex items-start gap-2.5 text-body-sm leading-relaxed text-ink-soft">
                  <Icon name="info" size={15} className="mt-0.5 shrink-0 text-accent" />
                  <span>{pickLocalized(guidance.body, locale)}</span>
                </p>
                <p className="mt-3 text-caption text-ink-muted">
                  {t("locations.guidance.confirm")}
                </p>
              </section>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Link
                to={journeyLink(`/fleet?loc=${encodeURIComponent(location.id)}`)}
                className="inline-flex min-h-12 items-center gap-2 rounded-md bg-accent px-5 font-mono text-body-sm text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {t("locations.pickup")}
                <Icon name={locale === "ar" ? "arrowLeft" : "arrowRight"} size={15} />
              </Link>
              <Link
                to="/locations"
                className="inline-flex min-h-12 items-center rounded-md border border-ink px-5 font-mono text-body-sm text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {t("nav.locations")}
              </Link>
            </div>
          </div>

          <aside className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
            <h2 className="text-title-3 font-medium text-ink">{t("contact.title")}</h2>
            <p className="text-body-sm text-ink-soft">{t("locations.lede")}</p>
            <ul className="mt-2 flex flex-col gap-3">
              <li className="flex items-center gap-3 text-body-sm text-ink">
                <Icon name="mail" size={15} className="text-accent" />
                <a
                  href="mailto:hello@cedarsdrive.example"
                  className="inline-flex min-h-11 items-center underline decoration-line underline-offset-4 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  hello@cedarsdrive.example
                </a>
              </li>
              <li className="flex items-center gap-3 text-body-sm text-ink">
                <Icon name="whatsapp" size={15} className="text-accent" />
                <a
                  href="https://wa.me/96171000000"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center underline decoration-line underline-offset-4 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  +961 71 000 000
                </a>
                <span className="sr-only">{t("a11y.openInNewTab")}</span>
              </li>
            </ul>

            <p className="mt-4 border-t border-line pt-4 text-caption text-ink-muted">
              {t("demo.notice")}
            </p>
          </aside>
        </div>
      </section>

      <section className="block-pad border-t border-line" aria-labelledby="location-fleet">
        <div className="container-page">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2
              id="location-fleet"
              className="font-display text-display-3 text-ink"
              data-display-font
            >
              {t("locations.vehicles.title")}
            </h2>
            <p className="label-micro text-ink-faint" data-keep-mono>
              {t("fleet.filter.count", { count: onsiteItems.length })}
            </p>
          </div>

          <p className="mt-3 max-w-2xl text-body-sm leading-relaxed text-ink-muted">
            {searchState.pickupDate && searchState.returnDate
              ? t("locations.vehicles.forDates")
              : t("locations.vehicles.lede")}
          </p>

          {onsiteItems.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-line-strong bg-surface-sunken px-6 py-12 text-center">
              <p className="text-title-3 font-medium text-ink">
                {t("locations.vehicles.empty.title")}
              </p>
              <p className="mx-auto mt-2 max-w-md text-body-sm text-ink-soft">
                {t("locations.vehicles.empty.body")}
              </p>
            </div>
          ) : (
            <>
              <FleetGrid className="mt-6">
                {onsiteItems.slice(0, 8).map(({ vehicle, quote, availability }) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    quote={quote}
                    availability={availability}
                    category={
                      onsite?.categories.find((c) => c.id === vehicle.categoryId) ?? null
                    }
                    inclusions={[]}
                  />
                ))}
              </FleetGrid>

              {onsiteItems.length > 8 ? (
                <div className="mt-6">
                  <Link
                    to={journeyLink(`/fleet?loc=${encodeURIComponent(location.id)}`)}
                    className="inline-flex min-h-11 items-center gap-2 font-mono text-body-sm text-ink transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {t("locations.vehicles.all", { count: onsiteItems.length })}
                    <Icon name={locale === "ar" ? "arrowLeft" : "arrowRight"} size={15} />
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default LocationDetailPage;
