import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLocaleContext, usePick } from "../i18n/context.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { repositories } from "../lib/repositories/index.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { useSearchState } from "../features/search/useSearchState.js";
import { SEARCH_KEYS } from "../features/search/searchState.js";
import { useFleet } from "../features/fleet/useFleet.js";
import PageHeader from "../components/layout/PageHeader.jsx";
import CategoryChips from "../features/fleet/CategoryChips.jsx";
import VehicleCard from "../features/fleet/VehicleCard.jsx";
import {
  FleetEmptyState,
  FleetErrorState,
  FleetGrid,
  FleetResultsMeta,
  FleetSkeleton,
} from "../features/fleet/FleetStates.jsx";
import Button from "../components/ui/Button.jsx";
import Icon from "../components/ui/Icon.jsx";
import Field from "../components/ui/Field.jsx";
import { formatDate } from "../lib/dates.js";

export function FleetPage() {
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();
  const navigate = useNavigate();
  const { category: categoryParam } = useParams();
  const { state, setState, clear, searchParams } = useSearchState();

  useDocumentMeta({
    title: "The fleet",
    description:
      "Compare economy, family and premium vehicles with real daily rates, deposits and mileage allowances.",
    path: "/fleet",
  });

  // `/fleet/:category` and `/fleet?cat=` are two views of the same filter.
  const category = categoryParam ?? state.category ?? "all";

  const selectCategory = (id) => {
    if (categoryParam) {
      const query = new URLSearchParams(searchParams);
      query.delete("cat");
      const suffix = query.toString();
      const base = id === "all" || id === "sortOrder" ? "/fleet" : `/fleet/${id}`;
      navigate(suffix ? `${base}?${suffix}` : base, { replace: true });
      return;
    }
    setState({ category: id });
  };

  const resetFilters = () => {
    if (categoryParam) {
      const query = new URLSearchParams(searchParams);
      for (const key of Object.keys(SEARCH_KEYS)) query.delete(key);
      const suffix = query.toString();
      navigate(suffix ? `/fleet?${suffix}` : "/fleet", { replace: true });
      return;
    }
    clear();
  };

  const fleet = useFleet({
    category,
    locationId: state.locationId,
    pickupDate: state.pickupDate,
    returnDate: state.returnDate,
    sort: state.sort ?? "sortOrder",
  });

  // Counts per chip come from an unfiltered read so the UI never lies about
  // what a filter would return.
  const { data: unfiltered } = useAsyncData(
    () => repositories.queryVehicles({ locationId: state.locationId || undefined }),
    [state.locationId],
    { keepPrevious: true },
  );

  const counts = useMemo(() => {
    const map = { all: unfiltered?.length ?? 0 };
    for (const v of unfiltered ?? []) {
      map[v.categoryId] = (map[v.categoryId] ?? 0) + 1;
    }
    return map;
  }, [unfiltered]);

  const { data: location } = useAsyncData(
    () => (state.locationId ? repositories.getLocationById(state.locationId) : Promise.resolve(null)),
    [state.locationId],
  );

  const showFilters = Boolean(state.locationId || (state.pickupDate && state.returnDate) || category !== "all");

  return (
    <>
      <PageHeader
        eyebrow={t("nav.fleet")}
        title={t("fleet.title")}
        lede={t("fleet.lede")}
        actions={
          state.pickupDate && state.returnDate ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface px-4 py-3">
              <span className="flex items-center gap-2 text-body-sm text-ink-soft">
                <Icon name="pin" size={14} className="text-accent" />
                {location ? pickLocalized(location.shortName ?? location.name, locale) : "—"}
              </span>
              <span className="h-4 w-px bg-line" aria-hidden="true" />
              <span className="font-mono text-caption text-ink-soft" data-keep-mono>
                {`${formatDate(state.pickupDate, locale)} → ${formatDate(state.returnDate, locale)}`}
              </span>
              <Button variant="quiet" size="sm" onClick={clear}>
                {t("search.clear")}
              </Button>
            </div>
          ) : null
        }
      >
        <div className="mt-8 flex flex-col gap-5">
          <CategoryChips
            categories={fleet.categories}
            value={category}
            counts={counts}
            onChange={selectCategory}
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <FleetResultsMeta shown={fleet.total} total={counts.all} />

            <Field label={t("fleet.sort.label")} id="fleet-sort" className="w-full sm:w-auto">
              {({ id, describedBy }) => (
                <select
                  id={id}
                  aria-describedby={describedBy}
                  value={state.sort ?? "sortOrder"}
                  onChange={(event) => setState({ sort: event.target.value })}
                  className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-body-sm text-ink transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent sm:w-auto"
                >
                  <option value="sortOrder">{t("fleet.sort.name")}</option>
                  <option value="priceAsc">{t("fleet.sort.priceAsc")}</option>
                  <option value="priceDesc">{t("fleet.sort.priceDesc")}</option>
                </select>
              )}
            </Field>
          </div>
        </div>
      </PageHeader>

      <section className="block-pad" aria-label={t("fleet.title")}>
        <div className="container-page">
          {fleet.error ? (
            <FleetErrorState onRetry={fleet.reload} />
          ) : fleet.loading && !fleet.data ? (
            <FleetGrid>
              {Array.from({ length: 6 }).map((_, i) => (
                <FleetSkeleton key={i} />
              ))}
            </FleetGrid>
          ) : fleet.items.length === 0 ? (
            <FleetEmptyState onClear={showFilters ? resetFilters : undefined} />
          ) : (
            <FleetGrid>
              {fleet.items.map(({ vehicle, quote, availability }) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  quote={quote}
                  availability={availability}
                  category={fleet.categories.find((c) => c.id === vehicle.categoryId) ?? null}
                  inclusions={fleet.data?.inclusions ?? []}
                />
              ))}
            </FleetGrid>
          )}
        </div>
      </section>
    </>
  );
}

export default FleetPage;
