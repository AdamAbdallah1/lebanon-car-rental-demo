import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn.js";
import { pickLocalized, publishLabelKey, publishTone } from "../../features/admin/fleetDisplay.js";
import { useLocaleContext } from "../../i18n/context.js";
import { useDocumentMeta } from "../../hooks/useDocumentMeta.js";
import { useAsyncData } from "../../hooks/useAsyncData.js";
import { repositories } from "../../lib/repositories/index.js";
import { CONTENT_STATUSES } from "../../lib/content/contentInput.js";
import Button from "../../components/ui/Button.jsx";
import Icon from "../../components/ui/Icon.jsx";
import StatusMark from "../../components/ui/StatusMark.jsx";

/**
 * Locations work table — the pick-up points the fleet editor and the booking
 * form both read.
 *
 * Grouped by `group` rather than paginated: an operator looking for "where can
 * the customer collect this car" wants the list, not a page of it.
 */

const FETCH_CAP = 500;

const GROUP_LABEL_KEYS = {
  airports: "admin.locations.group.airports",
  cities: "admin.locations.group.cities",
  offices: "admin.locations.group.offices",
  delivery: "admin.locations.group.delivery",
};

function Row({ location, locale, t }) {
  return (
    <tr className="border-b border-line transition-colors hover:bg-surface-sunken/70">
      <th scope="row" className="py-3 pe-4 text-start font-normal">
        <Link
          to={`/admin/locations/${location.id}`}
          className="inline-flex min-h-11 items-center gap-2 text-body-sm text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {pickLocalized(location.name, locale, location.id)}
          <Icon name="chevronRight" size={14} className="text-ink-faint" />
        </Link>
        <p className="font-mono text-micro text-ink-muted" data-keep-mono>
          {location.code ?? location.id}
        </p>
      </th>
      <td className="hidden py-3 pe-4 text-body-sm text-ink-soft sm:table-cell">
        {t(GROUP_LABEL_KEYS[location.group] ?? location.group)}
      </td>
      <td className="hidden py-3 pe-4 text-body-sm text-ink-soft md:table-cell">
        {t(`admin.locations.type.${location.type}`)}
      </td>
      <td className="py-3 pe-4">
        <StatusMark
          tone={publishTone(location.status === undefined ? "active" : location.status)}
          label={t(publishLabelKey(location.status === undefined ? "active" : location.status))}
          size="sm"
        />
      </td>
      <td className="hidden py-3 pe-4 text-end font-mono text-caption text-ink-muted sm:table-cell">
        ${location.serviceFee ?? 0}
      </td>
      <td className="hidden py-3 text-end font-mono text-caption text-ink-muted lg:table-cell">
        {location.updatedAt ? location.updatedAt.slice(0, 10) : "—"}
      </td>
    </tr>
  );
}

function Card({ location, locale, t }) {
  return (
    <li className="border-b border-line">
      <Link
        to={`/admin/locations/${location.id}`}
        className="flex min-h-16 flex-col gap-2 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className="text-body-sm text-ink">{pickLocalized(location.name, locale, location.id)}</span>
          <StatusMark
            tone={publishTone(location.status === undefined ? "active" : location.status)}
            label={t(publishLabelKey(location.status === undefined ? "active" : location.status))}
            size="sm"
          />
        </div>
        <div className="flex items-center justify-between gap-3 font-mono text-caption text-ink-muted" data-keep-mono>
          <span>{location.code ?? location.id}</span>
          <span>${location.serviceFee ?? 0}</span>
        </div>
      </Link>
    </li>
  );
}

function Skeleton() {
  return (
    <ul aria-hidden="true" className="flex flex-col">
      {[0, 1, 2, 3].map((index) => (
        <li key={index} className="flex items-center gap-4 border-b border-line py-4">
          <span className="h-4 w-48 rounded-xs bg-surface-sunken" />
          <span className="h-4 w-24 rounded-xs bg-surface-sunken" />
        </li>
      ))}
    </ul>
  );
}

export function LocationsPage() {
  const { t, locale } = useLocaleContext();
  useDocumentMeta({ title: t("admin.locations.title"), description: null, path: "/admin/locations" });

  const [status, setStatus] = useState("");
  const [group, setGroup] = useState("");
  const [search, setSearch] = useState("");

  const { data, loading, error, reload } = useAsyncData(
    () => repositories.queryAllLocations({ sort: "sortOrder" }),
    [],
  );

  const groups = useMemo(() => {
    const set = new Set((data ?? []).map((l) => l.group));
    return [...set].filter(Boolean).sort();
  }, [data]);

  const rows = useMemo(() => {
    let list = data ?? [];
    if (status) {
      list = list.filter((l) => (l.status === undefined ? "active" : l.status) === status);
    }
    if (group && group !== "all") list = list.filter((l) => l.group === group);
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter((l) =>
        [l.name?.en, l.name?.ar, l.shortName?.en, l.code, l.id]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term),
      );
    }
    return list.slice(0, FETCH_CAP);
  }, [data, status, group, search]);

  const counts = useMemo(() => {
    const map = { all: (data ?? []).length };
    for (const value of CONTENT_STATUSES) {
      map[value] = (data ?? []).filter((l) => (l.status === undefined ? "active" : l.status) === value).length;
    }
    return map;
  }, [data]);

  const filtersActive = Boolean(status) || (Boolean(group) && group !== "all") || search.trim().length > 0;

  const tabs = [{ id: "", labelKey: "admin.fleet.filter.all" }].concat(
    CONTENT_STATUSES.map((value) => ({ id: value, labelKey: publishLabelKey(value) })),
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title-1 font-medium text-ink">{t("admin.locations.title")}</h1>
          <p className="mt-2 max-w-prose text-body-sm leading-relaxed text-ink-soft">
            {t("admin.locations.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="quiet" size="sm" onClick={reload} disabled={loading}>
            {t("admin.bookings.refresh")}
          </Button>
          <Button as={Link} to="/admin/locations/new" size="sm">
            <Icon name="plus" size={14} />
            {t("admin.locations.new")}
          </Button>
        </div>
      </header>

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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <label htmlFor="location-search" className="sr-only">
              {t("admin.fleet.searchLabel")}
            </label>
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              id="location-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("admin.locations.searchPlaceholder")}
              className="min-h-11 w-full rounded-md border border-line bg-surface ps-9 pe-3 text-body-sm text-ink transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            />
          </div>
          <label className="flex items-center gap-2">
            <span className="sr-only">{t("admin.locations.group.label")}</span>
            <select
              value={group}
              onChange={(event) => setGroup(event.target.value)}
              className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-body-sm text-ink"
            >
              <option value="">{t("admin.locations.group.all")}</option>
              {groups.map((value) => (
                <option key={value} value={value}>
                  {t(GROUP_LABEL_KEYS[value] ?? value)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading && !data ? (
        <>
          <p className="sr-only" role="status">
            {t("states.loading")}
          </p>
          <Skeleton />
        </>
      ) : error ? (
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
            {filtersActive ? t("admin.fleet.emptyFiltered") : t("admin.locations.empty")}
          </p>
          <p className="mt-2 text-caption leading-relaxed text-ink-muted">
            {filtersActive ? t("admin.fleet.emptyFilteredHint") : t("admin.locations.emptyHint")}
          </p>
          {filtersActive ? (
            <Button
              variant="quiet"
              size="sm"
              className="mt-5"
              onClick={() => {
                setStatus("");
                setGroup("");
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
            {rows.length >= FETCH_CAP ? ` — ${t("admin.fleet.capped", { count: FETCH_CAP })}` : ""}
          </p>
          <table className="hidden w-full border-collapse text-start sm:table">
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className="pb-2.5 pe-4 text-start label-micro text-ink-faint">
                  {t("admin.locations.col.name")}
                </th>
                <th scope="col" className="hidden pb-2.5 pe-4 text-start label-micro text-ink-faint sm:table-cell">
                  {t("admin.locations.group.label")}
                </th>
                <th scope="col" className="hidden pb-2.5 pe-4 text-start label-micro text-ink-faint md:table-cell">
                  {t("admin.locations.col.type")}
                </th>
                <th scope="col" className="pb-2.5 pe-4 text-start label-micro text-ink-faint">
                  {t("admin.fleet.col.status")}
                </th>
                <th scope="col" className="hidden pb-2.5 pe-4 text-end label-micro text-ink-faint sm:table-cell">
                  {t("admin.locations.col.serviceFee")}
                </th>
                <th scope="col" className="hidden pb-2.5 text-end label-micro text-ink-faint lg:table-cell">
                  {t("admin.fleet.col.updated")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((location) => (
                <Row key={location.id} location={location} locale={locale} t={t} />
              ))}
            </tbody>
          </table>
          <ul className="sm:hidden">
            {rows.map((location) => (
              <Card key={location.id} location={location} locale={locale} t={t} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default LocationsPage;
