import { Link } from "react-router-dom";
import { useLocaleContext } from "../i18n/context.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { repositories } from "../lib/repositories/index.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import Hero from "../sections/Hero.jsx";
import FleetShowcase from "../sections/FleetShowcase.jsx";
import LocationStrip from "../sections/LocationStrip.jsx";
import Steps from "../sections/Steps.jsx";
import Button from "../components/ui/Button.jsx";

export function HomePage() {
  const { t } = useLocaleContext();
  const { data: settings } = useAsyncData(() => repositories.getSiteSettings(), []);

  useDocumentMeta({
    title: "Car rental in Lebanon",
    description:
      "Car rental in Lebanon. Airport, city and hotel delivery with clear daily rates and stated deposits.",
    path: "/",
  });

  return (
    <>
      <Hero />
      <FleetShowcase limit={6} />
      <LocationStrip />
      <Steps />

      <section aria-labelledby="home-cta-title" className="section-pad bg-surface">
        <div className="container-page flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2
              id="home-cta-title"
              className="font-display text-display-3 text-ink"
              data-display-font
            >
              {settings?.tagline ? settings.tagline.en : t("hero.title")}
            </h2>
            <p className="mt-4 text-body-lg text-ink-soft">{t("booking.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button as={Link} to="/fleet" size="lg">
              {t("fleet.browseAll")}
            </Button>
            <Button as={Link} to="/contact" variant="secondary" size="lg">
              {t("nav.contact")}
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

export default HomePage;
