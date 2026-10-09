import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { cn } from "../lib/cn.js";
import { useLocaleContext, usePick } from "../i18n/context.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { repositories } from "../lib/repositories/index.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { quoteVehicle } from "../lib/pricing/pricingService.js";
import { getAvailability } from "../lib/availability/availabilityService.js";
import { availabilityLabelKey } from "../features/fleet/vehicleDisplay.js";
import { useSearchState } from "../features/search/useSearchState.js";
import QuoteBreakdown from "../features/booking/QuoteBreakdown.jsx";
import PageHeader from "../components/layout/PageHeader.jsx";
import Button from "../components/ui/Button.jsx";
import Field from "../components/ui/Field.jsx";
import DateInput from "../components/ui/DateInput.jsx";
import Icon from "../components/ui/Icon.jsx";
import StatusMark from "../components/ui/StatusMark.jsx";
import { formatMoney } from "../lib/money.js";
import { formatDate, todayISO } from "../lib/dates.js";

function money(value, locale, currency = "USD") {
  return formatMoney(value, { locale: locale === "ar" ? "ar" : "en-US", currency });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Journey state that does not fit in the URL — the driver's details and
 * which step they reached. It never leaves the browser: `sessionStorage` is
 * cleared with the tab, nothing is sent anywhere, and the vehicle, location
 * and dates still come from the URL so a refresh on a fresh tab lands on a
 * complete page.
 */
const DRAFT_KEY = "cedars-drive.booking.draft";
const RECEIPT_KEY = "cedars-drive.booking.receipt";

function readSession() {
  try {
    const draftRaw = window.sessionStorage.getItem(DRAFT_KEY);
    const receiptRaw = window.sessionStorage.getItem(RECEIPT_KEY);
    return {
      draft: draftRaw ? JSON.parse(draftRaw) : null,
      receipt: receiptRaw ? JSON.parse(receiptRaw) : null,
    };
  } catch {
    return { draft: null, receipt: null };
  }
}

function writeSession(key, value) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage disabled — the flow still works, it just will not survive a refresh */
  }
}

function clearSession(key) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

const STEPS = [
  { id: "vehicle", key: "booking.step.vehicle" },
  { id: "dates", key: "booking.step.dates" },
  { id: "driver", key: "booking.step.driver" },
  { id: "review", key: "booking.step.review" },
];

const CONDITION_KEYS = [
  "conditions.age",
  "conditions.licence",
  "conditions.deposit",
  "conditions.payment",
];

const NEXT_STEP_KEYS = ["booking.next.1", "booking.next.2", "booking.next.3"];

function Progress({ step }) {
  const { t } = useLocaleContext();
  const activeIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <nav aria-label={t("booking.progress.label")}>
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((item, index) => {
          const state = index < activeIndex ? "done" : index === activeIndex ? "current" : "todo";
          return (
            <li key={item.id}>
              <span
                aria-current={state === "current" ? "step" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-pill border px-3.5 font-mono text-caption",
                  "transition-colors duration-[180ms]",
                  state === "current" && "border-ink bg-ink text-canvas",
                  state === "done" && "border-line bg-surface text-ink",
                  state === "todo" && "border-line bg-transparent text-ink-muted",
                )}
                data-keep-mono
              >
                <span aria-hidden="true" className="inline-flex size-4 items-center justify-center">
                  {state === "done" ? <Icon name="check" size={12} strokeWidth={2.5} /> : index + 1}
                </span>
                {t(item.key)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-body-sm text-ink-muted">{label}</dt>
      <dd className="text-end text-body-sm text-ink">{value}</dd>
    </div>
  );
}

/**
 * Booking request flow.
 *
 * Vehicle → dates → driver → review → confirmation. One `<form>` across the
 * first four steps so Enter always advances, and validation runs for the
 * step the renter is actually on.
 *
 * The total is produced by the pricing service, the verdict by the
 * availability service, and the request goes through the repository. This
 * component gathers input and renders what came back — it never prices,
 * never decides availability and never talks to a data source directly.
 */
export function BookPage() {
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();
  const [searchParams] = useSearchParams();
  const { state: searchState, setState: setSearchState } = useSearchState();

  useDocumentMeta({
    title: "Request a vehicle",
    description:
      "Send a rental request for any vehicle in the fleet. A request is not a confirmed booking.",
    path: "/book",
  });

  const [session] = useState(readSession);
  const restored = session.draft;

  const requestedVehicleId = searchParams.get("vehicle") || "";

  const [form, setForm] = useState(() => ({
    // The URL is the source of truth for the journey; the saved draft only
    // fills a gap left by a hand-typed address or a cleared query string.
    vehicleId: requestedVehicleId || restored?.vehicleId || "",
    pickupDate: searchState.pickupDate ?? "",
    returnDate: searchState.returnDate ?? "",
    pickupLocationId: searchState.locationId ?? "",
    fullName: restored?.fullName ?? "",
    email: restored?.email ?? "",
    phone: restored?.phone ?? "",
    notes: restored?.notes ?? "",
  }));

  // A restored review step is only meaningful while the journey behind it
  // still exists; otherwise start again at the top.
  const [step, setStep] = useState(() => {
    if (session.receipt) return "confirmation";
    if (restored?.step && STEPS.some((s) => s.id === restored.step)) {
      return restored.vehicleId && restored.vehicleId !== requestedVehicleId
        ? "vehicle"
        : restored.step;
    }
    return "vehicle";
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [conflict, setConflict] = useState(false);
  const [receipt, setReceipt] = useState(session.receipt);
  const sendingRef = useRef(false);
  const stepHeadingRef = useRef(null);
  const previousStepRef = useRef(step);

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [vehicles, categories, locations, blocks, ratePlans] = await Promise.all([
      repositories.queryVehicles(),
      repositories.queryCategories(),
      repositories.queryLocations(),
      repositories.queryAllBlockPeriods(),
      repositories.queryRatePlans(),
    ]);
    return { vehicles, categories, locations, blocks, ratePlan: ratePlans?.[0] ?? null };
  }, []);

  const vehicles = data?.vehicles ?? [];
  const locations = data?.locations ?? [];

  const vehicle = useMemo(
    () => (data?.vehicles ?? []).find((v) => v.id === form.vehicleId) ?? null,
    [data, form.vehicleId],
  );
  const pickupLocation = useMemo(
    () => (data?.locations ?? []).find((l) => l.id === form.pickupLocationId) ?? null,
    [data, form.pickupLocationId],
  );

  const categoryLabel = useMemo(() => {
    if (!vehicle) return "";
    const category = (data?.categories ?? []).find((c) => c.id === vehicle.categoryId);
    return category ? pickLocalized(category.name, locale) : "";
  }, [vehicle, data, locale, pickLocalized]);

  const quote = useMemo(() => {
    if (!vehicle) return null;
    return quoteVehicle(vehicle, {
      pickupDate: form.pickupDate || null,
      returnDate: form.returnDate || null,
      pickupLocation,
      ratePlan: data?.ratePlan ?? null,
    });
  }, [vehicle, form.pickupDate, form.returnDate, pickupLocation, data?.ratePlan]);

  const availability = useMemo(() => {
    if (!vehicle) return null;
    const range =
      form.pickupDate && form.returnDate
        ? { pickupDate: form.pickupDate, returnDate: form.returnDate }
        : {};
    return getAvailability({ vehicle, blocks: data?.blocks ?? [], range });
  }, [vehicle, form.pickupDate, form.returnDate, data?.blocks]);

  const unavailable = availability?.state === "unavailable";

  const locationMismatch = Boolean(
    vehicle &&
      form.pickupLocationId &&
      Array.isArray(vehicle.locationIds) &&
      vehicle.locationIds.length > 0 &&
      !vehicle.locationIds.includes(form.pickupLocationId),
  );

  const pickLocalizedLocation = pickupLocation
    ? pickLocalized(pickupLocation.shortName ?? pickupLocation.name, locale)
    : "";

  // The vehicle, location and dates live in the URL. A tab restored without
  // them must fall back to the first step instead of rendering a review
  // screen with nothing behind it. Derived during render rather than pushed
  // back through an effect.
  const journeyReady =
    Boolean(vehicle) &&
    Boolean(pickupLocation) &&
    Boolean(form.pickupDate) &&
    Boolean(form.returnDate);
  const activeStep =
    step === "review" && !loading && !journeyReady ? "vehicle" : step;

  // Keep the draft in step so a refresh on the review screen comes back to it.
  useEffect(() => {
    if (activeStep === "confirmation") return;
    writeSession(DRAFT_KEY, {
      step: activeStep,
      vehicleId: form.vehicleId,
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      notes: form.notes,
    });
  }, [activeStep, form]);

  useEffect(() => {
    if (previousStepRef.current === activeStep) return;
    previousStepRef.current = activeStep;
    stepHeadingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activeStep]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  function validateStep(current) {
    const next = {};

    if (current === "vehicle") {
      if (!form.vehicleId) next.vehicleId = t("booking.validation.vehicle");
      if (!form.pickupLocationId) {
        next.pickupLocationId = t("booking.validation.location");
      } else if (locationMismatch) {
        next.pickupLocationId = t("booking.validation.locationMismatch", {
          location: pickLocalizedLocation,
        });
      }
    }

    if (current === "dates") {
      if (!form.pickupDate || !form.returnDate) {
        next.pickupDate = t("booking.validation.dates");
      } else if (form.pickupDate < todayISO()) {
        next.pickupDate = t("booking.validation.past");
      } else if (form.returnDate < form.pickupDate) {
        next.returnDate = t("booking.validation.range");
      } else if (unavailable) {
        next.pickupDate = t("booking.validation.unavailable");
      }
    }

    if (current === "driver") {
      if (!form.fullName.trim()) next.fullName = t("booking.validation.required");
      if (!EMAIL_RE.test(form.email.trim())) next.email = t("booking.validation.email");
      if (form.phone.trim().length < 6) next.phone = t("booking.validation.required");
    }

    return next;
  }

  function focusFirstInvalid() {
    window.requestAnimationFrame(() => {
      document.querySelector("[aria-invalid='true']")?.focus();
    });
  }

  function advance() {
    const next = validateStep(activeStep);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      focusFirstInvalid();
      return;
    }
    const index = STEPS.findIndex((s) => s.id === activeStep);
    setStep(STEPS[Math.min(index + 1, STEPS.length - 1)].id);
  }

  function back() {
    setErrors({});
    setSubmitError(null);
    const index = STEPS.findIndex((s) => s.id === activeStep);
    setStep(STEPS[Math.max(index - 1, 0)].id);
  }

  function goTo(target) {
    setErrors({});
    setSubmitError(null);
    setStep(target);
  }

  async function send() {
    // A second click before React re-renders, a double Enter, or a retry of a
    // request that actually landed — all three must produce one request.
    if (sendingRef.current) return;

    setSubmitError(null);
    setConflict(false);
    setSubmitting(true);
    sendingRef.current = true;

    try {
      const range = { pickupDate: form.pickupDate, returnDate: form.returnDate };

      // Re-read the block periods at submission time. The rail above showed a
      // verdict from page load; only a fresh read may authorise a write.
      const blocks = await repositories.queryBlockPeriods(form.vehicleId, range);
      const fresh = getAvailability({ vehicle, blocks, range });
      if (fresh.state === "unavailable") {
        setConflict(true);
        return;
      }

      const record = await repositories.createBookingRequest({
        vehicleId: form.vehicleId,
        vehicleName: vehicle ? pickLocalized(vehicle.name, locale, vehicle.model) : null,
        categoryId: vehicle?.categoryId ?? null,
        pickupLocationId: form.pickupLocationId,
        returnLocationId: form.pickupLocationId,
        locationName: pickupLocation
          ? pickLocalized(pickupLocation.shortName ?? pickupLocation.name, locale)
          : null,
        pickupDate: form.pickupDate,
        returnDate: form.returnDate,
        days: quote?.days ?? null,
        dailyRate: quote?.dailyRate ?? null,
        estimatedTotal: quote?.total ?? null,
        totalWithVat: quote?.totalWithVat ?? null,
        deposit: quote?.deposit ?? null,
        currency: quote?.currency ?? "USD",
        quote: quote
          ? {
              baseTotal: quote.baseTotal,
              discount: quote.discount,
              subtotal: quote.subtotal,
              locationFee: quote.locationFee,
              vat: quote.vat,
              total: quote.total,
              totalWithVat: quote.totalWithVat,
              extras: quote.extras,
              mileage: quote.mileage,
              insurance: quote.insurance,
            }
          : null,
        customer: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        },
        notes: form.notes.trim() || null,
        source: "public-site",
        locale,
        availabilityCheckedAt: new Date().toISOString(),
      });

      clearSession(DRAFT_KEY);
      writeSession(RECEIPT_KEY, record);
      setReceipt(record);
      setStep("confirmation");
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch {
      setSubmitError(t("booking.error.submit"));
    } finally {
      sendingRef.current = false;
      setSubmitting(false);
    }
  }

  function onSubmit(event) {
    event.preventDefault();
    if (activeStep === "review") {
      void send();
      return;
    }
    advance();
  }

  function reset() {
    clearSession(RECEIPT_KEY);
    clearSession(DRAFT_KEY);
    setReceipt(null);
    setForm((current) => ({
      ...current,
      fullName: "",
      email: "",
      phone: "",
      notes: "",
    }));
    setErrors({});
    setSubmitError(null);
    setConflict(false);
    setStep("vehicle");
  }

  if (error) {
    return (
      <section className="block-pad">
        <div className="container-page">
          <div role="alert" className="rounded-lg border border-status-closed/30 bg-status-closed-soft px-6 py-16 text-center">
            <h1 className="text-title-2 text-ink">{t("booking.error.title")}</h1>
            <p className="mt-2 text-body-sm text-ink-soft">{t("booking.error.body")}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-6 min-h-11 rounded-md border border-ink px-5 font-mono text-body-sm text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {t("states.retry")}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (activeStep === "confirmation" && receipt) {
    return (
      <>
        <PageHeader eyebrow={t("booking.reference")} title={t("booking.success.title")} />
        <section className="block-pad">
          <div className="container-page max-w-2xl">
            <div className="rounded-lg border border-status-open/30 bg-status-open-soft p-6 lg:p-8">
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-status-open text-white">
                <Icon name="check" size={20} />
              </span>
              <p className="mt-5 text-body leading-relaxed text-ink">
                {t("booking.success.body")}
              </p>

              <dl className="mt-6 flex flex-col gap-3 border-t border-status-open/25 pt-5">
                <SummaryRow
                  label={t("booking.reference")}
                  value={
                    <span className="font-mono text-title-2 font-medium" data-keep-mono>
                      {receipt.reference}
                    </span>
                  }
                />
                <SummaryRow label={t("booking.step.vehicle")} value={receipt.vehicleName} />
                <SummaryRow
                  label={t("search.pickupLocation")}
                  value={receipt.locationName ?? receipt.pickupLocationId}
                />
                <SummaryRow
                  label={t("booking.step.dates")}
                  value={
                    <span className="font-mono" data-keep-mono>
                      {formatDate(receipt.pickupDate, locale)} →{" "}
                      {formatDate(receipt.returnDate, locale)}
                    </span>
                  }
                />
                {receipt.estimatedTotal != null ? (
                  <SummaryRow
                    label={t("quote.totalExVat")}
                    value={
                      <span className="font-mono" data-keep-mono>
                        {money(receipt.estimatedTotal, locale, receipt.currency)}
                      </span>
                    }
                  />
                ) : null}
                {receipt.totalWithVat != null ? (
                  <SummaryRow
                    label={t("vehicle.tripTotal")}
                    value={
                      <span className="font-mono" data-keep-mono>
                        {money(receipt.totalWithVat, locale, receipt.currency)}
                        <span className="text-ink-muted">
                          {" "}
                          ({t("quote.totalIncVat", {
                            pct: receipt.quote?.vat?.pct ?? 11,
                          })})
                        </span>
                      </span>
                    }
                  />
                ) : receipt.estimatedTotal != null ? (
                  <SummaryRow
                    label={t("vehicle.tripTotal")}
                    value={
                      <span className="font-mono" data-keep-mono>
                        {money(receipt.estimatedTotal, locale, receipt.currency)}
                      </span>
                    }
                  />
                ) : null}
                <SummaryRow
                  label={t("booking.status.label")}
                  value={t("booking.status.pending")}
                />
              </dl>

              <p className="mt-6 text-caption leading-relaxed text-ink-soft">
                {t("booking.reference.hint")}
              </p>
            </div>

            <section className="mt-8" aria-labelledby="next-title">
              <h2 id="next-title" className="text-title-3 font-medium text-ink">
                {t("booking.next.title")}
              </h2>
              <ol className="mt-4 flex flex-col gap-3">
                {NEXT_STEP_KEYS.map((key, index) => (
                  <li key={key} className="flex items-start gap-3 text-body-sm text-ink-soft">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-line bg-surface font-mono text-caption text-ink-faint"
                      data-keep-mono
                    >
                      {index + 1}
                    </span>
                    {t(key)}
                  </li>
                ))}
              </ol>
            </section>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button as={Link} to="/fleet" variant="primary">
                {t("fleet.browseAll")}
              </Button>
              <Button as={Link} to="/faq" variant="secondary">
                {t("nav.faq")}
              </Button>
              <Button variant="quiet" onClick={reset}>
                {t("booking.success.again")}
              </Button>
            </div>

            <p className="mt-8 text-caption text-ink-muted">{t("demo.notice")}</p>
          </div>
        </section>
      </>
    );
  }

  const isReview = activeStep === "review";
  const stepIndex = STEPS.findIndex((s) => s.id === activeStep);

  return (
    <>
      <PageHeader
        eyebrow={t("booking.title")}
        title={t("booking.title")}
        lede={t("booking.subtitle")}
        actions={<Progress step={activeStep} />}
      />

      <section className="block-pad" aria-label={t("booking.title")}>
        <div className="container-page">
          <div
            className={cn(isReview ? "mx-auto w-full max-w-3xl" : "grid grid-cols-1 gap-10 lg:grid-cols-[1.5fr_1fr]")}
          >
            <form
              onSubmit={onSubmit}
              noValidate
              className="flex flex-col gap-8"
              aria-busy={submitting}
            >
              <h2
                ref={stepHeadingRef}
                tabIndex={-1}
                className="text-title-1 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                {stepIndex === 0 ? t("booking.heading.vehicle") : t(STEPS[stepIndex].key)}
              </h2>

              {/* ---- step 1: vehicle + pick-up point ---- */}
              {activeStep === "vehicle" ? (
                <fieldset className="flex flex-col gap-5" disabled={loading || submitting}>
                  <legend className="sr-only">{t("booking.step.vehicle")}</legend>

                  <Field
                    label={t("booking.field.vehicle")}
                    required
                    error={errors.vehicleId}
                    id="book-vehicle"
                  >
                    {({ id, describedBy }) => (
                      <select
                        id={id}
                        aria-describedby={describedBy}
                        aria-invalid={errors.vehicleId ? true : undefined}
                        value={form.vehicleId}
                        onChange={(event) => update("vehicleId", event.target.value)}
                        className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-body-sm text-ink transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                      >
                        <option value="">{t("booking.field.vehiclePlaceholder")}</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {pickLocalized(v.name, locale, v.model)}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>

                  <Field
                    label={t("search.pickupLocation")}
                    required
                    error={errors.pickupLocationId}
                    id="book-location"
                  >
                    {({ id, describedBy }) => (
                      <select
                        id={id}
                        aria-describedby={describedBy}
                        aria-invalid={errors.pickupLocationId ? true : undefined}
                        value={form.pickupLocationId}
                        onChange={(event) => {
                          update("pickupLocationId", event.target.value);
                          setSearchState({ locationId: event.target.value });
                        }}
                        className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-body-sm text-ink transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                      >
                        <option value="">{t("search.placeholderLocation")}</option>
                        {locations.map((l) => (
                          <option key={l.id} value={l.id}>
                            {pickLocalized(l.shortName ?? l.name, locale)}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>

                  {pickupLocation ? (
                    <p className="text-caption text-ink-muted">
                      {`${t("locations.hours")}: ${pickupLocation.hours.open} – ${pickupLocation.hours.close} · ${pickupLocation.hours.days}`}
                    </p>
                  ) : null}
                </fieldset>
              ) : null}

              {/* ---- step 2: dates + availability ---- */}
              {activeStep === "dates" ? (
                <fieldset className="flex flex-col gap-5" disabled={submitting}>
                  <legend className="sr-only">{t("booking.step.dates")}</legend>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field
                      label={t("search.pickupDate")}
                      required
                      error={errors.pickupDate}
                      id="book-from"
                    >
                      {({ id, describedBy }) => (
                        <DateInput
                          id={id}
                          describedBy={describedBy}
                          invalid={Boolean(errors.pickupDate)}
                          min={todayISO()}
                          value={form.pickupDate}
                          onChange={(value) => {
                            update("pickupDate", value);
                            setSearchState({ pickupDate: value });
                          }}
                        />
                      )}
                    </Field>

                    <Field
                      label={t("search.returnDate")}
                      required
                      error={errors.returnDate}
                      id="book-to"
                    >
                      {({ id, describedBy }) => (
                        <DateInput
                          id={id}
                          describedBy={describedBy}
                          invalid={Boolean(errors.returnDate)}
                          min={form.pickupDate || todayISO()}
                          value={form.returnDate}
                          onChange={(value) => {
                            update("returnDate", value);
                            setSearchState({ returnDate: value });
                          }}
                        />
                      )}
                    </Field>
                  </div>

                  {vehicle && availability ? (
                    <div
                      aria-live="polite"
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-4",
                        availability.state === "unavailable"
                          ? "border-status-closed/40 bg-status-closed-soft"
                          : "border-line bg-surface",
                      )}
                    >
                      <StatusMark
                        tone={availability.state}
                        label={t(availabilityLabelKey(availability.state))}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-body-sm text-ink">
                          {t(`booking.availability.${availability.state}`)}
                        </p>
                        {availability.blocking ? (
                          <p className="mt-1 font-mono text-caption text-ink-muted" data-keep-mono>
                            {`${formatDate(availability.blocking.startDate, locale)} → ${formatDate(
                              availability.blocking.endDate,
                              locale,
                            )}`}
                          </p>
                        ) : null}
                        <p className="mt-1 text-caption text-ink-muted">
                          {t("booking.availability.note")}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </fieldset>
              ) : null}

              {/* ---- step 3: driver ---- */}
              {activeStep === "driver" ? (
                <fieldset className="flex flex-col gap-5" disabled={submitting}>
                  <legend className="sr-only">{t("booking.step.driver")}</legend>

                  <Field
                    label={t("booking.field.name")}
                    required
                    error={errors.fullName}
                    id="book-name"
                  >
                    {({ id, describedBy }) => (
                      <input
                        id={id}
                        name="fullName"
                        autoComplete="name"
                        aria-describedby={describedBy}
                        aria-invalid={errors.fullName ? true : undefined}
                        value={form.fullName}
                        onChange={(event) => update("fullName", event.target.value)}
                        className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-body-sm text-ink transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                      />
                    )}
                  </Field>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field
                      label={t("booking.field.email")}
                      required
                      error={errors.email}
                      id="book-email"
                    >
                      {({ id, describedBy }) => (
                        <input
                          id={id}
                          name="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          aria-describedby={describedBy}
                          aria-invalid={errors.email ? true : undefined}
                          value={form.email}
                          onChange={(event) => update("email", event.target.value)}
                          className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-body-sm text-ink transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                        />
                      )}
                    </Field>

                    <Field
                      label={t("booking.field.phone")}
                      required
                      error={errors.phone}
                      id="book-phone"
                    >
                      {({ id, describedBy }) => (
                        <input
                          id={id}
                          name="phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          aria-describedby={describedBy}
                          aria-invalid={errors.phone ? true : undefined}
                          value={form.phone}
                          onChange={(event) => update("phone", event.target.value)}
                          className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-body-sm text-ink transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                        />
                      )}
                    </Field>
                  </div>

                  <Field
                    label={t("booking.field.notes")}
                    hint={t("booking.field.notesHint")}
                    id="book-notes"
                  >
                    {({ id, describedBy }) => (
                      <textarea
                        id={id}
                        name="notes"
                        rows={4}
                        aria-describedby={describedBy}
                        value={form.notes}
                        onChange={(event) => update("notes", event.target.value)}
                        className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-body-sm text-ink transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                      />
                    )}
                  </Field>
                </fieldset>
              ) : null}

              {/* ---- step 4: review ---- */}
              {isReview ? (
                <div className="flex flex-col gap-8">
                  <section aria-labelledby="review-summary">
                    <h3 id="review-summary" className="text-title-3 font-medium text-ink">
                      {t("booking.review.title")}
                    </h3>
                    <dl className="mt-2 flex flex-col divide-y divide-line border-y border-line">
                      <SummaryRow
                        label={t("booking.step.vehicle")}
                        value={
                          <span className="flex flex-wrap items-baseline justify-end gap-x-3">
                            {vehicle ? pickLocalized(vehicle.name, locale, vehicle.model) : "—"}
                            {categoryLabel ? (
                              <span className="label-micro text-ink-faint">{categoryLabel}</span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => goTo("vehicle")}
                              className="min-h-11 min-w-11 font-mono text-caption text-ink underline decoration-line underline-offset-4 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            >
                              {t("booking.review.edit")}
                            </button>
                          </span>
                        }
                      />
                      <SummaryRow
                        label={t("search.pickupLocation")}
                        value={
                          <span className="flex flex-wrap items-baseline justify-end gap-x-3">
                            {pickLocalizedLocation || "—"}
                            <button
                              type="button"
                              onClick={() => goTo("vehicle")}
                              className="min-h-11 min-w-11 font-mono text-caption text-ink underline decoration-line underline-offset-4 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            >
                              {t("booking.review.edit")}
                            </button>
                          </span>
                        }
                      />
                      <SummaryRow
                        label={t("booking.step.dates")}
                        value={
                          <span className="flex flex-wrap items-baseline justify-end gap-x-3">
                            <span className="font-mono" data-keep-mono>
                              {formatDate(form.pickupDate, locale)} →{" "}
                              {formatDate(form.returnDate, locale)}
                            </span>
                            <button
                              type="button"
                              onClick={() => goTo("dates")}
                              className="min-h-11 min-w-11 font-mono text-caption text-ink underline decoration-line underline-offset-4 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            >
                              {t("booking.review.edit")}
                            </button>
                          </span>
                        }
                      />
                      <SummaryRow
                        label={t("booking.step.driver")}
                        value={
                          <span className="flex flex-wrap items-baseline justify-end gap-x-3">
                            <span className="text-end">
                              {form.fullName}
                              <span className="block text-caption text-ink-muted">
                                {form.email} · {form.phone}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => goTo("driver")}
                              className="min-h-11 min-w-11 font-mono text-caption text-ink underline decoration-line underline-offset-4 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            >
                              {t("booking.review.edit")}
                            </button>
                          </span>
                        }
                      />
                    </dl>
                  </section>

                  {quote ? (
                    <QuoteBreakdown quote={quote} pickupLocation={pickupLocation} />
                  ) : null}

                  <section aria-labelledby="requirements-title" className="border-t border-line pt-6">
                    <h3 id="requirements-title" className="text-title-3 font-medium text-ink">
                      {t("booking.review.requirements")}
                    </h3>
                    <ul className="mt-3 flex flex-col gap-2.5">
                      {CONDITION_KEYS.map((key) => (
                        <li
                          key={key}
                          className="flex items-start gap-3 text-body-sm text-ink-soft"
                        >
                          <Icon name="info" size={15} className="mt-0.5 shrink-0 text-accent" />
                          {t(key)}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-caption leading-relaxed text-ink-muted">
                      {t("booking.review.requirementsNote")}
                    </p>
                  </section>

                  {conflict ? (
                    <div
                      role="alert"
                      className="flex flex-col items-start gap-3 rounded-md border border-status-closed/40 bg-status-closed-soft p-4"
                    >
                      <p className="text-body-sm text-status-closed">
                        {t("booking.error.conflict")}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setConflict(false);
                          goTo("dates");
                        }}
                      >
                        {t("booking.unavailable.action")}
                      </Button>
                    </div>
                  ) : null}

                  {submitError ? (
                    <p
                      role="alert"
                      className="rounded-md border border-status-closed/40 bg-status-closed-soft px-4 py-3 text-body-sm text-status-closed"
                    >
                      {submitError}
                    </p>
                  ) : null}

                  <p className="max-w-xl text-caption leading-relaxed text-ink-muted">
                    {t("booking.disclaimer")}
                  </p>
                </div>
              ) : null}

              {/* ---- actions ---- */}
              <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
                {stepIndex > 0 ? (
                  <Button type="button" variant="secondary" onClick={back} disabled={submitting}>
                    {t("booking.step.back")}
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={submitting || loading}
                >
                  {submitting
                    ? t("booking.submitting")
                    : isReview
                      ? t("booking.submit")
                      : t("booking.step.continue")}
                </Button>
              </div>

              {!isReview ? (
                <p className="max-w-xl text-caption leading-relaxed text-ink-muted">
                  {t("booking.progress.note")}
                </p>
              ) : null}
            </form>

            {!isReview ? (
              <aside className="flex flex-col gap-4 self-start rounded-lg border border-line bg-surface p-6 lg:sticky lg:top-24">
                <h2 className="text-title-2 font-medium text-ink">{t("booking.summary.title")}</h2>

                {loading ? (
                  <div className="h-40 animate-pulse rounded-md bg-surface-sunken" aria-live="polite">
                    <span className="sr-only">{t("states.loading")}</span>
                  </div>
                ) : !vehicle ? (
                  <p className="text-body-sm text-ink-muted">{t("booking.summary.empty")}</p>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
                      <div className="min-w-0">
                        <p className="text-body font-medium text-ink">
                          {pickLocalized(vehicle.name, locale, vehicle.model)}
                        </p>
                        <p className="label-micro mt-1 text-ink-faint">{categoryLabel}</p>
                      </div>
                      {availability ? (
                        <StatusMark
                          tone={availability.state}
                          label={t(availabilityLabelKey(availability.state))}
                          size="sm"
                        />
                      ) : null}
                    </div>

                    <dl className="flex flex-col">
                      <SummaryRow
                        label={t("search.pickupLocation")}
                        value={pickLocalizedLocation || "—"}
                      />
                      <SummaryRow
                        label={t("booking.step.dates")}
                        value={
                          form.pickupDate && form.returnDate ? (
                            <span className="font-mono" data-keep-mono>
                              {formatDate(form.pickupDate, locale)} →{" "}
                              {formatDate(form.returnDate, locale)}
                            </span>
                          ) : (
                            "—"
                          )
                        }
                      />
                    </dl>

                    {quote?.hasDates ? (
                      <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                        <span className="text-body-sm text-ink-muted">
                          {t("vehicle.tripTotalFor", { days: quote.days })}
                        </span>
                        <span
                          className="font-mono text-title-3 font-medium text-ink"
                          data-keep-mono
                        >
                          {money(quote.total, locale, quote.currency)}
                        </span>
                      </div>
                    ) : (
                      <p className="border-t border-line pt-3 text-body-sm text-ink-muted">
                        {t("vehicle.noDates")}
                      </p>
                    )}

                    <Link
                      to={`/vehicle/${vehicle.id}`}
                      className="mt-2 inline-flex min-h-11 items-center gap-2 self-start font-mono text-caption text-ink transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {t("vehicle.back")}
                      <Icon name={locale === "ar" ? "arrowLeft" : "arrowRight"} size={13} />
                    </Link>
                  </>
                )}

                <p className="border-t border-line pt-4 text-caption leading-relaxed text-ink-muted">
                  {t("demo.notice")}
                </p>
              </aside>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}

export default BookPage;
