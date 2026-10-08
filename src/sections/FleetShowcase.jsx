import { Link } from "react-router-dom";
import { useLocaleContext } from "../i18n/context.js";
import { repositories } from "../lib/repositories/index.js";
import { quoteFleet } from "../lib/pricing/pricingService.js";
import { withAvailability } from "../lib/availability/availabilityService.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { useSearchState } from "../features/search/useSearchState.js";
import VehicleCard from "../features/fleet/VehicleCard.jsx";
import {
  FleetEmptyState,
  FleetErrorState,
  FleetGrid,
  FleetSkeleton,
} from "../features/fleet/FleetStates.jsx";
import Button from "../components/ui/Button.jsx";

/**
 * Homepage fleet showcase — featured vehicles, priced for the current search
 * context (or from a daily rate when no dates are chosen).
 */
export function FleetShowcase({ limit = 6 }) {
  const { t } = useLocaleContext();
  const { state } = useSearchState();

  const { data, loading, error, reload } = useAsyncData(
    async () => {
      const [vehicles, categories, blocks, ratePlans, location, inclusions] =
        await Promise.all([
          repositories.queryVehicles({ featured: true, sort: "priceAsc", limit }),
          repositories.queryCategories(),
          repositories.queryAllBlockPeriods(),
          repositories.queryRatePlans(),
          state.locationId ? repositories.getLocationById(state.locationId) : Promise.resolve(null),
          repositories.queryInclusions(),
        ]);

      const quotes = quoteFleet(vehicles, {
        pickupDate: state.pickupDate,
        returnDate: state.returnDate,
        pickupLocation: location,
        ratePlan: ratePlans?.[0] ?? null,
      });

      return {
        inclusions,
        categories,
        items: withAvailability(vehicles, blocks, {
          pickupDate: state.pickupDate,
          returnDate: state.returnDate,
        }).map(({ vehicle, availability }) => ({
          vehicle,
          availability,
          quote: quotes.get(vehicle.id),
          category: categories.find((c) => c.id === vehicle.categoryId) ?? null,
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
            <FleetGrid>
              {Array.from({ length: limit }).map((_, i) => (
                <FleetSkeleton key={i} />
              ))}
            </FleetGrid>
          ) : (data?.items?.length ?? 0) === 0 ? (
            <FleetEmptyState />
          ) : (
            <>
              <FleetGrid>
                {data.items.map(({ vehicle, quote, availability, category }) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    quote={quote}
                    availability={availability}
                    category={category}
                    inclusions={data.inclusions}
                  />
                ))}
              </FleetGrid>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default FleetShowcase;
