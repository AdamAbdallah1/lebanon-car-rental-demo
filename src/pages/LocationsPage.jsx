import { Link } from "react-router-dom";
import { useLocaleContext, usePick } from "../i18n/context.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { repositories } from "../lib/repositories/index.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { useSearchState } from "../features/search/useSearchState.js";
import PageHeader from "../components/layout/PageHeader.jsx";
import Icon from "../components/ui/Icon.jsx";
import { formatMoney } from "../lib/money.js";

const GROUP_ICON = {
  airports: "plane",
  cities: "pin",
  offices: "building",
  delivery: "route",
};

const GROUP_ORDER = ["airports", "cities", "offices", "delivery"];

export function LocationsPage() {
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();
  const { setState } = useSearchState();

  useDocumentMeta({
    title: "Pick-up and return locations",
    description:
      "Beirut airport, city offices and delivery points for picking up and returning your rental car in Lebanon.",
    path: "/locations",
  });

  const { data, loading, error, reload } = useAsyncData(
    () =>
      Promise.all([
        repositories.queryLocations(),
        repositories.getLocationGroups(),
      ]).then(([locations, groups]) => ({ locations, groups })),
    [],
  );

  const groups = GROUP_ORDER.map((id) => ({
    id,
    items: (data?.locations ?? []).filter((l) => l.group === id),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <PageHeader
        eyebrow={t("nav.locations")}
        title={t("locations.title")}
        lede={t("locations.lede")}
      />

      <section className="block-pad" aria-label={t("locations.title")}>
        <div className="container-page flex flex-col gap-12">
          {error ? (
            <div role="alert" className="rounded-lg border border-status-closed/30 bg-status-closed-soft px-6 py-14 text-center">
              <p className="text-title-2 text-ink">{t("locations.error.title")}</p>
              <p className="mx-auto mt-2 max-w-md text-body-sm text-ink-soft">
                {t("locations.error.body")}
              </p>
              <button
                type="button"
                onClick={reload}
                className="mt-6 min-h-11 rounded-md border border-ink px-5 font-mono text-body-sm text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {t("states.retry")}
              </button>
            </div>
          ) : loading && !data ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 w-full animate-pulse rounded-lg border border-line bg-surface-sunken" />
            ))
          ) : (
            groups.map((group) => (
              <section key={group.id} aria-labelledby={`group-${group.id}`}>
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-full border border-accent-line bg-accent-soft text-accent">
                    <Icon name={GROUP_ICON[group.id] ?? "pin"} size={16} />
                  </span>
                  <h2
                    id={`group-${group.id}`}
                    className="font-display text-display-3 text-ink"
                    data-display-font
                  >
                    {t(`locations.group.${group.id}`)}
                  </h2>
                  <span className="h-px flex-1 bg-line" aria-hidden="true" />
                  <span className="label-micro text-ink-faint" data-keep-mono>
                    {String(group.items.length).padStart(2, "0")}
                  </span>
                </div>

                <ul className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((loc) => (
                    <li key={loc.id} className="flex flex-col gap-3 bg-surface p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-title-3 font-medium text-ink">
                            {pickLocalized(loc.shortName ?? loc.name, locale)}
                          </h3>
                          <p className="label-micro mt-1 text-ink-faint" data-keep-mono>
                            {loc.code}
                          </p>
                        </div>
                        <span
                          className={
                            loc.serviceFee > 0
                              ? "label-micro whitespace-nowrap rounded-pill border border-line bg-surface-sunken px-2.5 py-1 text-ink-soft"
                              : "label-micro whitespace-nowrap rounded-pill border border-status-open/25 bg-status-open-soft px-2.5 py-1 text-status-open"
                          }
                        >
                          {loc.serviceFee > 0
                            ? `+${formatMoney(loc.serviceFee, {
                                locale: locale === "ar" ? "ar" : "en-US",
                              })}`
                            : t("locations.free")}
                        </span>
                      </div>

                      <p className="text-body-sm text-ink-soft">
                        {pickLocalized(loc.address, locale)}
                      </p>

                      <dl className="flex flex-col gap-1 text-caption text-ink-muted">
                        <div className="flex items-center gap-2">
                          <dt className="sr-only">{t("locations.hours")}</dt>
                          <Icon name="clock" size={13} className="text-ink-faint" />
                          <dd data-keep-mono>
                            {`${loc.hours.open} – ${loc.hours.close} · ${loc.hours.days}`}
                          </dd>
                        </div>
                        <div className="flex items-center gap-2">
                          <dt className="sr-only">{t("locations.area")}</dt>
                          <Icon name="pin" size={13} className="text-ink-faint" />
                          <dd>{pickLocalized(loc.area, locale)}</dd>
                        </div>
                      </dl>

                      <div className="mt-auto flex flex-wrap gap-2 pt-2">
                        <Link
                          to={`/fleet?loc=${encodeURIComponent(loc.id)}`}
                          onClick={() => setState({ locationId: loc.id })}
                          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-ink px-4 font-mono text-caption text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          {t("locations.pickup")}
                          <Icon name={locale === "ar" ? "arrowLeft" : "arrowRight"} size={13} />
                        </Link>
                        <Link
                          to={`/locations/${loc.id}`}
                          className="inline-flex min-h-11 items-center px-2 font-mono text-caption text-ink-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          {t("locations.address")}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </section>
    </>
  );
}

export default LocationsPage;
