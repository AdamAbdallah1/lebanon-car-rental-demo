import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn.js";
import { pickLocalized } from "../../features/admin/fleetDisplay.js";
import { useLocaleContext } from "../../i18n/context.js";
import { useDocumentMeta } from "../../hooks/useDocumentMeta.js";
import { useAsyncData } from "../../hooks/useAsyncData.js";
import { repositories } from "../../lib/repositories/index.js";
import { VEHICLE_STATUSES, AVAILABILITY_MODES } from "../../lib/fleet/vehicleInput.js";
import { formatMoney } from "../../lib/money.js";
import Button from "../../components/ui/Button.jsx";
import Icon from "../../components/ui/Icon.jsx";
import StatusMark from "../../components/ui/StatusMark.jsx";
import { availabilityLabelKey, publishLabelKey, publishTone } from "../../features/admin/fleetDisplay.js";
import { formatTimestamp } from "../../features/admin/bookingDisplay.js";

/**
 * The fleet — the authoring surface, not a shop window.
 *
 * Everything is listed including drafts and archived cars, because an operator
 * needs to find the draft they abandoned and restore the car they archived by
 * mistake. The public site keeps its own filters (`queryVehicles` only ever
 * returns `active`); this page reads `queryAllVehicles`.
 *
 * Like the inbox, the list is fetched once and narrowed in memory: a fleet is
 * small, the filters must be instant, and the fetch cap is disclosed in the UI
 * rather than silently applied.
 */
const FETCH_CAP = 500;
const SORTS = ["sortOrder", "updatedAt", "name", "priceAsc", "priceDesc"];

function money(value, locale, currency = "USD") {
  return formatMoney(value, { locale: locale === "ar" ? "ar" : "en-US", currency });
}

function Row({ vehicle, locale, t, categoryName }) {
  return (
    <tr className="border-b border-line transition-colors hover:bg-surface-sunken/70">
      <th scope="row" className="py-3 pe-4 text-start font-normal">
        <Link
          to={`/admin/fleet/${vehicle.id}`}
          className="inline-flex min-h-11 items-center gap-2 text-body-sm text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {pickLocalized(vehicle.name, locale, `${vehicle.make} ${vehicle.model}`)}
          <Icon name="chevronRight" size={14} className="text-ink-faint" />
        </Link>
        <p className="font-mono text-micro text-ink-muted" data-keep-mono>
          {vehicle.slug}
        </p>
      </th>
      <td className="py-3 pe-4">
        <StatusMark tone={publishTone(vehicle.status)} label={t(publishLabelKey(vehicle.status))} size="sm" />
      </td>
      <td className="hidden py-3 pe-4 text-body-sm text-ink-soft md:table-cell">{categoryName}</td>
      <td className="py-3 pe-4">
        <span className="font-mono text-body-sm text-ink tabular-nums" data-keep-mono>
          {vehicle.pricing?.daily != null ? money(vehicle.pricing.daily, locale, vehicle.pricing.currency) : "—"}
        </span>
        <p className="font-mono text-micro text-ink-muted" data-keep-mono>
          {vehicle.pricing?.currency ?? ""}
        </p>
      </td>
      <td className="hidden py-3 pe-4 lg:table-cell">
        <StatusMark
          tone={vehicle.availability === "limited" ? "limited" : vehicle.availability === "unavailable" ? "unavailable" : "available"}
          label={t(availabilityLabelKey(vehicle.availability))}
          size="sm"
        />
      </td>
      <td className="hidden py-3 pe-4 font-mono text-caption text-ink-muted lg:table-cell" data-keep-mono>
        {(vehicle.locationIds ?? []).length}
      </td>
      <td className="hidden py-3 pe-4 text-end font-mono text-caption text-ink-muted lg:table-cell" data-keep-mono>
        {formatTimestamp(vehicle.updatedAt ?? vehicle.createdAt, locale)}
      </td>
    </tr>
  );
}

function Card({ vehicle, locale, t, categoryName }) {
  return (
    <li className="border-b border-line">
      <Link
        to={`/admin/fleet/${vehicle.id}`}
        className="flex min-h-16 flex-col gap-2 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className="text-body-sm text-ink">
            {pickLocalized(vehicle.name, locale, `${vehicle.make} ${vehicle.model}`)}
          </span>
          <StatusMark tone={publishTone(vehicle.status)} label={t(publishLabelKey(vehicle.status))} size="sm" />
        </div>
        <div className="flex items-center justify-between gap-3 font-mono text-caption text-ink-muted" data-keep-mono>
          <span>{categoryName}</span>
          <span className="tabular-nums">
            {vehicle.pricing?.daily != null ? money(vehicle.pricing.daily, locale, vehicle.pricing.currency) : "—"}
          </span>
        </div>
      </Link>
    </li>
  );
}

function Skeleton() {
  return (
    <ul aria-hidden="true" className="flex flex-col">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <li key={index} className="flex items-center gap-4 border-b border-line py-4">
          <span className="h-4 w-40 rounded-xs bg-surface-sunken" />
          <span className="h-4 w-20 rounded-xs bg-surface-sunken" />
          <span className="hidden h-4 flex-1 rounded-xs bg-surface-sunken lg:block" />
        </li>
      ))}
    </ul>
  );
}

export function FleetPage() {
  const { t, locale } = useLocaleContext();
  useDocumentMeta({ title: t("admin.fleet.title"), description: null, path: "/admin/fleet" });

  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [availability, setAvailability] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("sortOrder");

  const { data, loading, error, reload } = useAsyncData(
    () => repositories.queryAllVehicles({ sort }),
    [sort],
  );
  const categories = useAsyncData(() => repositories.queryCategories(), []);

  // Concurrent loads: two queries, one table. Both must fail for the panel to
  // show an error, because a missing category list must not hide the fleet.
  const loadError = error ?? categories.error;

  const rows = useMemo(() => {
    let list = data ?? [];
    if (status) list = list.filter((v) => v.status === status);
    if (categoryId && categoryId !== "all") list = list.filter((v) => v.categoryId === categoryId);
    if (availability && availability !== "all") list = list.filter((v) => v.availability === availability);
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter((v) =>
        [v.slug, v.make, v.model, v.name?.en, v.name?.ar]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term),
      );
    }
    return list;
  }, [data, status, categoryId, availability, search]);

  const counts = useMemo(() => {
    const source = data ?? [];
    const map = { all: source.length };
    for (const value of VEHICLE_STATUSES) {
      map[value] = source.filter((v) => v.status === value).length;
    }
    return map;
  }, [data]);

  const categoryNames = useMemo(() => {
    const map = new Map();
    for (const category of categories.data ?? []) {
      map.set(category.id, pickLocalized(category.name, locale, category.id));
    }
    return map;
  }, [categories.data, locale]);

  const filtersActive =
    Boolean(status) || (Boolean(categoryId) && categoryId !== "all") ||
    (Boolean(availability) && availability !== "all") || search.trim().length > 0;

  const capped = (data?.length ?? 0) >= FETCH_CAP;

  const tabs = [{ id: "", labelKey: "admin.fleet.filter.all" }].concat(
    VEHICLE_STATUSES.map((value) => ({ id: value, labelKey: publishLabelKey(value) })),
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title-1 font-medium text-ink">{t("admin.fleet.title")}</h1>
          <p className="mt-2 max-w-prose text-body-sm leading-relaxed text-ink-soft">
            {t("admin.fleet.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="quiet" size="sm" onClick={reload} disabled={loading}>
            {t("admin.bookings.refresh")}
          </Button>
          <Button as={Link} to="/admin/fleet/new" size="sm">
            <Icon name="plus" size={14} />
            {t("admin.fleet.new")}
          </Button>
        </div>
      </header>

      {/* ---- filters ---- */}
      <div className="flex flex-col gap-4 border-y border-line py-4">
        <div
          role="group"
          aria-label={t("admin.fleet.filter.label")}
          className="scroll-none -mx-1 flex items-center gap-1 overflow-x-auto px-1"
        >
          {tabs.map((tab) => {
            const active = status === tab.id;
            const count = counts[tab.id === "" ? "all" : tab.id] ?? 0;
            return (
              <button
                key={tab.id || "all"}
                type="button"
                aria-pressed={active}
                onClick={() => setStatus(tab.id)}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-3 font-mono text-caption transition-colors duration-[180ms]",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  active
                    ? "border-ink bg-ink text-canvas"
                    : "border-line bg-surface text-ink-soft hover:border-ink hover:text-ink",
                )}
                data-keep-mono
              >
                {t(tab.labelKey)}
                <span className={cn("tabular-nums", active ? "text-canvas/70" : "text-ink-faint")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <label htmlFor="fleet-search" className="sr-only">
              {t("admin.fleet.searchLabel")}
            </label>
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              id="fleet-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("admin.fleet.searchPlaceholder")}
              className="min-h-11 w-full rounded-md border border-line bg-surface ps-9 pe-3 text-body-sm text-ink transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            />
          </div>

          <label className="flex items-center gap-2">
            <span className="sr-only">{t("admin.fleet.col.category")}</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-body-sm text-ink"
            >
              <option value="">{t("admin.fleet.category.all")}</option>
              {(categories.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {pickLocalized(category.name, locale, category.id)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="sr-only">{t("admin.fleet.col.availability")}</span>
            <select
              value={availability}
              onChange={(event) => setAvailability(event.target.value)}
              className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-body-sm text-ink"
            >
              <option value="">{t("admin.fleet.availability.all")}</option>
              {AVAILABILITY_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {t(availabilityLabelKey(mode))}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="sr-only">{t("admin.fleet.sortLabel")}</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-body-sm text-ink"
            >
              {SORTS.map((value) => (
                <option key={value} value={value}>
                  {t(`admin.fleet.sort.${value}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* ---- states ---- */}
      {loading && !data ? (
        <>
          <p className="sr-only" role="status">
            {t("states.loading")}
          </p>
          <Skeleton />
        </>
      ) : loadError ? (
        <div role="alert" className="rounded-lg border border-status-closed/30 bg-status-closed-soft p-6">
          <p className="text-body-sm text-ink">{t("states.error.title")}</p>
          <p className="mt-1.5 text-body-sm text-ink-soft">{t("admin.fleet.error")}</p>
          <Button variant="quiet" size="sm" className="mt-4" onClick={reload}>
            {t("states.retry")}
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-body-sm text-ink">
            {filtersActive ? t("admin.fleet.emptyFiltered") : t("admin.fleet.empty")}
          </p>
          <p className="mt-2 text-caption leading-relaxed text-ink-muted">
            {filtersActive ? t("admin.fleet.emptyFilteredHint") : t("admin.fleet.emptyHint")}
          </p>
          {filtersActive ? (
            <Button
              variant="quiet"
              size="sm"
              className="mt-5"
              onClick={() => {
                setStatus("");
                setCategoryId("");
                setAvailability("");
                setSearch("");
              }}
            >
              {t("admin.bookings.clearFilters")}
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <p className="text-caption text-ink-muted">
            {t("admin.fleet.showing", { count: rows.length })}
            {capped ? ` — ${t("admin.fleet.capped", { count: FETCH_CAP })}` : ""}
          </p>

          <table className="hidden w-full border-collapse text-start md:table">
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className="pb-2.5 pe-4 text-start label-micro text-ink-faint">
                  {t("admin.fleet.col.vehicle")}
                </th>
                <th scope="col" className="pb-2.5 pe-4 text-start label-micro text-ink-faint">
                  {t("admin.fleet.col.status")}
                </th>
                <th scope="col" className="hidden pb-2.5 pe-4 text-start label-micro text-ink-faint md:table-cell">
                  {t("admin.fleet.col.category")}
                </th>
                <th scope="col" className="pb-2.5 pe-4 text-start label-micro text-ink-faint">
                  {t("admin.fleet.col.price")}
                </th>
                <th scope="col" className="hidden pb-2.5 pe-4 text-start label-micro text-ink-faint lg:table-cell">
                  {t("admin.fleet.col.availability")}
                </th>
                <th scope="col" className="hidden pb-2.5 pe-4 text-start label-micro text-ink-faint lg:table-cell">
                  {t("admin.fleet.col.locations")}
                </th>
                <th scope="col" className="hidden pb-2.5 text-end label-micro text-ink-faint lg:table-cell">
                  {t("admin.fleet.col.updated")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((vehicle) => (
                <Row
                  key={vehicle.id}
                  vehicle={vehicle}
                  locale={locale}
                  t={t}
                  categoryName={categoryNames.get(vehicle.categoryId) ?? vehicle.categoryId}
                />
              ))}
            </tbody>
          </table>

          <ul className="md:hidden">
            {rows.map((vehicle) => (
              <Card
                key={vehicle.id}
                vehicle={vehicle}
                locale={locale}
                t={t}
                categoryName={categoryNames.get(vehicle.categoryId) ?? vehicle.categoryId}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default FleetPage;
