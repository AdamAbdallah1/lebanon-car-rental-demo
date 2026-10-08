import { useLocaleContext, usePick } from "../i18n/context.js";
import { useSearchState } from "../features/search/useSearchState.js";
import { withDefaultDates } from "../features/search/searchState.js";
import HeroSearch from "../features/search/HeroSearch.jsx";
import Picture from "../components/ui/Picture.jsx";
import { repositories } from "../lib/repositories/index.js";
import { useAsyncData } from "../hooks/useAsyncData.js";

export function Hero() {
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();
  const { state, setState } = useSearchState();
  const { data } = useAsyncData(() => repositories.getHomeSections(), []);

  const section = data?.find((s) => s.type === "hero") ?? null;

  const eyebrow = section ? pickLocalized(section.eyebrow, locale) : t("hero.eyebrow");
  const title = section ? pickLocalized(section.title, locale) : t("hero.title");
  const lede = section ? pickLocalized(section.lede, locale) : t("hero.lede");
  const heroImage = section?.image ?? null;

  const searchValue = withDefaultDates(state);

  return (
    <section aria-labelledby="hero-title" className="relative border-b border-line">
      <div className="container-page grid grid-cols-1 gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:py-16">
        <div className="flex flex-col gap-6">
          <p className="flex items-center gap-3">
            <span className="h-px w-8 bg-accent" aria-hidden="true" />
            <span className="label-micro text-ink-muted">{eyebrow}</span>
          </p>

          <h1
            id="hero-title"
            className="font-display text-display-1 text-ink"
            data-display-font
          >
            {title}
          </h1>

          <p className="max-w-xl text-body-lg leading-relaxed text-ink-soft">{lede}</p>

          <HeroSearch
            value={searchValue}
            onChange={(next) => setState(next, { replace: true })}
            onSubmit={(next) => setState(next, { replace: false })}
          />

          <p className="text-caption text-ink-muted">
            {t("demo.notice")}
          </p>
        </div>

        <figure className="relative m-0 lg:order-last">
          <Picture
            asset={heroImage}
            alt={
              (heroImage && pickLocalized(heroImage.alt, locale)) || t("hero.imageAlt")
            }
            ratio="4 / 3"
            priority
            sizes="(min-width: 1024px) 46vw, 100vw"
            className="rounded-lg border border-line lg:aspect-[4/5] lg:h-full"
          />
        </figure>
      </div>

      <div className="container-page hidden pb-6 lg:block">
        <a
          href="#fleet-showcase"
          className="inline-flex min-h-11 items-center gap-2 text-body-sm text-ink-soft transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {t("hero.scroll")}
          <span aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  );
}

export default Hero;
