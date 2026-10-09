import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn.js";
import { useLocaleContext, usePick } from "../../i18n/context.js";
import { formatMoney } from "../../lib/money.js";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import { useJourneyLink } from "../search/useJourneyLink.js";
import { srcSetString } from "../../lib/srcSet.js";
import Icon from "../../components/ui/Icon.jsx";
import Picture from "../../components/ui/Picture.jsx";
import StatusMark from "../../components/ui/StatusMark.jsx";
import {
  availabilityLabelKey,
  specCells,
  vehicleAlt,
  vehicleName,
} from "./vehicleDisplay.js";

const pad = (n) => String(n).padStart(2, "0");

/**
 * Fleet reel — the homepage's editorial presentation of the fleet.
 *
 * ## Why this and not a grid
 *
 * The previous version was six identical bordered cards: two badges per
 * photograph, a boxed spec table, and the same four inclusion chips repeated
 * verbatim on every single vehicle — six copies of "Air conditioning". That
 * is inventory UI, and it reads as a template. On a 390px viewport it also
 * ran 4122px before the section ended.
 *
 * This is the automotive idiom instead: one large photograph held in place
 * while the specification column scrolls past it, the picture advancing as
 * each vehicle reaches the middle of the screen. Photography leads, the type
 * is quiet, and nothing about it is a card.
 *
 * ## Restraint, specifically
 *
 * - **No scroll-jacking.** The page scrolls natively; only the *image* is
 *   `position: sticky`. An IntersectionObserver watching a 10% band at the
 *   viewport's midpoint decides which vehicle is current, so there is no
 *   scroll listener, no rAF loop and no layout thrash.
 * - **No reveals, no parallax, no transform animation.** The only motion is a
 *   500ms opacity crossfade and the progress rule's width — both of which
 *   the design system already collapses to 0.001ms under
 *   `prefers-reduced-motion` (see base.css), so reduced-motion users get an
 *   instant, correct swap rather than a degraded one.
 * - **Availability is shown only when it is news.** Every vehicle on the
 *   homepage is available, so printing "Available" six times is noise; the
 *   mark appears only for `limited` / `onRequest` / `unavailable`.
 * - **Inclusion chips are dropped here entirely.** They were identical
 *   across all vehicles and belong on the detail page where they differ.
 *
 * ## Progressive behaviour
 *
 * Below 1024px there is no pinning at all — each vehicle is a plain stacked
 * row (photograph, then specification) in normal document flow. That is the
 * layout a screen reader and a 390px phone get regardless, and it is the
 * fallback if IntersectionObserver is unavailable: the stage simply stays on
 * the first vehicle and every word remains readable.
 *
 * The stage is marked `aria-hidden`: on desktop it is a duplicate of the
 * specification column, which already carries the name, trim, specs, price
 * and link as real text. Its `<img>` elements take `alt=""` for the same
 * reason, while the stacked images on mobile — which sit beside their own
 * vehicle — keep real alternative text.
 *
 * All numbers arrive pre-computed from `quoteFleet` / `withAvailability`.
 * Nothing here does arithmetic beyond formatting.
 */
export function FleetReel({ items }) {
  const { locale, t } = useLocaleContext();
  const pickLocalized = usePick();
  const journeyLink = useJourneyLink();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(() => new Set([0]));
  const activeRef = useRef(0);
  const listRef = useRef(null);

  const total = items.length;

  // Only commit a real change: the observer can report the same step twice
  // during a slow scroll, and re-setting state there would restart the
  // crossfade on an image that is already showing. `total` closes over the
  // valid range, so the callback is rebuilt if the dataset ever changes —
  // which also re-arms the observer below via its `goTo` dependency.
  const goTo = useCallback(
    (index) => {
      if (!Number.isInteger(index)) return;
      if (index < 0 || index >= total) return;
      if (index === activeRef.current) return;
      activeRef.current = index;
      setActive(index);
    },
    [total],
  );

  useEffect(() => {
    const root = listRef.current;
    if (!root || typeof IntersectionObserver === "undefined" || total < 2) return;

    const steps = Array.from(root.querySelectorAll("[data-reel-step]"));
    if (steps.length !== total) return;

    const visible = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number(entry.target.dataset.reelStep);
          if (entry.isIntersecting) visible.add(index);
          else visible.delete(index);
        }
        if (!visible.size) return; // between steps: hold the last vehicle

        const mid = window.innerHeight / 2;
        let best = null;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const index of visible) {
          const rect = steps[index].getBoundingClientRect();
          const distance = Math.abs((rect.top + rect.bottom) / 2 - mid);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = index;
          }
        }
        if (best !== null) goTo(best);
      },
      // A 10%-tall band across the middle of the viewport: exactly one step
      // can own it, so "which vehicle is current" never flickers between two.
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    for (const step of steps) observer.observe(step);
    return () => observer.disconnect();
  }, [goTo, total, isDesktop]);

  const markReady = useCallback((index) => {
    setReady((current) => (current.has(index) ? current : new Set(current).add(index)));
  }, []);

  if (!total) return null;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
      {/*
        Stage — desktop only, and deliberately aria-hidden: the specification
        column below is the source of truth, this is its picture.
      */}
      {isDesktop ? (
        <div className="hidden lg:block" aria-hidden="true">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
            <figure className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-surface-sunken">
              {items.map((item, index) =>
                item.cover ? (
                  <img
                    key={item.vehicle.id}
                    src={item.cover.src}
                    srcSet={srcSetString(item.cover) || undefined}
                    sizes="(min-width: 1024px) 640px, 100vw"
                    alt=""
                    width={item.cover.width}
                    height={item.cover.height}
                    loading="lazy"
                    decoding="async"
                    onLoad={() => markReady(index)}
                    className={cn(
                      "absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out",
                      index === active && ready.has(index) ? "opacity-100" : "opacity-0",
                    )}
                  />
                ) : null,
              )}
            </figure>

            {/* Index + progress: state, not decoration — it tells you how
                much of the fleet you have moved through. */}
            <div className="mt-4 flex items-center gap-4">
              <span className="font-mono text-caption text-ink-muted" data-keep-mono>
                {pad(active + 1)}
                <span className="text-ink-faint"> / {pad(total)}</span>
              </span>
              <span className="relative h-px flex-1 bg-line">
                <span
                  className="absolute inset-y-0 start-0 bg-accent transition-[width] duration-500 ease-out"
                  style={{ width: `${((active + 1) / total) * 100}%` }}
                />
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <ol
        ref={listRef}
        className={cn(
          isDesktop
            ? // Sticky reel: one column of steps beside the stage.
              "flex flex-col"
            : // Phone is a single editorial stack; 640–1023 goes two-up so a
              // full-width photograph at tablet size doesn't run the section
              // to five thousand pixels.
              "flex flex-col gap-6 sm:grid sm:grid-cols-2 sm:items-start sm:gap-x-8 sm:gap-y-10",
        )}
      >
        {items.map(({ vehicle, quote, availability, category }, index) => {
          const name = vehicleName(vehicle, locale);
          const state = availability?.state ?? vehicle.availability;
          const cells = specCells(vehicle, locale, t).slice(0, 4);
          const currency = quote?.currency ?? vehicle.pricing?.currency ?? "USD";
          const fmt = (v) =>
            formatMoney(v, { locale: locale === "ar" ? "ar" : "en-US", currency });
          const meta = [
            pickLocalized(category?.name ?? { en: vehicle.categoryId }, locale, vehicle.categoryId),
            pickLocalized(vehicle.trimName, locale),
            vehicle.year,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <li
              key={vehicle.id}
              data-reel-step={index}
              onFocusCapture={() => goTo(index)}
              className={cn(
                isDesktop
                  ? "flex min-h-[42svh] flex-col justify-center border-t border-line py-9 first:border-t-0"
                  : "flex flex-col border-t border-line py-7 first:border-t-0 sm:border-t-0 sm:py-0",
              )}
            >
              {!isDesktop && vehicle.media?.[0] ? (
                <Picture
                  asset={vehicle.media[0]}
                  alt={vehicleAlt(vehicle, locale, 0)}
                  sizes="(min-width: 640px) 640px, 100vw"
                  ratio="4 / 3"
                  className="mb-5 rounded-lg border border-line"
                />
              ) : null}

              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-caption text-ink-faint" data-keep-mono>
                  {pad(index + 1)}
                </span>
                {state !== "available" ? (
                  <StatusMark
                    tone={state}
                    label={t(availabilityLabelKey(state))}
                    size="sm"
                  />
                ) : null}
              </div>

              <h3 className="mt-2">
                <Link
                  to={journeyLink(`/vehicle/${vehicle.id}`)}
                  className="group/name inline-flex min-h-11 items-center gap-2 text-title-1 font-medium tracking-tight text-ink transition-colors duration-200 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {name}
                  <Icon
                    name={locale === "ar" ? "arrowLeft" : "arrowRight"}
                    size={17}
                    className="shrink-0 text-ink-faint transition-colors duration-200 group-hover/name:text-accent"
                  />
                </Link>
              </h3>

              <p className="label-micro text-ink-faint" data-keep-mono>
                {meta}
              </p>

              {/* Spec sheet: hairlines top and bottom, no box. Same cells as
                  the card because they are the same facts — what changed is
                  that nothing is drawn around them. */}
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-y border-line py-3">
                {cells.map((cell) => (
                  <div key={cell.key} className="min-w-0">
                    <dt className="label-micro truncate text-ink-faint">{cell.label}</dt>
                    <dd className="mt-0.5 flex items-center gap-1 text-caption font-medium text-ink-soft">
                      <Icon name={cell.icon} size={13} className="text-ink-faint" />
                      <span className="truncate">{cell.value}</span>
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-4">
                <span className="block text-caption text-ink-muted">
                  {quote?.hasDates ? t("card.perDay") : t("card.from")}
                </span>
                <span className="block text-title-2 font-medium tracking-tight text-ink">
                  {fmt(
                    quote?.hasDates
                      ? quote.discountedDailyRate ?? quote.dailyRate
                      : quote?.dailyRate ?? vehicle.pricing.daily,
                  )}
                  <span className="ml-1.5 text-caption font-normal text-ink-muted">
                    {quote?.hasDates ? "" : t("card.perDay")}
                  </span>
                </span>
                {quote?.hasDates ? (
                  <span className="block text-caption text-ink-muted">
                    {t("card.tripTotal")}{" "}
                    <span data-keep-mono className="text-ink-soft">
                      {fmt(quote.total)}
                    </span>{" "}
                    · {t("card.dayCount", { count: quote.days })}
                  </span>
                ) : null}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Loading geometry for the reel.
 *
 * Deliberately mirrors FleetReel's own structure — the same grid, the same
 * `min-h-[42svh]` steps, the same hairline separators — because a skeleton
 * that doesn't match its destination causes exactly the layout shift it was
 * supposed to prevent. `useMediaQuery` is shared with the reel so the mobile
 * stack and the desktop stage each get the right placeholder.
 */
export function FleetReelSkeleton({ count = 4 }) {
  const { t } = useLocaleContext();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const steps = Array.from({ length: count }).map((_, i) => (
    <div
      key={i}
      className={cn(
        isDesktop
          ? "flex min-h-[42svh] flex-col justify-center border-t border-line py-9 first:border-t-0"
          : "flex flex-col border-t border-line py-7 first:border-t-0 sm:border-t-0 sm:py-0",
      )}
    >
      {!isDesktop ? (
        <div className="mb-5 aspect-[4/3] w-full animate-pulse rounded-lg border border-line bg-surface-sunken" />
      ) : null}
      <div className="h-3 w-8 animate-pulse rounded-xs bg-surface-sunken" />
      <div className="mt-3 h-7 w-2/3 animate-pulse rounded-xs bg-surface-sunken" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded-xs bg-surface-sunken" />
      {/* Must match the spec sheet (2×2) or the column shifts on load. */}
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-y border-line py-3">
        {[0, 1, 2, 3].map((k) => (
          <div key={k} className="space-y-1.5">
            <div className="h-2.5 w-2/3 animate-pulse rounded-xs bg-surface-sunken" />
            <div className="h-3 w-1/2 animate-pulse rounded-xs bg-surface-sunken" />
          </div>
        ))}
      </div>
      <div className="mt-4 h-9 w-1/3 animate-pulse rounded-xs bg-surface-sunken" />
    </div>
  ));

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t("fleet.loading")}
      className={cn(
        isDesktop
          ? "grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-14"
          : "flex flex-col gap-6 sm:grid sm:grid-cols-2 sm:items-start sm:gap-x-8 sm:gap-y-10",
      )}
    >
      {isDesktop ? (
        <>
          <div>
            <div className="aspect-[4/3] w-full animate-pulse rounded-lg border border-line bg-surface-sunken" />
            <div className="mt-4 h-3 w-28 animate-pulse rounded-xs bg-surface-sunken" />
          </div>
          {/* Wrapped so all steps land in column 2 of the reel grid. */}
          <div>{steps}</div>
        </>
      ) : (
        steps
      )}
    </div>
  );
}

export default FleetReel;
