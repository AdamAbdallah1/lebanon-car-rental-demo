import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLocaleContext } from "../../i18n/context.js";
import { useDocumentMeta } from "../../hooks/useDocumentMeta.js";
import { useAsyncData } from "../../hooks/useAsyncData.js";
import { repositories } from "../../lib/repositories/index.js";
import { allowedActions } from "../../lib/booking/bookingDecision.js";
import { statusLabelKey, statusTone, ACTION_LABEL_KEY } from "../../lib/booking/statusDisplay.js";
import { isValidRange, todayISO } from "../../lib/dates.js";
import { can } from "../../features/admin/capabilities.js";
import { useSession } from "../../features/admin/sessionContext.js";
import {
  decisionErrorKey,
  formatTimestamp,
} from "../../features/admin/bookingDisplay.js";
import QuoteBreakdown from "../../features/booking/QuoteBreakdown.jsx";
import Button from "../../components/ui/Button.jsx";
import Field from "../../components/ui/Field.jsx";
import DateInput from "../../components/ui/DateInput.jsx";
import Icon from "../../components/ui/Icon.jsx";
import StatusMark from "../../components/ui/StatusMark.jsx";

/**
 * One booking request, opened from the inbox.
 *
 * Three things an operator needs, in the order they need them: who and what
 * (customer, vehicle, dates), what it costs (the server's own price snapshot),
 * and what to do next (the decision panel). The audit trail sits underneath so
 * a decision is never made without seeing the ones before it.
 *
 * Every write goes through `submitBookingDecision`, which re-checks the role
 * claim, the transition table, the price and the vehicle's availability inside
 * one transaction. Nothing here assumes a decision will be accepted.
 */

const DONE_KEY = {
  confirm: "admin.detail.done.confirmed",
  decline: "admin.detail.done.declined",
  propose: "admin.detail.done.proposed",
  cancel: "admin.detail.done.cancelled",
};

function Section({ title, children, action = null }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 border-b border-line pb-3">
        <h2 className="text-title-3 font-medium text-ink">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Detail({ label, children }) {
  return (
    <div className="flex flex-col gap-1 py-2 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-full shrink-0 label-micro text-ink-faint sm:w-40">{label}</dt>
      <dd className="min-w-0 text-body-sm text-ink">{children}</dd>
    </div>
  );
}

function DatePair({ pickupDate, returnDate, locale }) {
  if (!pickupDate || !returnDate) return <span className="text-ink-muted">—</span>;
  return (
    <span className="font-mono whitespace-nowrap" data-keep-mono>
      {new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(`${pickupDate}T00:00:00`))}
      {" → "}
      {new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(`${returnDate}T00:00:00`))}
    </span>
  );
}

function History({ record, locale, t }) {
  const entries = Array.isArray(record.history) ? [...record.history].reverse() : [];

  if (entries.length === 0) {
    return <p className="text-body-sm text-ink-soft">{t("admin.detail.history.empty")}</p>;
  }

  return (
    <ol className="flex flex-col">
      <li className="flex flex-col gap-1 border-b border-line py-3 sm:flex-row sm:gap-4">
        <p className="w-full shrink-0 font-mono text-caption text-ink-muted sm:w-40" data-keep-mono>
          {formatTimestamp(record.createdAt, locale)}
        </p>
        <div className="min-w-0">
          <p className="text-body-sm text-ink">{t("admin.detail.history.submitted")}</p>
          <p className="text-caption text-ink-muted">
            {t("admin.detail.history.requestedDates")} · <DatePair
              pickupDate={record.pickupDate}
              returnDate={record.returnDate}
              locale={locale}
            />
          </p>
        </div>
      </li>

      {entries.map((entry, index) => (
        <li key={`${entry.at}-${index}`} className="flex flex-col gap-1 border-b border-line py-3 sm:flex-row sm:gap-4">
          <div className="w-full shrink-0 sm:w-40">
            <p className="font-mono text-caption text-ink-muted" data-keep-mono>
              {formatTimestamp(entry.at, locale)}
            </p>
            <p className="text-micro text-ink-faint" data-keep-mono>
              {entry.actor?.email ?? entry.actor?.uid ?? "—"}
              {entry.actor?.role ? ` · ${entry.actor.role}` : ""}
            </p>
          </div>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-body-sm text-ink">
              <span>{t(ACTION_LABEL_KEY[entry.action] ?? "admin.action.confirm")}</span>
              <Icon name="arrowRight" size={13} className="text-ink-faint" />
              <StatusMark
                tone={statusTone(entry.to)}
                label={t(statusLabelKey(entry.to))}
                size="sm"
              />
            </p>
            {entry.dates ? (
              <p className="mt-1 text-caption text-ink-soft">
                {t("admin.detail.history.dates")}: <DatePair {...entry.dates} locale={locale} />
                {entry.previousDates ? (
                  <span className="text-ink-muted">
                    {" "}
                    ({t("admin.detail.history.was")}:{" "}
                    <DatePair {...entry.previousDates} locale={locale} />)
                  </span>
                ) : null}
              </p>
            ) : null}
            {entry.note ? (
              <p className="mt-1.5 border-s-2 border-line ps-3 text-body-sm text-ink-soft">
                {entry.note}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function DecisionPanel({ record, mayDecide, onDecided }) {
  const { t, locale } = useLocaleContext();
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState("");
  const [alternative, setAlternative] = useState({ pickupDate: "", returnDate: "" });
  const [choice, setChoice] = useState("proposed");
  const [dateError, setDateError] = useState(null);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);

  // The domain order (`allowedActions`) is transition-table order. For reading,
  // the counter-offer belongs between confirming and declining outright.
  const DISPLAY_ORDER = ["confirm", "propose", "decline", "cancel"];
  const available = mayDecide ? allowedActions(record.status) : [];
  const actions = DISPLAY_ORDER.filter((action) => available.includes(action));

  if (actions.length === 0) {
    return (
      <p className="text-body-sm leading-relaxed text-ink-soft">
        {mayDecide ? t("admin.detail.actions.none") : t("admin.detail.actions.readOnly")}
      </p>
    );
  }

  function start(action) {
    setOpen(action);
    setError(null);
    setDone(null);
    setDateError(null);
    setNote("");
    setChoice(record.proposed ? "proposed" : "original");
    setAlternative({
      pickupDate: record.pickupDate ?? "",
      returnDate: record.returnDate ?? "",
    });
  }

  async function submit() {
    if (busy) return;
    setError(null);
    setDone(null);

    const payload = { requestId: record.id, action: open, note: note.trim() || null };

    if (open === "propose") {
      if (!alternative.pickupDate || !alternative.returnDate) {
        setDateError(t("admin.detail.validation.datesRequired"));
        return;
      }
      if (!isValidRange(alternative.pickupDate, alternative.returnDate)) {
        setDateError(t("admin.detail.validation.range"));
        return;
      }
      if (alternative.pickupDate < todayISO()) {
        setDateError(t("admin.detail.validation.past"));
        return;
      }
      setDateError(null);
      payload.alternative = { ...alternative };
    }

    if (open === "confirm") payload.dates = choice;

    setBusy(true);
    try {
      await repositories.submitBookingDecision(payload);
      setDone(t(DONE_KEY[open]));
      setOpen(null);
      setNote("");
      onDecided();
    } catch (caught) {
      setError(decisionErrorKey(caught?.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {actions.map((action) => (
          <Button
            key={action}
            variant={action === "confirm" ? "primary" : action === "cancel" ? "quiet" : "secondary"}
            size="lg"
            onClick={() => (open === action ? setOpen(null) : start(action))}
            aria-expanded={open === action}
          >
            {t(ACTION_LABEL_KEY[action])}
          </Button>
        ))}
      </div>

      {done ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-status-open/30 bg-status-open-soft px-3 py-2.5 text-body-sm text-ink"
        >
          <Icon name="check" size={16} className="mt-0.5 shrink-0 text-status-open" />
          <span>{done}</span>
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-status-closed/30 bg-status-closed-soft px-3 py-2.5 text-body-sm text-ink"
        >
          <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-status-closed" />
          <span>{t(error)}</span>
        </p>
      ) : null}

      {open ? (
        <div className="flex flex-col gap-4 rounded-md border border-line bg-surface-sunken p-4">
          <p className="text-body-sm leading-relaxed text-ink-soft">
            {t(`admin.detail.confirmBody.${open}`)}
          </p>

          {open === "confirm" && record.proposed ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="label-micro text-ink-faint">
                {t("admin.detail.datesLegend")}
              </legend>
              {[
                { value: "proposed", labelKey: "admin.detail.useProposed" },
                { value: "original", labelKey: "admin.detail.useOriginal" },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-11 cursor-pointer items-center gap-3 text-body-sm text-ink"
                >
                  <input
                    type="radio"
                    name="confirm-dates"
                    value={option.value}
                    checked={choice === option.value}
                    onChange={() => setChoice(option.value)}
                    className="size-4 accent-accent"
                  />
                  <span>
                    {t(option.labelKey)}{" "}
                    <span className="font-mono text-ink-soft" data-keep-mono>
                      {option.value === "proposed" ? (
                        <DatePair {...record.proposed} locale={locale} />
                      ) : (
                        <DatePair
                          pickupDate={record.pickupDate}
                          returnDate={record.returnDate}
                          locale={locale}
                        />
                      )}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}

          {open === "propose" ? (
            <div className="flex flex-col gap-4 sm:flex-row">
              <Field
                label={t("admin.detail.pickupDate")}
                id="alt-pickup"
                required
                error={dateError ?? undefined}
              >
                {({ id, describedBy }) => (
                  <DateInput
                    id={id}
                    describedBy={describedBy}
                    invalid={Boolean(dateError)}
                    min={todayISO()}
                    value={alternative.pickupDate}
                    onChange={(value) =>
                      setAlternative((prev) => ({ ...prev, pickupDate: value }))
                    }
                  />
                )}
              </Field>
              <Field label={t("admin.detail.returnDate")} id="alt-return" required>
                {({ id, describedBy }) => (
                  <DateInput
                    id={id}
                    describedBy={describedBy}
                    min={alternative.pickupDate || todayISO()}
                    value={alternative.returnDate}
                    onChange={(value) =>
                      setAlternative((prev) => ({ ...prev, returnDate: value }))
                    }
                  />
                )}
              </Field>
            </div>
          ) : null}

          <Field
            label={t("admin.detail.note")}
            id="decision-note"
            hint={t("admin.detail.noteHint")}
          >
            {({ id, describedBy }) => (
              <textarea
                id={id}
                rows={3}
                maxLength={2000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                aria-describedby={describedBy}
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-body-sm text-ink transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
              />
            )}
          </Field>

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Button
              variant={open === "decline" || open === "cancel" ? "secondary" : "primary"}
              onClick={submit}
              disabled={busy}
            >
              {busy ? t("admin.detail.working") : t("admin.detail.apply")}
            </Button>
            <Button variant="link" onClick={() => setOpen(null)} disabled={busy}>
              {t("admin.detail.dismiss")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function BookingDetailPage() {
  const { requestId } = useParams();
  const { t, locale } = useLocaleContext();
  useDocumentMeta({ title: t("admin.detail.title"), description: null });

  const { session } = useSession();
  const mayDecide = can(session?.role, "bookings:decide");

  const { data: record, loading, error, reload } = useAsyncData(
    () => repositories.getBookingById(requestId),
    [requestId],
    { keepPrevious: true },
  );

  if (loading && !record) {
    return <p className="label-micro py-16 text-ink-muted" role="status">{t("states.loading")}</p>;
  }

  if (error) {
    return (
      <div role="alert" className="max-w-prose rounded-lg border border-status-closed/30 bg-status-closed-soft p-6">
        <p className="text-body-sm text-ink">{t("states.error.title")}</p>
        <Button variant="quiet" size="sm" className="mt-4" onClick={reload}>
          {t("states.retry")}
        </Button>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="max-w-prose rounded-lg border border-line bg-surface p-6">
        <p className="text-body-sm text-ink">{t("admin.detail.notFound")}</p>
        <Button as={Link} to="/admin/bookings" variant="quiet" size="sm" className="mt-4">
          {t("admin.nav.bookings")}
        </Button>
      </div>
    );
  }

  const requested = record;
  const alternative = record.proposed;
  const booked = record.bookedDates;

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/admin/bookings"
        className="inline-flex min-h-11 w-fit items-center gap-2 text-body-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Icon name={locale === "ar" ? "chevronRight" : "chevronLeft"} size={16} />
        {t("admin.detail.back")}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink pb-5">
        <div className="min-w-0">
          <p className="label-micro text-ink-faint">{t("admin.detail.reference")}</p>
          <h1 className="mt-2 font-mono text-title-1 text-ink" data-keep-mono>
            {record.reference}
          </h1>
          <p className="mt-2 text-body-sm text-ink-soft">
            {t("admin.detail.submittedAt")} {formatTimestamp(record.createdAt, locale)}
          </p>
        </div>
        <StatusMark tone={statusTone(record.status)} label={t(statusLabelKey(record.status))} />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <Section title={t("admin.detail.customer")}>
            <dl className="flex flex-col divide-y divide-line">
              <Detail label={t("admin.detail.name")}>
                {record.customer?.fullName ?? "—"}
              </Detail>
              <Detail label={t("admin.detail.email")}>
                {record.customer?.email ? (
                  <a
                    href={`mailto:${record.customer.email}`}
                    className="inline-flex min-h-11 items-center font-mono underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    data-keep-mono
                  >
                    {record.customer.email}
                  </a>
                ) : "—"}
              </Detail>
              <Detail label={t("admin.detail.phone")}>
                {record.customer?.phone ? (
                  <a
                    href={`tel:${record.customer.phone.replace(/\s+/g, "")}`}
                    className="inline-flex min-h-11 items-center font-mono underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    data-keep-mono
                  >
                    {record.customer.phone}
                  </a>
                ) : "—"}
              </Detail>
              <Detail label={t("admin.detail.locale")}>
                {record.locale === "ar" ? t("admin.detail.localeAr") : t("admin.detail.localeEn")}
              </Detail>
            </dl>
          </Section>

          <Section title={t("admin.detail.journey")}>
            <dl className="flex flex-col divide-y divide-line">
              <Detail label={t("admin.detail.vehicle")}>
                {record.vehicleSlug ? (
                  <Link
                    to={`/vehicle/${record.vehicleSlug}`}
                    className="inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {record.vehicleName ?? record.vehicleId}
                    <Icon name="external" size={14} className="text-ink-faint" />
                  </Link>
                ) : (record.vehicleName ?? record.vehicleId)}
              </Detail>
              <Detail label={t("admin.detail.location")}>{record.locationName ?? "—"}</Detail>
              <Detail label={t("admin.detail.requestedDates")}>
                <DatePair pickupDate={requested.pickupDate} returnDate={requested.returnDate} locale={locale} />
              </Detail>
              {alternative ? (
                <Detail label={t("admin.detail.alternativeDates")}>
                  <DatePair pickupDate={alternative.pickupDate} returnDate={alternative.returnDate} locale={locale} />
                </Detail>
              ) : null}
              {booked ? (
                <Detail label={t("admin.detail.bookedDates")}>
                  <DatePair pickupDate={booked.pickupDate} returnDate={booked.returnDate} locale={locale} />
                </Detail>
              ) : null}
              <Detail label={t("admin.detail.days")}>{record.days ?? "—"}</Detail>
            </dl>

            {record.notes ? (
              <div className="mt-4 border-t border-line pt-4">
                <p className="label-micro text-ink-faint">{t("admin.detail.customerNote")}</p>
                <p className="mt-2 whitespace-pre-wrap text-body-sm leading-relaxed text-ink-soft">
                  {record.notes}
                </p>
              </div>
            ) : null}
          </Section>

          <Section title={t("admin.detail.price")}>
            <p className="mb-4 text-caption leading-relaxed text-ink-muted">
              {t("admin.detail.priceNote")}
            </p>
            <QuoteBreakdown quote={record.quote} />
          </Section>

          <Section title={t("admin.detail.history.title")}>
            <History record={record} locale={locale} t={t} />
          </Section>
        </div>

        <aside className="self-start lg:sticky lg:top-24">
          <Section title={t("admin.detail.actions")}>
            <DecisionPanel record={record} mayDecide={mayDecide} onDecided={reload} />
          </Section>
        </aside>
      </div>
    </div>
  );
}

export default BookingDetailPage;
