import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { cn } from "../lib/cn.js";
import { useLocaleContext, usePick } from "../i18n/context.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { repositories } from "../lib/repositories/index.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { useSearchState } from "../features/search/useSearchState.js";
import { fleetHref } from "../features/search/searchState.js";
import { quoteVehicle } from "../lib/pricing/pricingService.js";
import { getAvailability } from "../lib/availability/availabilityService.js";
import { formatMoney } from "../lib/money.js";
import { fullSpecCells, vehicleAlt } from "../features/fleet/vehicleDisplay.js";
import Gallery from "../features/vehicle/Gallery.jsx";
import { BookingRail, PriceSummary } from "../features/vehicle/BookingRail.jsx";
import VehicleCard from "../features/fleet/VehicleCard.jsx";
import Button from "../components/ui/Button.jsx";
import Icon from "../components/ui/Icon.jsx";
import StatusMark from "../components/ui/StatusMark.jsx";
import { FleetSkeleton, FleetGrid } from "../features/fleet/FleetStates.jsx";

const SECTIONS = [
  { id: "overview", key: "vehicle.overview" },
  { id: "specs", key: "vehicle.specs" },
  { id: "pricing", key: "vehicle.pricing" },
  { id: "inclusions", key: "vehicle.inclusions" },
  { id: "conditions", key: "vehicle.conditions" },
  { id: "terms", key: "vehicle.terms" },
];

function SectionHeading({ id, children }) {
  return (
    <h2
      id={`${id}-title`}
      className="font-display text-display-3 text-ink"
      data-display-font
    >
      {children}
    </h2>
  );
}

export function VehiclePage() {
  const { id } = useParams();
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();
  const { state } = useSearchState();
  const [activeSection, setActiveSection] = useState("overview");
  // Returning to the fleet must land on the same search, not an empty one.
  const fleetBack = fleetHref(state);

  const { data, loading, error, reload } = useAsyncData(
    async () => {
      const [vehicle, categories, blocks, ratePlans, location, inclusions, terms] =
        await Promise.all([
          repositories.getVehicleById(id),
          repositories.queryCategories(),
          repositories.queryAllBlockPeriods(),
          repositories.queryRatePlans(),
          state.locationId ? repositories.getLocationById(state.locationId) : Promise.resolve(null),
          repositories.queryInclusions(),
          repositories.getRentalTerms(),
        ]);

      if (!vehicle) return { vehicle: null };

      const quote = quoteVehicle(vehicle, {
        pickupDate: state.pickupDate,
        returnDate: state.returnDate,
        pickupLocation: location,
        ratePlan: ratePlans?.[0] ?? null,
      });

      const availability = getAvailability({
        vehicle,
        blocks,
        range: { pickupDate: state.pickupDate, returnDate: state.returnDate },
      });

      const similar = await repositories.queryVehicles({
        categoryId: vehicle.categoryId,
        limit: 4,
      });

      return {
        vehicle,
        quote,
        availability,
        terms,
        inclusions,
        location,
        category: categories.find((c) => c.id === vehicle.categoryId) ?? null,
        similar: similar.filter((v) => v.id !== vehicle.id).slice(0, 3),
      };
    },
    [id, state.locationId, state.pickupDate, state.returnDate],
    { keepPrevious: true },
  );

  const vehicle = data?.vehicle ?? null;

  useDocumentMeta({
    title: vehicle ? pickLocalized(vehicle.name, locale) : "Vehicle",
    description: vehicle
      ? pickLocalized(vehicle.description, locale).slice(0, 155)
      : undefined,
    path: `/vehicle/${id}`,
  });

  // Sticky section nav: highlight the section in view.
  useEffect(() => {
    if (!vehicle) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.25, 0.5] },
    );
    for (const section of SECTIONS) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [vehicle]);

  if (loading && !data) {
    return (
      <div className="container-page block-pad">
        <div className="mb-6 h-4 w-40 animate-pulse rounded-xs bg-surface-sunken" />
        <div className="aspect-[3/2] w-full animate-pulse rounded-lg bg-surface-sunken" />
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <FleetSkeleton />
          <FleetSkeleton />
          <FleetSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page block-pad">
        <div
          role="alert"
          className="rounded-lg border border-status-closed/30 bg-status-closed-soft px-6 py-16 text-center"
        >
          <h1 className="text-title-2 text-ink">{t("vehicle.error.title")}</h1>
          <p className="mt-2 text-body-sm text-ink-soft">{t("vehicle.error.body")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="secondary" onClick={reload}>
              {t("states.retry")}
            </Button>
            <Button as={Link} to={fleetBack} variant="quiet">
              {t("vehicle.notFound.action")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="container-page block-pad text-center">
        <h1 className="text-display-3 font-display text-ink" data-display-font>
          {t("vehicle.notFound.title")}
        </h1>
        <p className="mt-3 text-body text-ink-muted">{t("vehicle.notFound.body")}</p>
        <Button as={Link} to={fleetBack} className="mt-6">
          {t("vehicle.notFound.action")}
        </Button>
      </div>
    );
  }

  const quote = data.quote;
  const availability = data.availability;
  const name = pickLocalized(vehicle.name, locale);
  const trim = pickLocalized(vehicle.trimName, locale);
  const description = pickLocalized(vehicle.description, locale);
  const specs = fullSpecCells(vehicle, locale, t);
  const currency = quote?.currency ?? vehicle.pricing.currency;
  const money = (v) => formatMoney(v, { locale: locale === "ar" ? "ar" : "en-US", currency });
  const inclusions = (vehicle.inclusionIds ?? [])
    .map((incId) => (data.inclusions ?? []).find((i) => i.id === incId))
    .filter(Boolean);

  return (
    <>
      {/* ---- breadcrumb + gallery ---- */}
      <div className="container-page pt-6">
        <nav aria-label={t("nav.breadcrumb")}>
          <ol className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
            <li>
              <Link
                to={fleetBack}
                className="inline-flex min-h-11 items-center gap-1.5 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Icon name={locale === "ar" ? "arrowRight" : "arrowLeft"} size={13} />
                {t("vehicle.back")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink-soft">{name}</li>
          </ol>
        </nav>
      </div>

      <div className="container-page pt-6">
        <Gallery
          media={vehicle.media ?? []}
          altFor={(asset, i) => vehicleAlt(vehicle, locale, i)}
          label={`${name} — ${t("vehicle.gallery")}`}
        />
      </div>

      {/* ---- sticky section nav ---- */}
      <nav
        aria-label={t("vehicle.sticky.nav")}
        className="sticky top-[var(--header-h-mobile)] z-sticky mt-6 border-y border-line bg-canvas/95 backdrop-blur-md lg:top-[var(--header-h)]"
      >
        <div className="container-page">
          <ul className="scroll-none -mx-[var(--spacing-gutter)] flex gap-5 overflow-x-auto px-[var(--spacing-gutter)]">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={activeSection === section.id ? "true" : undefined}
                  className={cn(
                    "inline-flex min-h-12 min-w-11 items-center whitespace-nowrap border-b-2 text-body-sm transition-colors duration-[180ms]",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                    activeSection === section.id
                      ? "border-accent text-ink"
                      : "border-transparent text-ink-muted hover:text-ink",
                  )}
                >
                  {t(section.key)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* ---- body ---- */}
      <div className="container-page grid grid-cols-1 gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12 lg:py-14">
        <div className="min-w-0">
          {/* identity */}
          <section id="overview" className="scroll-mt-32" aria-labelledby="overview-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="label-micro text-accent">
                  {data.category ? pickLocalized(data.category.name, locale) : vehicle.categoryId}
                </p>
                <h1
                  id="overview-title"
                  className="mt-2 font-display text-display-2 text-ink"
                  data-display-font
                >
                  {name}
                </h1>
                <p className="label-micro mt-2 text-ink-muted" data-keep-mono>
                  {[trim, vehicle.year].filter(Boolean).join(" · ")}
                </p>
              </div>
              <StatusMark
                tone={availability.state}
                label={t(
                  availability.state === "unavailable"
                    ? "card.availability.unavailable"
                    : availability.state === "limited"
                      ? "card.availability.limited"
                      : "card.availability.available",
                )}
              />
            </div>

            <p className="mt-5 max-w-2xl text-body-lg leading-relaxed text-ink-soft">
              {description}
            </p>

            {/* mobile price block */}
            <div className="mt-6 rounded-lg border border-line bg-surface p-5 lg:hidden">
              <PriceSummary
                vehicle={vehicle}
                quote={quote}
                availabilityState={availability.state}
              />
            </div>
          </section>

          {/* specs */}
          <section id="specs" className="mt-12 scroll-mt-32" aria-labelledby="specs-title">
            <SectionHeading id="specs">{t("vehicle.specs")}</SectionHeading>
            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
              {specs.map((cell) => (
                <div key={cell.key} className="bg-surface p-4">
                  <dt className="label-micro text-ink-faint">{cell.label}</dt>
                  <dd className="mt-1.5 flex items-center gap-2 text-body-sm font-medium text-ink">
                    <Icon name={cell.icon} size={15} className="text-accent" />
                    {cell.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* pricing */}
          <section id="pricing" className="mt-12 scroll-mt-32" aria-labelledby="pricing-title">
            <SectionHeading id="pricing">{t("vehicle.pricing")}</SectionHeading>
            <div className="mt-6 hidden rounded-lg border border-line bg-surface p-5 lg:block">
              <PriceSummary
                vehicle={vehicle}
                quote={quote}
                availabilityState={availability.state}
              />
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
              <div className="bg-surface p-4">
                <dt className="label-micro text-ink-faint">{t("pricing.deposit")}</dt>
                <dd className="mt-1.5 font-mono text-title-3 text-ink" data-keep-mono>
                  {money(vehicle.deposit)}
                </dd>
              </div>
              <div className="bg-surface p-4">
                <dt className="label-micro text-ink-faint">{t("spec.mileage")}</dt>
                <dd className="mt-1.5 font-mono text-title-3 text-ink" data-keep-mono>
                  {t("pricing.mileageIncluded", { count: vehicle.mileage.includedPerDayKm })}
                </dd>
              </div>
              <div className="bg-surface p-4">
                <dt className="label-micro text-ink-faint">{t("spec.insurance")}</dt>
                <dd className="mt-1.5 font-mono text-title-3 text-ink" data-keep-mono>
                  {money(vehicle.insurance.excess)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-caption text-ink-muted">
              {t("pricing.mileageOverage", { amount: money(vehicle.mileage.overagePerKm) })}
              {" · "}
              {t("pricing.vat")}
            </p>
          </section>

          {/* inclusions */}
          <section
            id="inclusions"
            className="mt-12 scroll-mt-32"
            aria-labelledby="inclusions-title"
          >
            <SectionHeading id="inclusions">{t("inclusions.title")}</SectionHeading>
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {inclusions.map((inc) => (
                <li
                  key={inc.id}
                  className="flex items-start gap-3 rounded-md border border-line bg-surface p-3.5 text-body-sm text-ink-soft"
                >
                  <span className="mt-0.5 inline-flex size-5 items-center justify-center rounded-full bg-status-open-soft text-status-open">
                    <Icon name="check" size={12} strokeWidth={2} />
                  </span>
                  {pickLocalized(inc.name, locale)}
                </li>
              ))}
            </ul>
          </section>

          {/* conditions */}
          <section
            id="conditions"
            className="mt-12 scroll-mt-32"
            aria-labelledby="conditions-title"
          >
            <SectionHeading id="conditions">{t("conditions.title")}</SectionHeading>
            <ul className="mt-6 flex flex-col gap-3">
              {[
                "conditions.age",
                "conditions.licence",
                "conditions.deposit",
                "conditions.mileage",
                "conditions.crossBorder",
                "conditions.payment",
              ].map((key) => (
                <li
                  key={key}
                  className="flex items-start gap-3 border-b border-line pb-3 text-body-sm text-ink-soft last:border-0"
                >
                  <Icon name="info" size={15} className="mt-0.5 shrink-0 text-accent" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </section>

          {/* terms */}
          <section id="terms" className="mt-12 scroll-mt-32" aria-labelledby="terms-title">
            <SectionHeading id="terms">{t("vehicle.terms")}</SectionHeading>
            <p className="mt-4 max-w-2xl text-body-sm text-ink-muted">
              {data.terms ? pickLocalized(data.terms.introduction, locale) : null}
            </p>
            <div className="mt-5 flex flex-col gap-4">
              {(data.terms?.sections ?? []).map((section) => (
                <div key={section.id} className="border-b border-line pb-4 last:border-0">
                  <h3 className="text-title-3 font-medium text-ink">{t(section.titleKey)}</h3>
                  <p className="mt-2 max-w-2xl text-body-sm leading-relaxed text-ink-muted">
                    {pickLocalized(section.body, locale)}
                  </p>
                </div>
              ))}
            </div>
            <Button as={Link} to="/rental-terms" variant="link" className="mt-4 px-0">
              {t("nav.terms")}
            </Button>
          </section>

          {/* similar */}
          <section className="mt-14 scroll-mt-32" aria-labelledby="similar-title">
            <SectionHeading id="similar">{t("vehicle.similar")}</SectionHeading>
            <div className="mt-6">
              <FleetGrid wide={false}>
                {(data.similar ?? []).map((similar) => (
                  <VehicleCard
                    key={similar.id}
                    vehicle={similar}
                    quote={quoteVehicle(similar, {
                      pickupDate: state.pickupDate,
                      returnDate: state.returnDate,
                      pickupLocation: data.location,
                      ratePlan: null,
                    })}
                    availability={getAvailability({
                      vehicle: similar,
                      blocks: [],
                      range: { pickupDate: state.pickupDate, returnDate: state.returnDate },
                    })}
                    category={data.category}
                    inclusions={data.inclusions}
                  />
                ))}
              </FleetGrid>
            </div>
          </section>
        </div>

        {/* desktop sticky rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-h)+4rem)] flex flex-col gap-5 rounded-lg border border-line bg-surface p-5">
            <PriceSummary
              vehicle={vehicle}
              quote={quote}
              availabilityState={availability.state}
            />
            <BookingRail
              vehicle={vehicle}
              quote={quote}
              availabilityState={availability.state}
            />
          </div>
        </aside>
      </div>

      {/* mobile sticky booking bar */}
      <div className="sticky bottom-0 z-sticky border-t border-line bg-canvas/96 px-[var(--spacing-gutter)] py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto max-w-[var(--container-max)]">
          <BookingRail
            vehicle={vehicle}
            quote={quote}
            availabilityState={availability.state}
            compact
          />
        </div>
      </div>

    </>
  );
}

export default VehiclePage;
