import { Link, useParams } from "react-router-dom";
import { useLocaleContext, usePick } from "../i18n/context.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { repositories } from "../lib/repositories/index.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import PageHeader from "../components/layout/PageHeader.jsx";
import Button from "../components/ui/Button.jsx";
import Icon from "../components/ui/Icon.jsx";
import { formatMoney } from "../lib/money.js";

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-line py-3 last:border-b-0">
      <dt className="text-body-sm text-ink-muted">{label}</dt>
      <dd className="text-right text-body-sm text-ink" data-keep-mono>
        {value}
      </dd>
    </div>
  );
}

export function LocationDetailPage() {
  const { locationId } = useParams();
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();

  const { data: location, loading, error, reload } = useAsyncData(
    () => repositories.getLocationById(locationId),
    [locationId],
  );

  useDocumentMeta({
    title: location
      ? pickLocalized(location.shortName ?? location.name, locale)
      : "Location",
    description: location
      ? pickLocalized(location.address, locale)
      : "Pick-up and return point.",
    path: `/locations/${locationId ?? ""}`,
  });

  if (error) {
    return (
      <section className="block-pad">
        <div className="container-page">
          <div role="alert" className="rounded-lg border border-status-closed/30 bg-status-closed-soft px-6 py-16 text-center">
            <p className="text-title-2 text-ink">{t("locations.error.title")}</p>
            <p className="mt-2 text-body-sm text-ink-soft">{t("locations.error.body")}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-6 min-h-11 rounded-md border border-ink px-5 font-mono text-body-sm text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {t("states.retry")}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (loading && !location) {
    return (
      <section className="block-pad" aria-busy="true" aria-live="polite">
        <div className="container-page flex flex-col gap-6">
          <div className="h-10 w-64 animate-pulse rounded bg-surface-sunken" />
          <div className="h-40 w-full animate-pulse rounded-lg bg-surface-sunken" />
          <span className="sr-only">{t("states.loading")}</span>
        </div>
      </section>
    );
  }

  if (!location) {
    return (
      <section className="block-pad">
        <div className="container-page py-16 text-center">
          <p className="font-display text-display-2 text-ink" data-display-font>
            {t("locations.notFound.title")}
          </p>
          <Link
            to="/locations"
            className="mt-6 inline-flex min-h-11 items-center rounded-md border border-ink px-5 font-mono text-body-sm text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t("nav.locations")}
          </Link>
        </div>
      </section>
    );
  }

  const name = pickLocalized(location.shortName ?? location.name, locale);
  const fee = location.serviceFee ?? 0;

  return (
    <>
      <PageHeader
        eyebrow={t(`locations.group.${location.group}`)}
        title={name}
        lede={pickLocalized(location.address, locale)}
        actions={
          <Button as={Link} to="/fleet" variant="primary">
            {t("search.submit")}
            <Icon name={locale === "ar" ? "arrowLeft" : "arrowRight"} size={15} />
          </Button>
        }
      />

      <section className="block-pad" aria-label={name}>
        <div className="container-page grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-6">
            <h2 className="text-title-1 font-medium text-ink">{t("locations.details")}</h2>

            <p className="max-w-2xl font-display text-display-3 leading-snug text-ink" data-display-font>
              {pickLocalized(location.name, locale)}
            </p>

            <p className="max-w-2xl text-body-lg leading-relaxed text-ink-soft">
              {pickLocalized(location.address, locale)}
            </p>

            <dl className="rounded-lg border border-line bg-surface">
              <DetailRow label={t("locations.area")} value={pickLocalized(location.area, locale)} />
              <DetailRow label={t("locations.hours")} value={`${location.hours.open} – ${location.hours.close} · ${location.hours.days}`} />
              <DetailRow
                label={t("locations.fee")}
                value={
                  fee > 0
                    ? `+${formatMoney(fee, { locale: locale === "ar" ? "ar" : "en-US" })}`
                    : t("locations.free")
                }
              />
              <DetailRow label={t("spec.availability")} value={location.status === "active" ? t("card.availability.available") : t("card.availability.unavailable")} />
            </dl>

            <div className="flex flex-wrap gap-3">
              <Link
                to={`/fleet?loc=${encodeURIComponent(location.id)}`}
                className="inline-flex min-h-12 items-center gap-2 rounded-md bg-accent px-5 font-mono text-body-sm text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {t("locations.pickup")}
                <Icon name={locale === "ar" ? "arrowLeft" : "arrowRight"} size={15} />
              </Link>
              <Link
                to="/locations"
                className="inline-flex min-h-12 items-center rounded-md border border-ink px-5 font-mono text-body-sm text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {t("nav.locations")}
              </Link>
            </div>
          </div>

          <aside className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
            <h2 className="text-title-3 font-medium text-ink">{t("contact.title")}</h2>
            <p className="text-body-sm text-ink-soft">{t("locations.lede")}</p>
            <ul className="mt-2 flex flex-col gap-3">
              <li className="flex items-center gap-3 text-body-sm text-ink">
                <Icon name="mail" size={15} className="text-accent" />
                <a
                  href="mailto:hello@cedarsdrive.example"
                  className="inline-flex min-h-11 items-center underline decoration-line underline-offset-4 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  hello@cedarsdrive.example
                </a>
              </li>
              <li className="flex items-center gap-3 text-body-sm text-ink">
                <Icon name="whatsapp" size={15} className="text-accent" />
                <a
                  href="https://wa.me/96171000000"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center underline decoration-line underline-offset-4 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  +961 71 000 000
                </a>
                <span className="sr-only">{t("a11y.openInNewTab")}</span>
              </li>
            </ul>

            <p className="mt-4 border-t border-line pt-4 text-caption text-ink-muted">
              {t("demo.notice")}
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}

export default LocationDetailPage;
