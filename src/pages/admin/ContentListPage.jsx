import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/cn.js";
import { pickLocalized, publishLabelKey, publishTone } from "../../features/admin/fleetDisplay.js";
import { useLocaleContext } from "../../i18n/context.js";
import { useDocumentMeta } from "../../hooks/useDocumentMeta.js";
import { useAsyncData } from "../../hooks/useAsyncData.js";
import { CONTENT_STATUSES } from "../../lib/content/contentInput.js";
import { CONTENT_SECTIONS } from "../../features/admin/contentSections.js";
import Button from "../../components/ui/Button.jsx";
import Icon from "../../components/ui/Icon.jsx";
import StatusMark from "../../components/ui/StatusMark.jsx";

/**
 * One work table for the collections that share a shape — categories, offers,
 * FAQs. Locations and rental terms differ enough to have their own pages.
 *
 * A row's title is the document's first localized field, whichever it is; the
 * column heading comes from the section config for the same reason.
 */

const FETCH_CAP = 500;

function Row({ doc, section, locale, t }) {
  const primary = section.primaryField.map((key) => doc[key] ?? {});
  const label = pickLocalized(primary[0], locale, doc.id);
  const secondary = section.secondaryField
    ? pickLocalized(section.secondaryField.map((key) => doc[key] ?? {})[0], locale, "")
    : "";
  return (
    <tr className="border-b border-line transition-colors hover:bg-surface-sunken/70">
      <th scope="row" className="py-3 pe-4 text-start font-normal">
        <Link
          to={`${section.base}/${doc.id}`}
          className="inline-flex min-h-11 items-center gap-2 text-body-sm text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {label}
          <Icon name="chevronRight" size={14} className="text-ink-faint" />
        </Link>
        {secondary ? (
          <p className="truncate font-mono text-micro text-ink-muted" data-keep-mono>
            {secondary}
          </p>
        ) : null}
      </th>
      <td className="py-3 pe-4">
        <StatusMark
          tone={publishTone(doc.status)}
          label={t(publishLabelKey(doc.status === undefined ? "active" : doc.status))}
          size="sm"
        />
      </td>
      <td className="hidden py-3 pe-4 text-end font-mono text-caption text-ink-muted sm:table-cell">
        {doc.sortOrder ?? "—"}
      </td>
      <td className="hidden py-3 text-end font-mono text-caption text-ink-muted lg:table-cell">
        {doc.updatedAt ? doc.updatedAt.slice(0, 10) : "—"}
      </td>
    </tr>
  );
}

function Card({ doc, section, locale, t }) {
  return (
    <li className="border-b border-line">
      <Link
        to={`${section.base}/${doc.id}`}
        className="flex min-h-16 flex-col gap-2 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className="text-body-sm text-ink">
            {pickLocalized(section.primaryField.map((key) => doc[key] ?? {})[0], locale, doc.id)}
          </span>
          <StatusMark
            tone={publishTone(doc.status)}
            label={t(publishLabelKey(doc.status === undefined ? "active" : doc.status))}
            size="sm"
          />
        </div>
        {section.secondaryField ? (
          <p className="font-mono text-caption text-ink-muted" data-keep-mono>
            {pickLocalized(section.secondaryField.map((key) => doc[key] ?? {})[0], locale, "")}
          </p>
        ) : null}
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
          <span className="h-4 w-20 rounded-xs bg-surface-sunken" />
        </li>
      ))}
    </ul>
  );
}

export function ContentListPage() {
  const { pathname } = useLocation();
  const { t, locale } = useLocaleContext();
  const section =
    Object.values(CONTENT_SECTIONS).find(
      (entry) => pathname === entry.base || pathname.startsWith(`${entry.base}/`),
    ) ?? CONTENT_SECTIONS.categories;

  useDocumentMeta({ title: t(section.titleKey), description: null, path: section.base });

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const { data, loading, error, reload } = useAsyncData(section.load, [section.id]);

  const rows = useMemo(() => {
    let list = data ?? [];
    if (status) list = list.filter((doc) => (doc.status === undefined ? "active" : doc.status) === status);
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter((doc) =>
        section.primaryField
          .concat(section.secondaryField ?? [])
          .concat(["id", "slug", "termsKey"])
          .map((key) => {
            const value = doc[key];
            if (typeof value === "string") return value;
            return value ? value.en ?? value.ar ?? "" : "";
          })
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term),
      );
    }
    return list.slice(0, FETCH_CAP);
  }, [data, status, search, section]);

  const counts = useMemo(() => {
    const map = { all: (data ?? []).length };
    for (const value of CONTENT_STATUSES) {
      map[value] = (data ?? []).filter((doc) => (doc.status === undefined ? "active" : doc.status) === value).length;
    }
    return map;
  }, [data]);

  const filtersActive = Boolean(status) || search.trim().length > 0;

  const tabs = [{ id: "", labelKey: "admin.fleet.filter.all" }].concat(
    CONTENT_STATUSES.map((value) => ({ id: value, labelKey: publishLabelKey(value) })),
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title-1 font-medium text-ink">{t(section.titleKey)}</h1>
          <p className="mt-2 max-w-prose text-body-sm leading-relaxed text-ink-soft">
            {t(section.subtitleKey)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="quiet" size="sm" onClick={reload} disabled={loading}>
            {t("admin.bookings.refresh")}
          </Button>
          <Button as={Link} to={`${section.base}/new`} size="sm">
            <Icon name="plus" size={14} />
            {t(section.newKey)}
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-4 border-y border-line py-4 lg:flex-row lg:items-center lg:justify-between">
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

        <div className="relative w-full lg:w-72">
          <label htmlFor="content-search" className="sr-only">
            {t("admin.fleet.searchLabel")}
          </label>
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            id="content-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("admin.content.searchPlaceholder")}
            className="min-h-11 w-full rounded-md border border-line bg-surface ps-9 pe-3 text-body-sm text-ink transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          />
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
            {filtersActive ? t("admin.fleet.emptyFiltered") : t("admin.content.empty")}
          </p>
          <p className="mt-2 text-caption leading-relaxed text-ink-muted">
            {filtersActive ? t("admin.fleet.emptyFilteredHint") : t("admin.content.emptyHint")}
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
          <p className="text-caption text-ink-muted">{t("admin.fleet.showing", { count: rows.length })}</p>
          <table className="hidden w-full border-collapse text-start sm:table">
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className="pb-2.5 pe-4 text-start label-micro text-ink-faint">
                  {t(section.primaryLabelKey)}
                </th>
                <th scope="col" className="pb-2.5 pe-4 text-start label-micro text-ink-faint">
                  {t("admin.fleet.col.status")}
                </th>
                <th scope="col" className="hidden pb-2.5 pe-4 text-end label-micro text-ink-faint sm:table-cell">
                  {t("admin.fleet.sortOrder")}
                </th>
                <th scope="col" className="hidden pb-2.5 text-end label-micro text-ink-faint lg:table-cell">
                  {t("admin.fleet.col.updated")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((doc) => (
                <Row key={doc.id} doc={doc} section={section} locale={locale} t={t} />
              ))}
            </tbody>
          </table>
          <ul className="sm:hidden">
            {rows.map((doc) => (
              <Card key={doc.id} doc={doc} section={section} locale={locale} t={t} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default ContentListPage;
