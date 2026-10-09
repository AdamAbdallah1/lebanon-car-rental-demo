import { Link } from "react-router-dom";
import { useLocaleContext } from "../i18n/context.js";
import { repositories } from "../lib/repositories/index.js";
import { quoteFleet } from "../lib/pricing/pricingService.js";
import { withAvailability } from "../lib/availability/availabilityService.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { useSearchState } from "../features/search/useSearchState.js";
import FleetReel, { FleetReelSkeleton } from "../features/fleet/FleetReel.jsx";
import { FleetEmptyState, FleetErrorState } from "../features/fleet/FleetStates.jsx";
import Button from "../components/ui/Button.jsx";

/**
 * Homepage fleet showcase — featured vehicles, priced for the current search
 * context (or from a daily rate when no dates are chosen).
 *
 * Four, not six: the reel gives each vehicle a full viewport-height step, so
 * the count is set by how much of the page a person should reasonably scroll
 * through before reaching the rest of the site. `sort: "priceAsc"` then reads
 * as an intentional ladder — city hatchback first, SUV last — and `/fleet`
 * still holds all seventeen.
 *
 * The lead line talks about the *whole* fleet, which is why it can honestly
 * say "from city hatchbacks to long-wheelbase SUVs" while four of them are on
 * screen: the other thirteen are one tap away behind "Browse the full fleet".
 */
/**
 * Evenly sample `count` vehicles across a price-ordered list.
 *
 * The lead line promises "city hatchbacks to long-wheelbase SUVs", and the
 * featured set is sorted cheapest-first — so simply taking the first four
 * would put four small cars on the homepage and never show what the fleet
 * actually is. Sampling across the run gives both endpoints and the road
 * between them: $28 hatchback → $58 sedan → $120 saloon → $220 long-wheelbase
 * SUV. The range *is* the editorial content here.
 *
 * Presentation selection only — no pricing, availability or business rule is
 * expressed by this.
 */
const spread = (list, count) => {
  if (list.length <= count) return list;
  const step = (list.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => list[Math.round(i * step)]);
};

export function FleetShowcase({ limit = 4 }) {
  const { t } = useLocaleContext();
  const { state } = useSearchState();

  const { data, loading, error, reload } = useAsyncData(
    async () => {
      const [featured, categories, blocks, ratePlans, location] =
        await Promise.all([
          // Bounded fetch, then sampled: the reel shows `limit` of them.
          repositories.queryVehicles({ featured: true, sort: "priceAsc", limit: 12 }),
          repositories.queryCategories(),
          repositories.queryAllBlockPeriods(),
          repositories.queryRatePlans(),
          state.locationId ? repositories.getLocationById(state.locationId) : Promise.resolve(null),
        ]);

      const vehicles = spread(featured, limit);

      const quotes = quoteFleet(vehicles, {
        pickupDate: state.pickupDate,
        returnDate: state.returnDate,
        pickupLocation: location,
        ratePlan: ratePlans?.[0] ?? null,
      });

      return {
        items: withAvailability(vehicles, blocks, {
          pickupDate: state.pickupDate,
          returnDate: state.returnDate,
        }).map(({ vehicle, availability }) => ({
          vehicle,
          availability,
          quote: quotes.get(vehicle.id),
          category: categories.find((c) => c.id === vehicle.categoryId) ?? null,
          cover: vehicle.media?.[0] ?? null,
        })),
      };
    },
    [state.locationId, state.pickupDate, state.returnDate],
    { keepPrevious: true },
  );

  return (
    <section id="fleet-showcase" aria-labelledby="fleet-showcase-title" className="section-pad border-b border-line">
      <div className="container-page">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="label-micro mb-3 text-accent">{t("fleet.showcaseTitle")}</p>
            <h2
              id="fleet-showcase-title"
              className="font-display text-display-3 text-ink"
              data-display-font
            >
              {t("fleet.title")}
            </h2>
            <p className="mt-4 text-body-lg text-ink-soft">{t("fleet.showcaseLede")}</p>
          </div>

          <Button as={Link} to="/fleet" variant="secondary" className="shrink-0">
            {t("fleet.browseAll")}
          </Button>
        </div>

        <div className="mt-10">
          {error ? (
            <FleetErrorState onRetry={reload} />
          ) : loading && !data ? (
            <FleetReelSkeleton count={limit} />
          ) : (data?.items?.length ?? 0) === 0 ? (
            <FleetEmptyState />
          ) : (
            <FleetReel items={data.items} />
          )}
        </div>
      </div>
    </section>
  );
}

export default FleetShowcase;
