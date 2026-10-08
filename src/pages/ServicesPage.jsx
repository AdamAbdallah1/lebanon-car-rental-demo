import { useLocaleContext, usePick } from "../i18n/context.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { repositories } from "../lib/repositories/index.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import PageHeader from "../components/layout/PageHeader.jsx";
import Icon from "../components/ui/Icon.jsx";

const ICON_FOR = {
  arrival: "plane",
  van: "route",
  calendar: "calendar",
  steering: "key",
  seat: "seats",
  tool: "wrench",
};

export function ServicesPage() {
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();

  useDocumentMeta({
    title: "Services",
    description:
      "Airport meet & greet, hotel delivery, monthly rental, chauffeur service, extras and roadside assistance.",
    path: "/services",
  });

  const { data: services, loading, error, reload } = useAsyncData(
    () => repositories.getServices(),
    [],
  );

  const items = (services ?? []).filter((s) => s.status === "active");

  return (
    <>
      <PageHeader eyebrow={t("nav.services")} title={t("services.title")} lede={t("services.lede")} />

      <section className="block-pad" aria-label={t("services.title")}>
        <div className="container-page">
          {error ? (
            <div role="alert" className="rounded-lg border border-status-closed/30 bg-status-closed-soft px-6 py-16 text-center">
              <p className="text-title-2 text-ink">{t("states.error.title")}</p>
              <p className="mt-2 text-body-sm text-ink-soft">{t("states.error.body")}</p>
              <button
                type="button"
                onClick={reload}
                className="mt-6 min-h-11 rounded-md border border-ink px-5 font-mono text-body-sm text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {t("states.retry")}
              </button>
            </div>
          ) : loading && !services ? (
            <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-live="polite">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="h-44 animate-pulse rounded-lg border border-line bg-surface-sunken" />
              ))}
              <li className="sr-only">{t("states.loading")}</li>
            </ul>
          ) : items.length === 0 ? (
            <p className="py-16 text-center text-body text-ink-muted">{t("states.empty")}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {items.map((service, index) => (
                <li
                  key={service.id}
                  className="group flex flex-col gap-4 rounded-lg border border-line bg-surface p-6 transition-colors hover:border-line-strong"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex size-11 items-center justify-center rounded-full border border-accent-line bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                      <Icon name={ICON_FOR[service.icon] ?? "check"} size={18} />
                    </span>
                    <span className="font-mono text-caption text-ink-faint" data-keep-mono>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h2 className="text-title-2 font-medium text-ink">
                    {pickLocalized(service.title, locale)}
                  </h2>
                  <p className="text-body-sm leading-relaxed text-ink-soft">
                    {pickLocalized(service.body, locale)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

export default ServicesPage;
