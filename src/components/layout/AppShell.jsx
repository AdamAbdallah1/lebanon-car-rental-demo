import { Suspense, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import { useLocaleContext } from "../../i18n/context.js";

/**
 * Move focus to the top of the document on SPA route change.
 *
 * Focus is deliberately *not* moved on the initial page load: on a fresh load
 * the browser starts at the top of the document, so the first Tab lands on the
 * skip link — which is what keyboard and screen-reader users expect. Stealing
 * focus on load would silently drop them past both the skip link and the
 * repeated header block.
 */
export function RouteAnnouncer() {
  const { pathname } = useLocation();
  const lastPath = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

    const isFirstRender = lastPath.current === null;
    const isSamePath = lastPath.current === pathname;
    lastPath.current = pathname;
    if (isFirstRender || isSamePath) return;

    const main = document.getElementById("main-content");
    if (main) {
      main.focus({ preventScroll: true });
    }
  }, [pathname]);

  return null;
}

function PageLoading() {
  const { t } = useLocaleContext();
  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-24">
      <p className="label-micro text-ink-muted" role="status">
        {t("states.loading")}
      </p>
    </div>
  );
}

export function AppShell({ children }) {
  const { t } = useLocaleContext();

  return (
    <div id="top" className="flex min-h-dvh flex-col">
      <a href="#main-content" className="skip-link">
        {t("skip.toContent")}
      </a>

      <Header />
      <RouteAnnouncer />

      <main id="main-content" tabIndex={-1} className="flex-1">
        <Suspense fallback={<PageLoading />}>{children ?? <Outlet />}</Suspense>
      </main>

      <Footer />
    </div>
  );
}

export default AppShell;
