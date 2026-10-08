import { repositories } from "../../lib/repositories/index.js";
import { quoteFleet } from "../../lib/pricing/pricingService.js";
import { withAvailability } from "../../lib/availability/availabilityService.js";
import { useAsyncData } from "../../hooks/useAsyncData.js";

/**
 * Fleet feature hook.
 *
 * Loads vehicles/categories/blocks/rate plan from the repository, runs them
 * through the pricing and availability services, and hands the UI ready-made
 * results. Components render; they do not fetch, price or decide availability.
 */
export function useFleet({ category = "all", locationId = null, pickupDate = null, returnDate = null, sort = "sortOrder", limit = null } = {}) {
  const key = `${category}|${locationId}|${sort}|${limit ?? ""}`;

  const result = useAsyncData(
    async () => {
      const [vehicles, categories, blocks, ratePlans, pickupLocation, inclusions] =
        await Promise.all([
          repositories.queryVehicles({
            categoryId: category,
            locationId: locationId || undefined,
            sort,
            limit: limit ?? undefined,
          }),
          repositories.queryCategories(),
          repositories.queryAllBlockPeriods(),
          repositories.queryRatePlans(),
          locationId ? repositories.getLocationById(locationId) : Promise.resolve(null),
          repositories.queryInclusions(),
        ]);

      const ratePlan = ratePlans?.[0] ?? null;
      const range =
        pickupDate && returnDate ? { pickupDate, returnDate } : {};

      const quotes = quoteFleet(vehicles, {
        pickupDate,
        returnDate,
        pickupLocation,
        ratePlan,
      });

      const withState = withAvailability(vehicles, blocks, range);

      return {
        categories,
        inclusions,
        ratePlan,
        pickupLocation,
        items: withState.map(({ vehicle, availability }) => ({
          vehicle,
          quote: quotes.get(vehicle.id),
          availability,
        })),
      };
    },
    [key, pickupDate, returnDate],
    { keepPrevious: true },
  );

  return {
    ...result,
    items: result.data?.items ?? [],
    categories: result.data?.categories ?? [],
    total: result.data?.items?.length ?? 0,
  };
}
