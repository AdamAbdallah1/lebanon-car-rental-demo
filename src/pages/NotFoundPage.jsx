import { Link, useLocation } from "react-router-dom";
import { useLocaleContext } from "../i18n/context.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import Button from "../components/ui/Button.jsx";
import Icon from "../components/ui/Icon.jsx";

export function NotFoundPage() {
  const { t, locale } = useLocaleContext();
  const location = useLocation();

  useDocumentMeta({
    title: "Page not found",
    description: "This page does not exist on the Cedars Drive demonstration.",
    path: location.pathname,
  });

  return (
    <section className="block-pad">
      <div className="container-page flex flex-col items-start gap-6 py-16 lg:py-24">
        <p className="flex items-center gap-3">
          <span className="h-px w-8 bg-accent" aria-hidden="true" />
          <span className="label-micro text-ink-muted">404</span>
        </p>

        <h1 className="max-w-2xl font-display text-display-1 text-ink" data-display-font>
          {t("notFound.title")}
        </h1>

        <p className="max-w-xl text-body-lg leading-relaxed text-ink-soft">
          {t("notFound.body")}
        </p>

        <p className="font-mono text-caption text-ink-faint" data-keep-mono>
          {location.pathname}
        </p>

        <div className="mt-2 flex flex-wrap gap-3">
          <Button as={Link} to="/" variant="primary" size="lg">
            {t("notFound.home")}
          </Button>
          <Button as={Link} to="/fleet" variant="secondary" size="lg">
            {t("fleet.browseAll")}
            <Icon name={locale === "ar" ? "arrowLeft" : "arrowRight"} size={15} />
          </Button>
        </div>
      </div>
    </section>
  );
}

export default NotFoundPage;
