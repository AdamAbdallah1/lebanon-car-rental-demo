import { useState } from "react";
import { useLocaleContext, usePick } from "../i18n/context.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { repositories } from "../lib/repositories/index.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import PageHeader from "../components/layout/PageHeader.jsx";
import Icon from "../components/ui/Icon.jsx";

export function FaqPage() {
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();
  const [openId, setOpenId] = useState(null);

  useDocumentMeta({
    title: "FAQ",
    description:
      "Documents, minimum age, mileage, deposits, payment methods, borders, cancellation and delayed flights.",
    path: "/faq",
  });

  const { data: faqs, loading, error, reload } = useAsyncData(
    () => repositories.getFaqs(),
    [],
  );

  const items = [...(faqs ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <>
      <PageHeader eyebrow={t("nav.faq")} title={t("faq.title")} lede={t("faq.lede")} />

      <section className="block-pad" aria-label={t("faq.title")}>
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
          ) : loading && !faqs ? (
            <ul className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="h-16 animate-pulse rounded-lg border border-line bg-surface-sunken" />
              ))}
              <li className="sr-only">{t("states.loading")}</li>
            </ul>
          ) : items.length === 0 ? (
            <p className="py-16 text-center text-body text-ink-muted">{t("states.empty")}</p>
          ) : (
            <ul className="flex flex-col gap-px overflow-hidden rounded-lg border border-line bg-line">
              {items.map((faq) => {
                const isOpen = openId === faq.id;
                const panelId = `faq-panel-${faq.id}`;
                const buttonId = `faq-button-${faq.id}`;
                return (
                  <li key={faq.id} className="bg-surface">
                    <h2>
                      <button
                        type="button"
                        id={buttonId}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpenId(isOpen ? null : faq.id)}
                        className="flex w-full min-h-14 items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                      >
                        <span className="text-body font-medium text-ink">
                          {pickLocalized(faq.question, locale)}
                        </span>
                        <span
                          className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition-transform ${isOpen ? "rotate-45 bg-ink text-canvas border-ink" : ""}`}
                          aria-hidden="true"
                        >
                          <Icon name="plus" size={14} />
                        </span>
                      </button>
                    </h2>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      hidden={!isOpen}
                      className="px-5 pb-5"
                    >
                      <p className="border-t border-line pt-4 text-body-sm leading-relaxed text-ink-soft">
                        {pickLocalized(faq.answer, locale)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-10 rounded-lg border border-line bg-surface-sunken p-6">
            <p className="text-body-sm text-ink-soft">{t("faq.still.question")}</p>
            <a
              href="https://wa.me/96171000000"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-accent px-5 font-mono text-body-sm text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Icon name="whatsapp" size={16} />
              {t("vehicle.whatsapp")}
              <span className="sr-only">{t("a11y.openInNewTab")}</span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

export default FaqPage;
