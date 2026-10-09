import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useLocaleContext } from "../../i18n/context.js";
import { useDocumentMeta } from "../../hooks/useDocumentMeta.js";
import LanguageSwitch from "../../components/layout/LanguageSwitch.jsx";
import Wordmark from "../../components/layout/Wordmark.jsx";
import Button from "../../components/ui/Button.jsx";
import Field from "../../components/ui/Field.jsx";
import Icon from "../../components/ui/Icon.jsx";
import { useSession } from "../../features/admin/sessionContext.js";
import { AdminUnavailable } from "../../features/admin/AdminStates.jsx";
import { sectionsFor } from "../../features/admin/capabilities.js";

/**
 * Staff sign-in.
 *
 * Email and password only — there is no password reset here because that flow
 * belongs to Firebase's own handler, and inventing one would be a lie about
 * what this demo can do.
 *
 * Errors arrive as Firebase auth codes and are replaced with a localized
 * sentence. The "wrong email or password" wording is deliberately the same
 * for both halves: this screen must not confirm whether an address exists.
 */

const CREDENTIAL_ERRORS = new Set([
  "auth/invalid-credential",
  "auth/wrong-password",
  "auth/user-not-found",
  "auth/invalid-argument",
]);

const ERROR_KEYS = {
  "auth/invalid-email": "admin.signin.error.email",
  "auth/missing-password": "admin.signin.error.password",
  "auth/too-many-requests": "admin.signin.error.throttled",
  "auth/network-request-failed": "admin.signin.error.network",
  "auth/user-disabled": "admin.signin.error.disabled",
  "auth/operation-not-allowed": "admin.signin.error.disabled",
  "auth/invalid-api-key": "admin.signin.error.config",
  "auth/operation-not-supported-in-this-environment":
    "admin.signin.error.network",
};

function messageKeyFor(code) {
  if (CREDENTIAL_ERRORS.has(code)) return "admin.signin.error.credentials";
  return ERROR_KEYS[code] ?? "admin.signin.error.generic";
}

export function SignInPage() {
  const { t } = useLocaleContext();
  useDocumentMeta({ title: t("admin.signin.title"), description: null });

  const { status, signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorCode, setErrorCode] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === "unavailable") return <AdminUnavailable />;

  const returnTo = location.state?.from ?? "/admin/bookings";
  if (status === "authenticated") return <Navigate to={returnTo} replace />;

  function validate() {
    const next = {};
    if (!email.trim()) next.email = t("admin.signin.validation.emailRequired");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = t("admin.signin.validation.emailInvalid");
    }
    if (!password) next.password = t("admin.signin.validation.passwordRequired");
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    setErrorCode(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const session = await signIn(email.trim(), password);
      const home = sectionsFor(session.role)[0]?.path ?? "/admin/bookings";
      navigate(location.state?.from ?? home, { replace: true });
    } catch (error) {
      setErrorCode(error?.code ?? "unknown");
    } finally {
      setSubmitting(false);
    }
  }

  const banner = errorCode ? t(messageKeyFor(errorCode)) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="container-page flex min-h-14 items-center justify-between gap-3 py-2">
          {/* Wordmark is itself a link — never nest one inside another. */}
          <Wordmark />
          <LanguageSwitch />
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-1 items-start justify-center px-4 py-12 sm:py-20"
      >
        <div className="w-full max-w-[26rem]">
          <p className="label-micro text-ink-faint">{t("admin.brand")}</p>
          <h1 className="mt-3 text-title-1 font-medium text-ink">{t("admin.signin.title")}</h1>
          <p className="mt-3 text-body-sm leading-relaxed text-ink-soft">
            {t("admin.signin.body")}
          </p>

          {banner ? (
            <p
              role="alert"
              className="mt-6 flex items-start gap-2 rounded-md border border-status-closed/30 bg-status-closed-soft px-4 py-3 text-body-sm text-ink"
            >
              <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-status-closed" />
              <span>{banner}</span>
            </p>
          ) : null}

          <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-5">
            <Field
              label={t("admin.signin.email")}
              id="admin-email"
              required
              error={fieldErrors.email}
            >
              {({ id, describedBy }) => (
                <input
                  id={id}
                  name="email"
                  type="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  dir="ltr"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={fieldErrors.email ? true : undefined}
                  aria-describedby={describedBy}
                  className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-body-sm text-ink transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                />
              )}
            </Field>

            <Field
              label={t("admin.signin.password")}
              id="admin-password"
              required
              error={fieldErrors.password}
            >
              {({ id, describedBy }) => (
                <input
                  id={id}
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  dir="ltr"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={fieldErrors.password ? true : undefined}
                  aria-describedby={describedBy}
                  className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-body-sm text-ink transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                />
              )}
            </Field>

            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
              <Button type="submit" size="lg" disabled={submitting}>
                {submitting ? t("admin.signin.submitting") : t("admin.signin.submit")}
              </Button>
              <Button as={Link} to="/" variant="link" size="lg">
                {t("admin.signin.backToSite")}
              </Button>
            </div>
          </form>

          <p className="mt-8 border-t border-line pt-6 text-caption leading-relaxed text-ink-muted">
            {t("admin.signin.note")}
          </p>
        </div>
      </main>
    </div>
  );
}

export default SignInPage;
