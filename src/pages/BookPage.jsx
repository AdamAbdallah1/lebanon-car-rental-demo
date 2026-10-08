import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLocaleContext, usePick } from "../i18n/context.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { repositories } from "../lib/repositories/index.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { quoteVehicle } from "../lib/pricing/pricingService.js";
import { getAvailability } from "../lib/availability/availabilityService.js";
import { availabilityLabelKey } from "../features/fleet/vehicleDisplay.js";
import { useSearchState } from "../features/search/useSearchState.js";
import PageHeader from "../components/layout/PageHeader.jsx";
import Button from "../components/ui/Button.jsx";
import Field from "../components/ui/Field.jsx";
import DateInput from "../components/ui/DateInput.jsx";
import Icon from "../components/ui/Icon.jsx";
import { formatMoney } from "../lib/money.js";
import { todayISO } from "../lib/dates.js";

function money(value, locale, currency = "USD") {
  return formatMoney(value, { locale: locale === "ar" ? "ar" : "en-US", currency });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phase 1 request page: one step, no payment, no account.
 *
 * The total shown here is produced by the pricing service; the availability
 * verdict by the availability service. This component only gathers input,
 * calls the repository, and renders what came back.
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

  const requestedVehicleId = searchParams.get("vehicle") || "";

  const [form, setForm] = useState({
    vehicleId: requestedVehicleId,
    pickupDate: searchState.pickupDate ?? "",
    returnDate: searchState.returnDate ?? "",
    pickupLocationId: searchState.locationId ?? "",
    fullName: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [receipt, setReceipt] = useState(null);

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

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  function validate() {
    const next = {};
    if (!form.vehicleId) next.vehicleId = t("booking.validation.vehicle");
    if (!form.pickupLocationId) next.pickupLocationId = t("booking.validation.location");
    if (!form.pickupDate || !form.returnDate) {
      next.pickupDate = t("booking.validation.dates");
    } else if (form.returnDate < form.pickupDate) {
      next.returnDate = t("booking.validation.range");
    }
    if (!form.fullName.trim()) next.fullName = t("booking.validation.required");
    if (!EMAIL_RE.test(form.email.trim())) next.email = t("booking.validation.email");
    if (form.phone.trim().length < 6) next.phone = t("booking.validation.required");
    if (unavailable) next.vehicleId = t("booking.validation.unavailable");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitError(null);
    if (!validate()) {
      const firstInvalid = document.querySelector("[aria-invalid='true']");
      firstInvalid?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const record = await repositories.createBookingRequest({
        vehicleId: form.vehicleId,
        vehicleName: vehicle ? pickLocalized(vehicle.name, locale, vehicle.model) : null,
        pickupLocationId: form.pickupLocationId,
        pickupDate: form.pickupDate,
        returnDate: form.returnDate,
        days: quote?.days ?? null,
        dailyRate: quote?.dailyRate ?? null,
        estimatedTotal: quote?.total ?? null,
        currency: quote?.currency ?? "USD",
        customer: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        },
        notes: form.notes.trim() || null,
        source: "public-site",
        locale,
      });
      setReceipt(record);
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch {
      setSubmitError(t("booking.error.submit"));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
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

  if (receipt) {
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
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-body-sm text-ink-soft">{t("booking.reference")}</dt>
                  <dd className="font-mono text-title-2 font-medium text-ink" data-keep-mono>
                    {receipt.reference}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-body-sm text-ink-soft">{t("booking.step.vehicle")}</dt>
                  <dd className="text-body-sm text-ink">{receipt.vehicleName}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-body-sm text-ink-soft">{t("booking.step.dates")}</dt>
                  <dd className="font-mono text-body-sm text-ink" data-keep-mono>
                    {`${receipt.pickupDate} → ${receipt.returnDate}`}
                  </dd>
                </div>
                {receipt.estimatedTotal != null ? (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-body-sm text-ink-soft">{t("vehicle.tripTotal")}</dt>
                    <dd className="font-mono text-body-sm text-ink" data-keep-mono>
                      {money(receipt.estimatedTotal, locale, receipt.currency)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-body-sm text-ink-soft">{t("booking.status.label")}</dt>
                  <dd className="text-body-sm text-ink">{t("booking.status.pending")}</dd>
                </div>
              </dl>

              <p className="mt-6 text-caption leading-relaxed text-ink-soft">
                {t("booking.success.note")}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button as={Link} to="/fleet" variant="primary">
                {t("fleet.browseAll")}
              </Button>
              <Button variant="secondary" onClick={reset}>
                {t("booking.success.again")}
              </Button>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow={t("booking.title")} title={t("booking.title")} lede={t("booking.subtitle")} />

      <section className="block-pad" aria-label={t("booking.title")}>
        <div className="container-page grid grid-cols-1 gap-10 lg:grid-cols-[1.5fr_1fr]">
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8" aria-busy={submitting}>
            <fieldset className="flex flex-col gap-5" disabled={loading || submitting}>
              <legend className="text-title-2 font-medium text-ink">
                {t("booking.step.vehicle")}
              </legend>

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
            </fieldset>

            <fieldset className="flex flex-col gap-5 border-t border-line pt-8" disabled={submitting}>
              <legend className="text-title-2 font-medium text-ink">
                {t("booking.step.driver")}
              </legend>

              <Field label={t("booking.field.name")} required error={errors.fullName} id="book-name">
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
                <Field label={t("booking.field.email")} required error={errors.email} id="book-email">
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

                <Field label={t("booking.field.phone")} required error={errors.phone} id="book-phone">
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

              <Field label={t("booking.field.notes")} hint={t("booking.field.notesHint")} id="book-notes">
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

            {submitError ? (
              <p role="alert" className="rounded-md border border-status-closed/40 bg-status-closed-soft px-4 py-3 text-body-sm text-status-closed">
                {submitError}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-line pt-6">
              <Button type="submit" variant="primary" size="lg" disabled={submitting} className="sm:self-start">
                {submitting ? t("booking.submitting") : t("booking.submit")}
              </Button>
              <p className="max-w-xl text-caption leading-relaxed text-ink-muted">
                {t("booking.disclaimer")}
              </p>
            </div>
          </form>

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
                  <div>
                    <p className="text-body font-medium text-ink">
                      {pickLocalized(vehicle.name, locale, vehicle.model)}
                    </p>
                    <p className="label-micro mt-1 text-ink-faint">
                      {categoryLabel}
                    </p>
                  </div>
                  <span
                    className={`label-micro whitespace-nowrap rounded-pill border px-2.5 py-1 ${
                      availability?.state === "available"
                        ? "border-status-open/25 bg-status-open-soft text-status-open"
                        : availability?.state === "unavailable"
                          ? "border-status-closed/30 bg-status-closed-soft text-status-closed"
                          : "border-line bg-surface-sunken text-ink-soft"
                    }`}
                  >
                    {t(availabilityLabelKey(availability?.state ?? "onRequest"))}
                  </span>
                </div>

                {quote?.hasDates ? (
                  <dl className="flex flex-col gap-2.5 text-body-sm">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-ink-muted">
                        {t("card.dayCount", { count: quote.days })}
                        {" × "}
                        {money(quote.dailyRate, locale, quote.currency)}
                      </dt>
                      <dd className="font-mono text-ink-soft" data-keep-mono>
                        {money(quote.baseTotal, locale, quote.currency)}
                      </dd>
                    </div>

                    {quote.discount ? (
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-status-open">
                          {quote.rule?.id === "monthly"
                            ? t("pricing.monthlyDiscount", { pct: quote.discount.pct })
                            : t("pricing.weeklyDiscount", { pct: quote.discount.pct })}
                        </dt>
                        <dd className="font-mono text-status-open" data-keep-mono>
                          {`−${money(quote.discount.amount, locale, quote.currency)}`}
                        </dd>
                      </div>
                    ) : null}

                    {quote.locationFee ? (
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-ink-muted">
                          {quote.locationFee.kind === "airport"
                            ? t("locations.fee")
                            : t("locations.group.delivery")}
                        </dt>
                        <dd className="font-mono text-ink-soft" data-keep-mono>
                          {money(quote.locationFee.amount, locale, quote.currency)}
                        </dd>
                      </div>
                    ) : null}

                    <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                      <dt className="font-medium text-ink">{t("vehicle.tripTotal")}</dt>
                      <dd className="font-mono text-title-2 font-medium text-ink" data-keep-mono>
                        {money(quote.total, locale, quote.currency)}
                      </dd>
                    </div>

                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-ink-muted">{t("pricing.deposit")}</dt>
                      <dd className="font-mono text-ink-soft" data-keep-mono>
                        {money(quote.deposit, locale, quote.currency)}
                      </dd>
                    </div>

                    <p className="text-caption text-ink-muted">{t("vehicle.priceNote")}</p>
                  </dl>
                ) : (
                  <p className="text-body-sm text-ink-muted">{t("vehicle.noDates")}</p>
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
        </div>
      </section>
    </>
  );
}

export default BookPage;
