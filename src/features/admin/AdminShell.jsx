import { Suspense } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../lib/cn.js";
import { useLocaleContext } from "../../i18n/context.js";
import { RouteAnnouncer } from "../../components/layout/AppShell.jsx";
import LanguageSwitch from "../../components/layout/LanguageSwitch.jsx";
import Wordmark from "../../components/layout/Wordmark.jsx";
import Icon from "../../components/ui/Icon.jsx";
import Button from "../../components/ui/Button.jsx";
import { emulatorEnabled } from "../../lib/firebase/emulator.js";
import { sectionsFor, sectionForPath } from "./capabilities.js";
import { useSession } from "./sessionContext.js";
import { AdminError, AdminForbidden, AdminLoading, AdminUnavailable } from "./AdminStates.jsx";

/**
 * Operations shell — the signed-in frame around every admin route.
 *
 * Deliberately plain: a header, a capability-driven navigation rail and one
 * work surface. There is no dashboard layer, no KPI strip and no decoration;
 * an operator opens this to work a queue, not to admire a summary of one.
 *
 * Two navigations render from one list (`sectionsFor`): a horizontal strip
 * below 1024px and a rail from 1024px up. Both disappear entirely for a role
 * with no sections, in which case `AdminForbidden` explains why.
 */

const NAV_ITEM =
  "flex min-h-11 items-center gap-2.5 rounded-md px-3 text-body-sm transition-colors duration-[180ms] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function EmulatorChip() {
  const { t } = useLocaleContext();
  if (!emulatorEnabled) return null;
  return (
    <span
      className="hidden items-center gap-1.5 rounded-full border border-status-limited/40 bg-status-limited-soft px-2.5 py-1 label-micro text-ink sm:inline-flex"
      title={t("admin.emulator.title")}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-status-limited" />
      {t("admin.emulator.label")}
    </span>
  );
}

function SessionBlock({ compact = false }) {
  const { t } = useLocaleContext();
  const { session, signOut } = useSession();
  const navigate = useNavigate();

  if (!session) return null;

  const roleLabel = session.role
    ? t(`admin.role.${session.role}`)
    : t("admin.role.none");

  return (
    <div className={compact ? "flex items-center gap-2" : "flex flex-col gap-3"}>
      {compact ? (
        <span className="hidden truncate font-mono text-caption text-ink-soft md:block" data-keep-mono>
          {session.email}
        </span>
      ) : (
        <div className="rounded-md border border-line bg-surface-sunken p-3">
          <p className="label-micro text-ink-faint">{t("admin.signedInAs")}</p>
          <p className="mt-1.5 truncate font-mono text-caption text-ink" data-keep-mono title={session.email ?? undefined}>
            {session.email ?? session.uid}
          </p>
          <p className="mt-2 inline-flex items-center rounded-full border border-line bg-canvas px-2 py-0.5 label-micro text-ink-soft">
            {roleLabel}
          </p>
        </div>
      )}

      <Button
        variant={compact ? "quiet" : "secondary"}
        size="sm"
        onClick={async () => {
          await signOut();
          navigate("/admin/sign-in", { replace: true });
        }}
      >
        {t("admin.signOut")}
      </Button>
    </div>
  );
}

function NavList({ onNavigate }) {
  const { t } = useLocaleContext();
  const { session } = useSession();
  const { pathname } = useLocation();
  const sections = sectionsFor(session?.role);

  return (
    <ul className="flex items-center gap-1">
      {sections.map((section) => {
        const active = sectionForPath(pathname)?.id === section.id;
        return (
          <li key={section.id}>
            <NavLink
              to={section.path}
              onClick={onNavigate}
              className={cn(
                NAV_ITEM,
                active
                  ? "bg-surface-sunken text-ink"
                  : "text-ink-soft hover:bg-surface-sunken hover:text-ink",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon name={section.icon} size={16} className="shrink-0 text-ink-faint" />
              <span className="whitespace-nowrap">{t(section.labelKey)}</span>
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}

function PageLoading() {
  const { t } = useLocaleContext();
  return (
    <p className="label-micro py-16 text-ink-muted" role="status">
      {t("states.loading")}
    </p>
  );
}

export function AdminShell() {
  const { t } = useLocaleContext();
  const { status, session, error } = useSession();
  const { pathname } = useLocation();

  if (status === "unavailable") return <AdminUnavailable />;
  if (status === "loading") return <AdminLoading />;
  if (status === "error") return <AdminError message={error?.code ?? null} />;

  // Nobody is signed in — the sign-in page is the only destination left.
  // It lives outside this shell, so this is a hard redirect, not a panel.
  if (status === "anonymous" || !session) {
    return <Navigate to="/admin/sign-in" replace state={{ from: pathname }} />;
  }

  const section = sectionForPath(pathname);
  const allowed = section
    ? sectionsFor(session?.role).some((entry) => entry.id === section.id)
    : true;

  return (
    <div id="top" className="flex min-h-dvh flex-col">
      <a href="#main-content" className="skip-link">
        {t("skip.toContent")}
      </a>

      <header className="sticky top-0 z-header border-b border-line bg-canvas/94 backdrop-blur-md">
        <div className="container-page flex min-h-14 items-center justify-between gap-3 py-2">
          <div className="flex min-w-0 items-center gap-3">
            {/* Wordmark is itself a link — never nest one inside another. */}
            <Wordmark />
            <span
              aria-hidden="true"
              className="hidden h-5 w-px bg-line sm:block"
            />
            <span className="hidden shrink-0 label-micro text-ink-faint sm:block">
              {t("admin.brand")}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <EmulatorChip />
            <LanguageSwitch />
            {/* The rail carries the session block from 1024px up; below that
                the header is the only place it fits. */}
            <span className="lg:hidden">
              <SessionBlock compact />
            </span>
          </div>
        </div>

        {/* Rail below 1024px — one list, same source as the desktop rail.
            It must hand over exactly where the <aside> appears, otherwise the
            768–1023px range has no navigation at all. */}
        <nav
          aria-label={t("admin.nav.label")}
          className="border-t border-line lg:hidden"
        >
          <div className="container-page scroll-none overflow-x-auto py-1.5">
            <NavList />
          </div>
        </nav>
      </header>

      <RouteAnnouncer />

      <div className="container-page grid flex-1 grid-cols-1 gap-0 lg:grid-cols-[15rem_1fr] lg:gap-10">
        <aside className="hidden border-e border-line py-8 lg:block">
          <nav aria-label={t("admin.nav.label")}>
            <NavList />
          </nav>
          <div className="mt-6 border-t border-line pt-6">
            <SessionBlock />
          </div>
        </aside>

        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 py-6 lg:py-8 focus:outline-none"
        >
          {!allowed ? <AdminForbidden /> : (
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminShell;
