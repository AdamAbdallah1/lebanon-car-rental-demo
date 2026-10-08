import { cn } from "../../lib/cn.js";
import { useLocaleContext } from "../../i18n/context.js";
import Button from "../../components/ui/Button.jsx";

/** Skeleton card — same geometry as VehicleCard so nothing shifts. */
export function FleetSkeleton({ className }) {
  const { t } = useLocaleContext();
  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-line bg-surface", className)}
      role="status"
      aria-label={t("fleet.loading")}
      aria-busy="true"
    >
      <div className="aspect-[4/3] w-full animate-pulse bg-surface-sunken" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-2/3 animate-pulse rounded-xs bg-surface-sunken" />
        <div className="h-3 w-1/3 animate-pulse rounded-xs bg-surface-sunken" />
        <div className="grid grid-cols-4 gap-2 border-y border-line py-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-2.5 w-full animate-pulse rounded-xs bg-surface-sunken" />
              <div className="h-3 w-2/3 animate-pulse rounded-xs bg-surface-sunken" />
            </div>
          ))}
        </div>
        <div className="h-8 w-1/2 animate-pulse rounded-xs bg-surface-sunken" />
      </div>
      <span className="sr-only">{t("fleet.loading")}</span>
    </div>
  );
}

export function FleetGrid({ children, className }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** No match: the search is preserved and one action clears it. */
export function FleetEmptyState({ onClear, title, body, action }) {
  const { t } = useLocaleContext();
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-surface-sunken px-6 py-14 text-center">
      <p className="text-title-2 text-ink">{title ?? t("fleet.empty.title")}</p>
      <p className="mx-auto mt-2 max-w-md text-body-sm text-ink-muted">
        {body ?? t("fleet.empty.body")}
      </p>
      {onClear ? (
        <Button variant="secondary" className="mt-6" onClick={onClear}>
          {action ?? t("fleet.empty.action")}
        </Button>
      ) : null}
    </div>
  );
}

/** Failure with recovery: the query is retained, retry re-runs the loader. */
export function FleetErrorState({ onRetry }) {
  const { t } = useLocaleContext();
  return (
    <div
      role="alert"
      className="rounded-lg border border-status-closed/30 bg-status-closed-soft px-6 py-14 text-center"
    >
      <p className="text-title-2 text-ink">{t("fleet.error.title")}</p>
      <p className="mx-auto mt-2 max-w-md text-body-sm text-ink-muted">
        {t("fleet.error.body")}
      </p>
      <Button variant="secondary" className="mt-6" onClick={onRetry}>
        {t("fleet.error.action")}
      </Button>
    </div>
  );
}

export function FleetResultsMeta({ shown, total, className }) {
  const { t } = useLocaleContext();
  if (typeof shown !== "number" || typeof total !== "number") return null;
  return (
    <p className={cn("label-micro text-ink-faint", className)}>
      {t("fleet.results", { count: shown, total })}
    </p>
  );
}
