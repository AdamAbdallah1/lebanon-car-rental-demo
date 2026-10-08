import { Link } from "react-router-dom";
import { useLocaleContext, usePick } from "../i18n/context.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { repositories } from "../lib/repositories/index.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import PageHeader from "../components/layout/PageHeader.jsx";
import Icon from "../components/ui/Icon.jsx";
import { formatPercent } from "../lib/money.js";

/**
 * About is written as a plain statement of what this product is — a
 * demonstration — rather than a story with invented history, awards or
 * partner logos.
 */
export function AboutPage() {
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();

  useDocumentMeta({
    title: "About",
    description:
      "Cedars Drive is a fictional car rental demonstration product built by Cedars Tech.",
    path: "/about",
  });

  const { data: settings } = useAsyncData(() => repositories.getSiteSettings(), []);

  const facts = [
    { id: "currency", label: "about.fact.currency", value: settings?.currency ?? "USD" },
    {
      id: "vat",
      label: "about.fact.vat",
      value: formatPercent(settings?.vatRate ?? 0.11, { locale }),
    },
    {
      id: "window",
      label: "about.fact.window",
      value: t("search.days", { count: settings?.reservationWindowDays ?? 90 }),
    },
    {
      id: "locales",
      label: "about.fact.locales",
      value: t("nav.language"),
    },
  ];

  const chapters = [
    {
      id: "what",
      titleKey: "about.chapter.what.title",
      bodyKey: "about.chapter.what.body",
      icon: "info",
    },
    {
      id: "how",
      titleKey: "about.chapter.how.title",
      bodyKey: "about.chapter.how.body",
      icon: "route",
    },
    {
      id: "data",
      titleKey: "about.chapter.data.title",
      bodyKey: "about.chapter.data.body",
      icon: "shield",
    },
    {
      id: "honest",
      titleKey: "about.chapter.honest.title",
      bodyKey: "about.chapter.honest.body",
      icon: "check",
    },
  ];

  return (
    <>
      <PageHeader eyebrow={t("nav.about")} title={t("about.title")} lede={t("about.lede")} />

      <section className="block-pad" aria-label={t("about.title")}>
        <div className="container-page flex flex-col gap-14">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.id} className="flex flex-col gap-1 bg-surface p-5">
                <dt className="label-micro text-ink-faint">{t(fact.label)}</dt>
                <dd className="font-mono text-title-2 text-ink" data-keep-mono>
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {chapters.map((chapter) => (
              <article
                key={chapter.id}
                className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-full border border-accent-line bg-accent-soft text-accent">
                  <Icon name={chapter.icon} size={17} />
                </span>
                <h2 className="text-title-2 font-medium text-ink">{t(chapter.titleKey)}</h2>
                <p className="text-body-sm leading-relaxed text-ink-soft">{t(chapter.bodyKey)}</p>
              </article>
            ))}
          </div>

          <div className="rounded-lg border border-line bg-surface-sunken p-6 lg:p-8">
            <p className="max-w-3xl text-body leading-relaxed text-ink-soft">
              {pickLocalized(settings?.demoNotice ?? { en: "", ar: "" }, locale)}
            </p>
            <p className="mt-4 max-w-3xl text-caption leading-relaxed text-ink-muted">
              {t("footer.legal")}
            </p>
            <Link
              to="/contact"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md border border-ink px-5 font-mono text-body-sm text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {t("contact.title")}
              <Icon name={locale === "ar" ? "arrowLeft" : "arrowRight"} size={15} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default AboutPage;
