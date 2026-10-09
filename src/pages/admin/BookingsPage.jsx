import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn.js";
import { useLocaleContext } from "../../i18n/context.js";
import { useDocumentMeta } from "../../hooks/useDocumentMeta.js";
import { useAsyncData } from "../../hooks/useAsyncData.js";
import { repositories } from "../../lib/repositories/index.js";
import { applyBookingFilters } from "../../lib/booking/bookingQuery.js";
import { BOOKING_STATUSES, statusLabelKey, statusTone } from "../../lib/booking/statusDisplay.js";
import { formatDate } from "../../lib/dates.js";
import { formatMoney } from "../../lib/money.js";
import Button from "../../components/ui/Button.jsx";
import Icon from "../../components/ui/Icon.jsx";
import StatusMark from "../../components/ui/StatusMark.jsx";
import { formatTimestamp } from "../../features/admin/bookingDisplay.js";

/**
 * The booking inbox — the front desk's work queue.
 *
 * One table, real rows, real filters. There is no summary strip above it: the
 * counts live on the filter buttons because that is where an operator looks
 * when deciding what to open next.
 *
 * The list is fetched once per mount and filtered in memory. That is a
 * deliberate trade — a request queue is small, tab switching must be instant,
 * and the alternative (a query per keystroke) buys nothing at this size. The
 * fetch is capped and the cap is disclosed rather than silently applied.
 */
const FETCH_CAP = 500;

function money(value, locale, currency = "USD") {
  return formatMoney(value, { locale: locale === "ar" ? "ar" : "en-US", currency });
}

function Row({ request, locale, t }) {
  const dates = request.bookedDates ?? request;
  const showsBothDates =
    request.proposed &&
    (request.proposed.pickupDate !== request.pickupDate ||
      request.proposed.returnDate !== request.returnDate);

  return (
    <tr className="border-b border-line transition-colors hover:bg-surface-sunken/70">
      <th scope="row" className="py-3 pe-4 text-start font-normal">
        <Link
          to={`/admin/bookings/${request.id}`}
          className="inline-flex min-h-11 items-center gap-2 font-mono text-body-sm text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          data-keep-mono
        >
          {request.reference}
          <Icon name="chevronRight" size={14} className="text-ink-faint" />
        </Link>
      </th>
      <td className="py-3 pe-4">
        <StatusMark tone={statusTone(request.status)} label={t(statusLabelKey(request.status))} size="sm" />
      </td>
      <td className="py-3 pe-4">
        <p className="text-body-sm text-ink">{request.customer?.fullName ?? "—"}</p>
        <p className="truncate font-mono text-micro text-ink-muted" data-keep-mono>
          {request.customer?.email ?? ""}
        </p>
      </td>
      <td className="hidden py-3 pe-4 text-body-sm text-ink-soft lg:table-cell">
        {request.vehicleName ?? request.vehicleId}
      </td>
      <td className="py-3 pe-4">
        <p className="whitespace-nowrap font-mono text-body-sm text-ink" data-keep-mono>
          {formatDate(dates.pickupDate, locale)} → {formatDate(dates.returnDate, locale)}
        </p>
        {showsBothDates ? (
          <p className="whitespace-nowrap font-mono text-micro text-ink-muted" data-keep-mono>
            {t("admin.bookings.requested")}: {formatDate(request.pickupDate, locale)} →{" "}
            {formatDate(request.returnDate, locale)}
          </p>
        ) : null}
      </td>
      <td className="hidden py-3 pe-4 text-end lg:table-cell">
        <span className="font-mono text-body-sm text-ink tabular-nums" data-keep-mono>
          {request.totalWithVat != null ? money(request.totalWithVat, locale, request.currency) : "—"}
        </span>
      </td>
      <td className="hidden py-3 text-end font-mono text-caption text-ink-muted lg:table-cell" data-keep-mono>
        {formatTimestamp(request.updatedAt ?? request.createdAt, locale)}
      </td>
    </tr>
  );
}

function Card({ request, locale, t }) {
  const dates = request.bookedDates ?? request;
  return (
    <li className="border-b border-line">
      <Link
        to={`/admin/bookings/${request.id}`}
        className="flex min-h-16 flex-col gap-2 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className="font-mono text-body-sm text-ink" data-keep-mono>
            {request.reference}
          </span>
          <StatusMark tone={statusTone(request.status)} label={t(statusLabelKey(request.status))} size="sm" />
        </div>
        <p className="text-body-sm text-ink">{request.customer?.fullName ?? "—"}</p>
        <p className="font-mono text-caption text-ink-soft" data-keep-mono>
          {formatDate(dates.pickupDate, locale)} → {formatDate(dates.returnDate, locale)}
        </p>
        <div className="flex items-center justify-between gap-3 font-mono text-caption text-ink-muted" data-keep-mono>
          <span>{request.vehicleName ?? request.vehicleId}</span>
          <span className="tabular-nums">
            {request.totalWithVat != null ? money(request.totalWithVat, locale, request.currency) : "—"}
          </span>
        </div>
      </Link>
    </li>
  );
}

function Skeleton() {
  return (
    <ul aria-hidden="true" className="flex flex-col">
      {[0, 1, 2, 3, 4].map((index) => (
        <li key={index} className="flex items-center gap-4 border-b border-line py-4">
          <span className="h-4 w-36 rounded-xs bg-surface-sunken" />
          <span className="h-4 w-24 rounded-xs bg-surface-sunken" />
          <span className="hidden h-4 flex-1 rounded-xs bg-surface-sunken lg:block" />
        </li>
      ))}
    </ul>
  );
}

export function BookingsPage() {
  const { t, locale } = useLocaleContext();
  useDocumentMeta({ title: t("admin.bookings.title"), description: null, path: "/admin/bookings" });

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const { data, loading, error, reload } = useAsyncData(
    () => repositories.queryBookingRequests({ max: FETCH_CAP }),
    [],
  );

  const rows = useMemo(() => applyBookingFilters(data ?? [], { search, limit: FETCH_CAP }), [
    data,
    search,
  ]);

  const counts = useMemo(() => {
    const source = data ?? [];
    const map = { all: source.length };
    for (const value of BOOKING_STATUSES) {
      map[value] = source.filter((row) => row.status === value).length;
    }
    return map;
  }, [data]);

  const visible = useMemo(
    () => (status ? rows.filter((row) => row.status === status) : rows),
    [rows, status],
  );

  const filtersActive = Boolean(status) || search.trim().length > 0;
  const capped = (data?.length ?? 0) >= FETCH_CAP;

  const tabs = [{ id: "", labelKey: "admin.bookings.filter.all" }].concat(
    BOOKING_STATUSES.map((value) => ({ id: value, labelKey: statusLabelKey(value) })),
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title-1 font-medium text-ink">{t("admin.bookings.title")}</h1>
          <p className="mt-2 max-w-prose text-body-sm leading-relaxed text-ink-soft">
            {t("admin.bookings.subtitle")}
          </p>
        </div>
        <Button variant="quiet" size="sm" onClick={reload} disabled={loading}>
          {t("admin.bookings.refresh")}
        </Button>
      </header>

      {/* ---- filters ---- */}
      <div className="flex flex-col gap-4 border-y border-line py-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label={t("admin.bookings.filter.label")}
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

        <div className="relative w-full lg:w-72">
          <label htmlFor="booking-search" className="sr-only">
            {t("admin.bookings.searchLabel")}
          </label>
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            id="booking-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("admin.bookings.searchPlaceholder")}
            className="min-h-11 w-full rounded-md border border-line bg-surface ps-9 pe-3 text-body-sm text-ink transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          />
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
      ) : error ? (
        <div role="alert" className="rounded-lg border border-status-closed/30 bg-status-closed-soft p-6">
          <p className="text-body-sm text-ink">{t("states.error.title")}</p>
          <p className="mt-1.5 text-body-sm text-ink-soft">{t("admin.bookings.error")}</p>
          <Button variant="quiet" size="sm" className="mt-4" onClick={reload}>
            {t("states.retry")}
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-body-sm text-ink">
            {filtersActive ? t("admin.bookings.emptyFiltered") : t("admin.bookings.empty")}
          </p>
          <p className="mt-2 text-caption leading-relaxed text-ink-muted">
            {filtersActive ? t("admin.bookings.emptyFilteredHint") : t("admin.bookings.emptyHint")}
          </p>
          {filtersActive ? (
            <Button
              variant="quiet"
              size="sm"
              className="mt-5"
              onClick={() => {
                setStatus("");
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
            {t("admin.bookings.showing", { count: visible.length })}
            {capped ? ` — ${t("admin.bookings.capped", { count: FETCH_CAP })}` : ""}
          </p>

          {/* Table from 768px; a stacked list below it. Same rows, one visible. */}
          <table className="hidden w-full border-collapse text-start md:table">
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className="pb-2.5 pe-4 text-start label-micro text-ink-faint">
                  {t("admin.bookings.col.reference")}
                </th>
                <th scope="col" className="pb-2.5 pe-4 text-start label-micro text-ink-faint">
                  {t("admin.bookings.col.status")}
                </th>
                <th scope="col" className="pb-2.5 pe-4 text-start label-micro text-ink-faint">
                  {t("admin.bookings.col.customer")}
                </th>
                <th scope="col" className="hidden pb-2.5 pe-4 text-start label-micro text-ink-faint lg:table-cell">
                  {t("admin.bookings.col.vehicle")}
                </th>
                <th scope="col" className="pb-2.5 pe-4 text-start label-micro text-ink-faint">
                  {t("admin.bookings.col.dates")}
                </th>
                <th scope="col" className="hidden pb-2.5 pe-4 text-end label-micro text-ink-faint lg:table-cell">
                  {t("admin.bookings.col.total")}
                </th>
                <th scope="col" className="hidden pb-2.5 text-end label-micro text-ink-faint lg:table-cell">
                  {t("admin.bookings.col.updated")}
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((request) => (
                <Row key={request.id} request={request} locale={locale} t={t} />
              ))}
            </tbody>
          </table>

          <ul className="md:hidden">
            {visible.map((request) => (
              <Card key={request.id} request={request} locale={locale} t={t} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default BookingsPage;
