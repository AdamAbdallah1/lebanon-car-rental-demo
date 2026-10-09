import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { cn } from "../../lib/cn.js";
import { useLocaleContext } from "../../i18n/context.js";
import { repositories } from "../../lib/repositories/index.js";
import { useAsyncData } from "../../hooks/useAsyncData.js";
import { useJourneyLink } from "../../features/search/useJourneyLink.js";
import Wordmark from "./Wordmark.jsx";
import Icon from "../ui/Icon.jsx";
import Button from "../ui/Button.jsx";

const DESKTOP_LINK =
  "relative inline-flex min-h-11 items-center px-1 text-body-sm text-ink-soft transition-colors duration-[180ms] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function ActiveRule({ isActive }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute inset-x-0 -bottom-0.5 h-px origin-left bg-accent transition-transform duration-[280ms] ease-out",
        isActive ? "scale-x-100" : "scale-x-0",
      )}
    />
  );
}

function LanguageSwitch() {
  const { locale, setLocale, t } = useLocaleContext();
  const next = locale === "en" ? "ar" : "en";

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={next === "ar" ? t("lang.switchTo") : t("lang.switchToEn")}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-md border border-line px-3",
        "font-mono text-caption text-ink-soft transition-colors duration-[180ms]",
        "hover:border-ink hover:text-ink",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
      )}
      data-keep-mono
    >
      <Icon name="globe" size={14} className="text-ink-faint" />
      <span>{next === "ar" ? "العربية" : "EN"}</span>
    </button>
  );
}

export function Header() {
  const { t, locale } = useLocaleContext();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef(null);
  const menuButtonRef = useRef(null);
  const firstLinkRef = useRef(null);
  // Keeps the pick-up point and dates alive when the renter moves between
  // the fleet, the locations and the request form.
  const journeyLink = useJourneyLink();

  const { data } = useAsyncData(() => repositories.getNavigation(), []);
  const items = data?.header ?? [];

  // The panel belongs to one route: navigating away closes it without an
  // effect (state is adjusted during render when the path changes).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  // Escape closes; focus moves into the panel on open and back to the trigger.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
      if (event.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
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
    const raf = requestAnimationFrame(() => firstLinkRef.current?.focus());
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      cancelAnimationFrame(raf);
    };
  }, [menuOpen]);

  return (
    /*
     * The menu panel is a sibling of <header>, not a child.
     *
     * `backdrop-blur` on the header makes it the containing block for its
     * `position: fixed` descendants, so a panel declared inside would resolve
     * `top: var(--header-h-mobile); bottom: 0` against the 60px header instead
     * of the viewport and collapse to a 1px strip — only the first nav row
     * would render, over the page behind it. Keeping it outside lets it size
     * to the viewport as intended. `aria-controls` matches by id, so the
     * relationship with the toggle is unaffected.
     */
    <>
      <header className="sticky top-0 z-header border-b border-line bg-canvas/92 backdrop-blur-md">
        <div className="container-page flex h-[var(--header-h-mobile)] items-center justify-between gap-4 lg:h-[var(--header-h)]">
          <Wordmark className="shrink-0" />

          <nav aria-label={t("nav.primary")} className="hidden lg:block">
            <ul className="flex items-center gap-6">
              {items.map((item) => (
                <li key={item.id}>
                  <NavLink
                    to={journeyLink(item.href)}
                    className={DESKTOP_LINK}
                    end={item.href === "/"}
                  >
                    {({ isActive }) => (
                      <>
                        {t(item.labelKey)}
                        <ActiveRule isActive={isActive} />
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitch />
            {/* The wrapper carries the responsive `hidden` — a `hidden` class on
                the button itself would lose to its own `inline-flex` base. */}
            <span className="hidden sm:block">
              <Button as={Link} to={journeyLink("/book")} size="sm">
                {t("vehicle.requestShort")}
              </Button>
            </span>

            <button
              ref={menuButtonRef}
              type="button"
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-md border border-line lg:hidden",
                "text-ink transition-colors hover:border-ink",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              )}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? t("nav.menuClose") : t("nav.menuOpen")}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Icon name={menuOpen ? "close" : "menu"} size={18} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div
          id="mobile-menu"
          ref={panelRef}
          className="fixed inset-x-0 bottom-0 top-[var(--header-h-mobile)] z-overlay border-t border-line bg-canvas lg:hidden"
        >
          <nav aria-label={t("nav.primary")} className="container-page h-full overflow-y-auto py-6">
            <ul className="flex flex-col">
              {items.map((item, index) => (
                <li key={item.id} className="border-b border-line">
                  <NavLink
                    to={journeyLink(item.href)}
                    ref={index === 0 ? firstLinkRef : undefined}
                    className={({ isActive }) =>
                      cn(
                        "flex min-h-[3.75rem] items-center justify-between text-title-2",
                        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                        isActive ? "text-accent" : "text-ink",
                      )
                    }
                    end={item.href === "/"}
                  >
                    {({ isActive }) => (
                      <>
                        <span>{t(item.labelKey)}</span>
                        <Icon
                          name={locale === "ar" ? "chevronLeft" : "chevronRight"}
                          className={isActive ? "text-accent" : "text-ink-faint"}
                        />
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3">
              <Button as={Link} to={journeyLink("/book")} size="lg">
                {t("vehicle.request")}
              </Button>
              <Button as={Link} to={journeyLink("/faq")} variant="quiet" size="lg">
                {t("nav.faq")}
              </Button>
            </div>

            <p className="mt-8 max-w-prose text-caption text-ink-muted">{t("demo.notice")}</p>
          </nav>
        </div>
      ) : null}
    </>
  );
}

export default Header;
