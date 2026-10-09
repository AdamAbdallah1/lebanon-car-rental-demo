import { useNavigate } from "react-router-dom";
import { useLocaleContext, usePick } from "../i18n/context.js";
import { useSearchState } from "../features/search/useSearchState.js";
import { fleetHref, withDefaultDates } from "../features/search/searchState.js";
import HeroSearch from "../features/search/HeroSearch.jsx";
import { repositories } from "../lib/repositories/index.js";
import { useAsyncData } from "../hooks/useAsyncData.js";

/**
 * Hero — full-bleed photo, one centered column.
 *
 * Stack: eyebrow → serif H1 → lede → booking panel → trust line → demo
 * notice → scroll cue, all centered over a single image.
 *
 * This is deliberately not the split "copy left / framed photo right" layout.
 * A `border rounded-lg aspect-[4/5]` frame around a car photo is the strongest
 * cheap signal in this category — it reads as a dealership listing rather than
 * a brand. The image is edge-to-edge and the copy sits on a light scrim.
 *
 * The scrim is *light* on purpose. The photo was picked for a dark headline
 * zone — measured relative luminance 0.072, so white copy already sits at
 * 8.6:1 on the raw frame — and the research is explicit that a flat wash over
 * a good photograph "deadens" it. What is here instead:
 *
 *   • a radial lift under the copy, so the darkening follows the type;
 *   • a 5-stop vertical ramp that opens up through the middle band (two-stop
 *     gradients band and leave a visible Mach line where the falloff starts);
 *   • an opaque #1b1a15 section background, so the white stack is readable
 *     during load, with images disabled, and if the CDN fails.
 *
 * The alphas are not eyeballed: the QA harness hides this copy, re-shoots the
 * viewport, and requires white ≥ 3:1 (large text) / the composited colour
 * ≥ 4.5:1 (body text) against the brightest pixel actually behind each box.
 */
const SCRIM = [
  // local lift behind the centered copy
  "radial-gradient(ellipse 82% 66% at 50% 40%, rgb(12 11 8 / 0.36) 0%, rgb(12 11 8 / 0.20) 55%, rgb(12 11 8 / 0) 100%)",
  // Vertical ramp: darker at the very top (the eyebrow and the seam under the
  // header), lightest through the picture band, then grounding the trust line
  // and demo notice at the bottom.
  //
  // The 30% and 76% stops carry the copy: the lede sits on a near-white
  // highlight in the portrait frame, and the trust line crosses a bright patch
  // of road at 768/1440/1920. Measured against the raw photo, those two bands
  // need ~0.38 and ~0.58 composite alpha to hold 4.5:1 — the earlier, lighter
  // values left six checks short. The picture band at 48% is deliberately
  // unchanged so the frame still opens up through the middle.
  "linear-gradient(180deg, rgb(12 11 8 / 0.46) 0%, rgb(12 11 8 / 0.38) 30%, rgb(12 11 8 / 0.18) 48%, rgb(12 11 8 / 0.58) 76%, rgb(12 11 8 / 0.76) 100%)",
].join(", ");

export function Hero() {
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();
  const { state, setState } = useSearchState();
  const navigate = useNavigate();
  const { data } = useAsyncData(() => repositories.getHomeSections(), []);

  const section = data?.find((s) => s.type === "hero") ?? null;

  const eyebrow = section ? pickLocalized(section.eyebrow, locale) : t("hero.eyebrow");
  const title = section ? pickLocalized(section.title, locale) : t("hero.title");
  const lede = section ? pickLocalized(section.lede, locale) : t("hero.lede");
  const heroImage = section?.image ?? null;

  const srcSet = (heroImage?.srcSet ?? [])
    .map((entry) => `${entry.url} ${entry.width}w`)
    .join(", ");

  // Native portrait served under 640px — see the note in the hero seed.
  const heroMobile = section?.imageMobile ?? null;
  const mobileSrcSet = (heroMobile?.srcSet ?? [])
    .map((entry) => `${entry.url} ${entry.width}w`)
    .join(", ");

  const searchValue = withDefaultDates(state);

  const trust = [
    t("hero.trust.delivery"),
    t("hero.trust.pricing"),
    t("hero.trust.request"),
  ];

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[max(600px,calc(100svh_-_var(--header-h)))] flex-col overflow-clip border-b border-line bg-[#1b1a15]"
    >
      {heroImage ? (
        /*
         * `picture`, not a lone <img>: narrow viewports get the portrait frame
         * below, so nothing is ever centre-sliced into a thin band with the
         * wheels cut off. Focal point stays dead centre — both frames were
         * cover-cropped at 390/430/768/1440/1920 and the car stays whole with
         * `center` at every width, so no per-breakpoint nudging is needed.
         */
        <picture className="absolute inset-0 block h-full w-full">
          {heroMobile && mobileSrcSet ? (
            <source media="(max-width: 640px)" srcSet={mobileSrcSet} sizes="100vw" />
          ) : null}
          <img
            src={heroImage.src}
            srcSet={srcSet || undefined}
            sizes="100vw"
            alt={pickLocalized(heroImage.alt, locale) || t("hero.imageAlt")}
            width={heroImage.width}
            height={heroImage.height}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </picture>
      ) : null}

      <div aria-hidden="true" className="absolute inset-0" style={{ background: SCRIM }} />

      <div className="container-page relative flex flex-1 flex-col items-center justify-center pb-[clamp(72px,12vh,120px)] pt-[clamp(56px,9vh,104px)] text-center">
        {/* The rule sits above, not beside: in a centered stack a leading rule
            reads as a stray mark hanging off the left edge. */}
        <p className="flex flex-col items-center gap-3">
          <span className="h-px w-8 bg-accent" aria-hidden="true" />
          <span className="label-micro text-white/90">{eyebrow}</span>
        </p>

        <h1
          id="hero-title"
          className="mt-5 max-w-[18ch] text-balance font-display text-display-hero text-white"
        >
          {title}
        </h1>

        <p className="mt-6 max-w-[58ch] text-[1.0625rem] leading-relaxed text-white/95 lg:text-[1.125rem]">
          {lede}
        </p>

        <div className="mt-10 w-full max-w-[1040px]">
          <HeroSearch
            value={searchValue}
            onChange={(next) => setState(next, { replace: true })}
            // Submitting has to produce results. Writing the params back onto
            // the page the user is already looking at left "Search fleet"
            // looking inert — fleetHref hands the identical state to the fleet
            // page, which is the route that actually applies it.
            onSubmit={(next) => navigate(fleetHref(next))}
          />
        </div>

        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[0.875rem] font-medium leading-snug text-white/90">
          {trust.map((item, i) => (
            <li key={item} className="flex items-center gap-3">
              {i > 0 ? (
                <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-white/45" />
              ) : null}
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-caption text-white/80">{t("demo.notice")}</p>

        {/* White, not accent: the accent CTA measures ~2.7:1 against this
            dark photo, under the 3:1 required of a focus indicator. */}
        <a
          href="#fleet-showcase"
          className="mt-8 hidden min-h-11 items-center gap-2 text-body-sm text-white/90 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:inline-flex"
        >
          {t("hero.scroll")}
          <span aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  );
}

export default Hero;
