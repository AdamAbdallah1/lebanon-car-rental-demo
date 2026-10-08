import { Link } from "react-router-dom";
import { useLocaleContext, usePick } from "../i18n/context.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { repositories } from "../lib/repositories/index.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import PageHeader from "../components/layout/PageHeader.jsx";
import Icon from "../components/ui/Icon.jsx";

export function OffersPage() {
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();

  useDocumentMeta({
    title: "Offers",
    description:
      "Weekly and monthly rates, and delivery terms for rentals in Lebanon.",
    path: "/offers",
  });

  const { data: offers, loading, error, reload } = useAsyncData(
    () => repositories.getOffers(),
    [],
  );

  const items = (offers ?? [])
    .filter((o) => o.status === "active")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <>
      <PageHeader eyebrow={t("nav.offers")} title={t("offers.title")} lede={t("offers.lede")} />

      <section className="block-pad" aria-label={t("offers.title")}>
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
          ) : loading && !offers ? (
            <ul className="grid grid-cols-1 gap-6 lg:grid-cols-3" aria-busy="true" aria-live="polite">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="h-64 animate-pulse rounded-lg border border-line bg-surface-sunken" />
              ))}
              <li className="sr-only">{t("states.loading")}</li>
            </ul>
          ) : items.length === 0 ? (
            <p className="py-16 text-center text-body text-ink-muted">{t("states.empty")}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {items.map((offer) => (
                <li
                  key={offer.id}
                  className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="label-micro text-accent">{t("nav.offers")}</span>
                    {offer.minDays ? (
                      <span className="font-mono text-caption text-ink-faint" data-keep-mono>
                        {t("search.days", { count: offer.minDays })}+
                      </span>
                    ) : null}
                  </div>

                  <h2 className="font-display text-display-3 text-ink" data-display-font>
                    {pickLocalized(offer.title, locale)}
                  </h2>

                  <p className="text-body-sm leading-relaxed text-ink-soft">
                    {pickLocalized(offer.body, locale)}
                  </p>

                  {offer.termsKey && offer.discountPercent ? (
                    <p className="font-mono text-caption text-ink-muted" data-keep-mono>
                      {t(offer.termsKey, { pct: offer.discountPercent })}
                    </p>
                  ) : null}

                  <Link
                    to="/fleet"
                    className="mt-auto inline-flex min-h-11 items-center gap-2 self-start rounded-md border border-ink px-4 font-mono text-caption text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {t("fleet.browseAll")}
                    <Icon name={locale === "ar" ? "arrowLeft" : "arrowRight"} size={13} />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-10 max-w-3xl border-t border-line pt-6 text-caption leading-relaxed text-ink-muted">
            {t("vehicle.priceNote")}
          </p>
        </div>
      </section>
    </>
  );
}

export default OffersPage;
