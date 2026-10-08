import { Link } from "react-router-dom";
import { useLocaleContext, usePick } from "../i18n/context.js";
import { repositories } from "../lib/repositories/index.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import Icon from "../components/ui/Icon.jsx";
import { formatMoney } from "../lib/money.js";
import { lowestServiceFee } from "../lib/pricing/locationFees.js";

const GROUP_ICON = {
  airports: "plane",
  cities: "pin",
  offices: "building",
  delivery: "route",
};

/** Pick-up points by group — the same data the hero picker uses. */
export function LocationStrip() {
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();

  const { data, loading, error, reload } = useAsyncData(
    () =>
      Promise.all([
        repositories.queryLocations(),
        repositories.getLocationGroups(),
      ]).then(([locations, groups]) => ({ locations, groups })),
    [],
  );

  if (error) {
    return (
      <section className="border-b border-line py-10" aria-label={t("locations.title")}>
        <div className="container-page">
          <div
            role="alert"
            className="rounded-lg border border-status-closed/30 bg-status-closed-soft px-5 py-8"
          >
            <p className="text-body font-medium text-ink">{t("locations.error.title")}</p>
            <p className="mt-1.5 text-body-sm text-ink-soft">{t("locations.error.body")}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 min-h-11 rounded-md border border-ink px-5 font-mono text-body-sm text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {t("states.retry")}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="location-strip-title" className="border-b border-line py-12 lg:py-16">
      <div className="container-page">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-micro mb-3 text-accent">{t("locations.title")}</p>
            <h2 id="location-strip-title" className="font-display text-display-3 text-ink" data-display-font>
              {t("search.pickupLocation")}
            </h2>
          </div>
          <Link
            to="/locations"
            className="inline-flex min-h-11 items-center gap-2 text-body-sm text-ink-soft transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t("nav.locations")}
            <Icon name={locale === "ar" ? "arrowLeft" : "arrowRight"} size={15} />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {loading && !data
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={`group-skeleton-${i}`} className="flex flex-col gap-3 bg-surface p-5">
                  <div className="h-4 w-1/2 animate-pulse rounded-xs bg-surface-sunken" />
                  <ul className="flex flex-col gap-2">
                    {Array.from({ length: 3 }).map((__, j) => (
                      <li
                        key={`row-skeleton-${j}`}
                        className="h-4 w-2/3 animate-pulse rounded-xs bg-surface-sunken"
                      />
                    ))}
                  </ul>
                </div>
              ))
            : (data?.groups ?? []).map((group) => {
            const items = (data?.locations ?? []).filter((l) => l.group === group.id);
            const fee = lowestServiceFee(items);
            return (
              <div key={group.id} className="flex flex-col gap-3 bg-surface p-5">
                <div className="flex items-center gap-2 text-accent">
                  <Icon name={GROUP_ICON[group.id] ?? "pin"} size={16} />
                  <span className="label-micro">{t(`locations.group.${group.id}`)}</span>
                </div>
                <ul className="flex flex-col gap-2">
                  {loading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <li key={i} className="h-4 w-2/3 animate-pulse rounded-xs bg-surface-sunken" />
                      ))
                    : items.map((loc) => (
                        <li key={loc.id}>
                          <Link
                            to={`/locations/${loc.id}`}
                            className="inline-flex min-h-11 items-center justify-between gap-2 text-body-sm text-ink-soft transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                          >
                            <span className="truncate">
                              {pickLocalized(loc.shortName ?? loc.name, locale)}
                            </span>
                            {loc.code ? (
                              <span className="label-micro text-ink-faint" data-keep-mono>
                                {loc.code}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                </ul>
                <p className="mt-auto border-t border-line pt-3 text-caption text-ink-muted">
                  {fee > 0
                    ? `${t("locations.fee")} ${formatMoney(fee, {
                        locale: locale === "ar" ? "ar" : "en-US",
                      })}`
                    : t("locations.free")}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default LocationStrip;
