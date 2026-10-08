import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn.js";
import { useLocaleContext, usePick } from "../../i18n/context.js";
import Icon from "../../components/ui/Icon.jsx";
import Picture from "../../components/ui/Picture.jsx";
import { useReducedMotion } from "../../hooks/useReducedMotion.js";

/**
 * Gallery: one large horizontal strip with native scroll-snap (works with
 * touch, trackpad and keyboard-focusable slides) plus a full-screen lightbox.
 *
 * No carousel library — the browser already does this well, and reduced-motion
 * simply turns snapping off.
 */
export function Gallery({ media = [], altFor, label }) {
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();
  const reduced = useReducedMotion();
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  const slides = media.filter(Boolean);
  const count = slides.length;

  const scrollToIndex = useCallback(
    (next) => {
      const track = trackRef.current;
      if (!track) return;
      const clamped = Math.max(0, Math.min(count - 1, next));
      const slide = track.children[clamped];
      if (!slide) return;
      track.scrollTo({
        left: slide.offsetLeft - track.offsetLeft,
        behavior: reduced ? "auto" : "smooth",
      });
      setIndex(clamped);
    },
    [count, reduced],
  );

  // Track the snapped slide as the user swipes.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const center = track.scrollLeft + track.clientWidth / 2;
        let best = 0;
        let bestDistance = Infinity;
        Array.from(track.children).forEach((child, i) => {
          const mid = child.offsetLeft - track.offsetLeft + child.clientWidth / 2;
          const distance = Math.abs(mid - center);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = i;
          }
        });
        setIndex(best);
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [count]);

  // Lightbox: Escape closes, focus moves in and returns to the trigger.
  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowRight") setIndex((i) => Math.min(count - 1, i + 1));
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (event.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll("button:not([disabled])");
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      cancelAnimationFrame(raf);
    };
  }, [lightboxOpen, count]);

  if (!count) return null;

  return (
    <div className="relative">
      <div
        ref={trackRef}
        role="group"
        aria-label={label ?? t("vehicle.gallery")}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            scrollToIndex(index + 1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            scrollToIndex(index - 1);
          }
        }}
        className={cn(
          "scroll-none -mx-[var(--spacing-gutter)] flex snap-x snap-mandatory gap-3 overflow-x-auto",
          "px-[var(--spacing-gutter)] pb-3",
          reduced && "[scroll-behavior:auto]",
        )}
        style={{ scrollBehavior: reduced ? "auto" : "smooth" }}
      >
        {slides.map((asset, i) => (
          <figure
            key={asset.id ?? i}
            className="m-0 w-[86%] shrink-0 snap-start sm:w-[70%] lg:w-[58%]"
          >
            <button
              type="button"
              onClick={() => {
                setIndex(i);
                setLightboxOpen(true);
              }}
              aria-label={t("vehicle.galleryOpen", { index: i + 1, total: count })}
              className="block w-full rounded-lg focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent"
            >
              <Picture
                asset={asset}
                alt={typeof altFor === "function" ? altFor(asset, i) : (asset.alt?.[locale] ?? "")}
                ratio="3 / 2"
                priority={i === 0}
                sizes="(min-width: 1024px) 58vw, 86vw"
                className={cn(
                  "border transition-colors duration-[280ms]",
                  i === index ? "border-ink" : "border-line",
                )}
              />
            </button>
          </figure>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="label-micro text-ink-faint" aria-live="polite" data-keep-mono>
          {t("vehicle.lightbox.counter", { current: index + 1, total: count })}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollToIndex(index - 1)}
            disabled={index === 0}
            aria-label={t("vehicle.lightbox.prev")}
            className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-ink disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Icon name={locale === "ar" ? "chevronRight" : "chevronLeft"} size={16} />
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(index + 1)}
            disabled={index === count - 1}
            aria-label={t("vehicle.lightbox.next")}
            className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-ink disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Icon name={locale === "ar" ? "chevronLeft" : "chevronRight"} size={16} />
          </button>
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-surface px-4 font-mono text-caption text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            data-keep-mono
          >
            {t("vehicle.gallery")}
          </button>
        </div>
      </div>

      {lightboxOpen ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("vehicle.gallery")}
          className="fixed inset-0 z-modal flex flex-col bg-night/97 p-4 sm:p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="label-micro text-white/60" data-keep-mono>
              {t("vehicle.lightbox.counter", { current: index + 1, total: count })}
            </p>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label={t("vehicle.lightbox.close")}
              className="inline-flex size-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          <div className="flex flex-1 items-center justify-center gap-3 py-4">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              aria-label={t("vehicle.lightbox.prev")}
              className="inline-flex size-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-white disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Icon name={locale === "ar" ? "chevronRight" : "chevronLeft"} size={18} />
            </button>

            <figure className="m-0 max-h-full w-full max-w-4xl">
              <img
                src={slides[index].src}
                srcSet={(slides[index].srcSet ?? [])
                  .map((entry) => `${entry.url} ${entry.width}w`)
                  .join(", ")}
                sizes="(min-width: 896px) 896px, 100vw"
                alt={
                  typeof altFor === "function"
                    ? altFor(slides[index], index)
                    : (pickLocalized(slides[index].alt, locale) ?? "")
                }
                className="mx-auto max-h-[70vh] w-auto rounded-md object-contain"
              />
            </figure>

            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(count - 1, i + 1))}
              disabled={index === count - 1}
              aria-label={t("vehicle.lightbox.next")}
              className="inline-flex size-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-white disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Icon name={locale === "ar" ? "chevronLeft" : "chevronRight"} size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Gallery;
