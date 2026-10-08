import { Link } from "react-router-dom";
import { useLocaleContext, usePick } from "../i18n/context.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { repositories } from "../lib/repositories/index.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import PageHeader from "../components/layout/PageHeader.jsx";
import { formatDate } from "../lib/dates.js";

export function RentalTermsPage() {
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();

  useDocumentMeta({
    title: "Rental terms",
    description:
      "Booking, cancellation, damage, extension and questions — the structure of a Lebanese rental contract.",
    path: "/rental-terms",
  });

  const { data: terms, loading, error, reload } = useAsyncData(
    () => repositories.getRentalTerms(),
    [],
  );

  return (
    <>
      <PageHeader eyebrow={t("nav.terms")} title={t("nav.terms")} lede={t("terms.introduction")} />

      <section className="block-pad" aria-label={t("nav.terms")}>
        <div className="container-page max-w-3xl">
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
          ) : loading && !terms ? (
            <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
              <div className="h-6 w-52 animate-pulse rounded bg-surface-sunken" />
              <div className="h-28 w-full animate-pulse rounded-lg bg-surface-sunken" />
              <div className="h-28 w-full animate-pulse rounded-lg bg-surface-sunken" />
              <span className="sr-only">{t("states.loading")}</span>
            </div>
          ) : terms ? (
            <div className="flex flex-col gap-10">
              <p className="text-body leading-relaxed text-ink-soft">
                {pickLocalized(terms.introduction, locale)}
              </p>

              <ol className="flex flex-col gap-8">
                {terms.sections.map((section, index) => (
                  <li key={section.id} className="flex flex-col gap-3">
                    <div className="flex items-baseline gap-4">
                      <span className="font-mono text-caption text-accent" data-keep-mono>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h2 className="text-title-1 font-medium text-ink">
                        {t(section.titleKey)}
                      </h2>
                    </div>
                    <p className="max-w-2xl pl-0 text-body leading-relaxed text-ink-soft sm:pl-10">
                      {pickLocalized(section.body, locale)}
                    </p>
                  </li>
                ))}
              </ol>

              {terms.updatedAt ? (
                <p className="border-t border-line pt-6 font-mono text-caption text-ink-muted" data-keep-mono>
                  {`${t("terms.updated")}: ${formatDate(terms.updatedAt, locale)}`}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/faq"
                  className="inline-flex min-h-11 items-center rounded-md border border-ink px-5 font-mono text-body-sm text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {t("faq.title")}
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex min-h-11 items-center rounded-md border border-line px-5 font-mono text-body-sm text-ink-muted transition-colors hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {t("contact.title")}
                </Link>
              </div>
            </div>
          ) : (
            <p className="py-16 text-center text-body text-ink-muted">{t("states.empty")}</p>
          )}
        </div>
      </section>
    </>
  );
}

export default RentalTermsPage;
