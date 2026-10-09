import { useLocaleContext } from "../../i18n/context.js";
import { sectionsFor } from "./capabilities.js";
import { useSession } from "./sessionContext.js";
import Icon from "../../components/ui/Icon.jsx";

/**
 * Shared states of the operations shell.
 *
 * Each one names what actually happened and what the operator can do about it
 * — never a generic "something went wrong".
 */

/** The shell cannot open without a Firebase project behind it. */
export function AdminUnavailable() {
  const { t } = useLocaleContext();
  return (
    <div className="container-page py-20">
      <div className="max-w-prose rounded-lg border border-line bg-surface p-8">
        <p className="label-micro text-accent">{t("admin.unavailable.kicker")}</p>
        <h1 className="mt-3 text-title-1 font-medium text-ink">{t("admin.unavailable.title")}</h1>
        <p className="mt-4 text-body-sm leading-relaxed text-ink-soft">
          {t("admin.unavailable.body")}
        </p>
        <ul className="mt-6 flex flex-col gap-2 font-mono text-caption text-ink-soft" data-keep-mono>
          <li>npm run emulators:start</li>
          <li>npm run emulators:seed</li>
          <li>VITE_FIREBASE_EMULATOR=1 in .env.local</li>
          <li>npm run roles:set -- you@example.com admin --apply</li>
        </ul>
        <p className="mt-6 text-caption leading-relaxed text-ink-muted">
          {t("admin.unavailable.note")}
        </p>
      </div>
    </div>
  );
}

export function AdminLoading() {
  const { t } = useLocaleContext();
  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-24">
      <p className="label-micro text-ink-muted" role="status">
        {t("states.loading")}
      </p>
    </div>
  );
}

export function AdminError({ message }) {
  const { t } = useLocaleContext();
  return (
    <div className="container-page py-20">
      <div
        role="alert"
        className="max-w-prose rounded-lg border border-status-closed/30 bg-status-closed-soft p-8"
      >
        <p className="label-micro text-status-closed">{t("admin.error.kicker")}</p>
        <h1 className="mt-3 text-title-1 font-medium text-ink">{t("admin.error.title")}</h1>
        <p className="mt-4 text-body-sm leading-relaxed text-ink-soft">{t("admin.error.body")}</p>
        {message ? (
          <p className="mt-4 font-mono text-caption text-ink-muted" data-keep-mono>
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Signed in, but this account may not act on the section being opened.
 *
 * The navigation already hides sections the role cannot use; this catches a
 * direct URL, a stale bookmark, and a role that has just been withdrawn.
 */
export function AdminForbidden() {
  const { t } = useLocaleContext();
  const { session } = useSession();
  const allowed = sectionsFor(session?.role);

  return (
    <div role="alert" className="max-w-prose rounded-lg border border-line bg-surface p-8">
      <p className="label-micro text-accent">{t("admin.forbidden.kicker")}</p>
      <h1 className="mt-3 text-title-1 font-medium text-ink">{t("admin.forbidden.title")}</h1>
      <p className="mt-4 text-body-sm leading-relaxed text-ink-soft">
        {t("admin.forbidden.body", { role: session?.role ?? "—" })}
      </p>
      {allowed.length ? (
        <a
          href={allowed[0].path}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md border border-ink px-5 font-mono text-body-sm text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          data-keep-mono
        >
          {t(allowed[0].labelKey)}
          <Icon name="arrowRight" size={14} />
        </a>
      ) : null}
    </div>
  );
}

/** An `/admin/…` path that does not exist. */
export function AdminNotFound() {
  const { t } = useLocaleContext();
  const { session } = useSession();
  const allowed = sectionsFor(session?.role);
  const home = allowed[0]?.path ?? "/admin/sign-in";

  return (
    <div className="max-w-prose rounded-lg border border-line bg-surface p-8">
      <p className="label-micro text-ink-faint">{t("admin.notFound.kicker")}</p>
      <h1 className="mt-3 text-title-1 font-medium text-ink">{t("admin.notFound.title")}</h1>
      <p className="mt-4 text-body-sm leading-relaxed text-ink-soft">
        {t("admin.notFound.body")}
      </p>
      <a
        href={home}
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md border border-ink px-5 font-mono text-body-sm text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        data-keep-mono
      >
        {allowed.length ? t(allowed[0].labelKey) : t("admin.nav.bookings")}
        <Icon name="arrowRight" size={14} />
      </a>
    </div>
  );
}

export default AdminUnavailable;
