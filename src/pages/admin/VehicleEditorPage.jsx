import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLocaleContext } from "../../i18n/context.js";
import { pickLocalized, validationKey } from "../../features/admin/fleetDisplay.js";
import { useDocumentMeta } from "../../hooks/useDocumentMeta.js";
import { useAsyncData } from "../../hooks/useAsyncData.js";
import { repositories } from "../../lib/repositories/index.js";
import {
  AVAILABILITY_MODES,
  VEHICLE_STATUSES,
  emptyVehicle,
  formFromVehicle,
  normalizeVehicleInput,
  slugify,
  validateVehicleInput,
  vehiclePatch,
} from "../../lib/fleet/vehicleInput.js";
import { pexels } from "../../lib/fleet/media.js";
import { can } from "../../features/admin/capabilities.js";
import { useSession } from "../../features/admin/sessionContext.js";
import { availabilityLabelKey, publishLabelKey, publishTone } from "../../features/admin/fleetDisplay.js";
import { formatTimestamp } from "../../features/admin/bookingDisplay.js";
import Button from "../../components/ui/Button.jsx";
import Field from "../../components/ui/Field.jsx";
import Icon from "../../components/ui/Icon.jsx";
import StatusMark from "../../components/ui/StatusMark.jsx";
import { AdminNotFound } from "../../features/admin/AdminStates.jsx";

/**
 * Create and edit a vehicle.
 *
 * The form holds strings, never numbers: nothing is parsed, rounded or compared
 * in this component. `normalizeVehicleInput()` and `validateVehicleInput()`
 * own that, so the shape written is the same shape the rules accept and the
 * public site reads.
 *
 * What is saved is the diff. A field the operator never touched is not sent,
 * which is what keeps `firestore.rules`' "only these keys" rule satisfied and
 * an accidental blank from erasing a good value.
 */

const INPUT =
  "min-h-11 w-full rounded-md border border-line bg-surface px-3 text-body-sm text-ink transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

function Section({ title, hint, children }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
      <div className="border-b border-line pb-3">
        <h2 className="text-title-3 font-medium text-ink">{title}</h2>
        {hint ? <p className="mt-1.5 text-caption leading-relaxed text-ink-muted">{hint}</p> : null}
      </div>
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  );
}

function TextField({ label, hint, error, value, onChange, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error}>
      {({ id, describedBy }) => (
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={INPUT}
          {...rest}
        />
      )}
    </Field>
  );
}

function TextAreaField({ label, hint, error, value, onChange, rows = 4, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error}>
      {({ id, describedBy }) => (
        <textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${INPUT} py-2 leading-relaxed`}
          {...rest}
        />
      )}
    </Field>
  );
}

function SelectField({ label, value, onChange, options, error }) {
  return (
    <Field label={label} error={error}>
      {({ id, describedBy }) => (
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={INPUT}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

function CheckboxGroup({ legend, hint, options, selected, onToggle }) {
  return (
    <fieldset className="min-w-0">
      <legend className="label-micro text-ink-muted" data-keep-mono>
        {legend}
      </legend>
      {hint ? <p className="mt-1.5 text-caption text-ink-muted">{hint}</p> : null}
      <div className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <label key={option.value} className="flex min-h-11 items-center gap-2.5 text-body-sm text-ink">
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => onToggle(option.value)}
              className="size-4 shrink-0 accent-[var(--color-accent)]"
            />
            <span className="min-w-0">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function MediaRow({ photoId, index, onChange, onRemove, t }) {
  const numeric = /^\d+$/.test(photoId.trim());
  return (
    <li className="flex flex-wrap items-end gap-3 border-b border-line py-3">
      <span className="w-16 shrink-0" aria-hidden="true">
        {numeric ? (
          <img
            src={pexels(photoId.trim(), { w: 96, h: 64 })}
            alt=""
            loading="lazy"
            className="h-12 w-16 rounded-xs border border-line object-cover"
          />
        ) : (
          <span className="flex h-12 w-16 items-center justify-center rounded-xs border border-dashed border-line text-ink-faint">
            <Icon name="info" size={14} />
          </span>
        )}
      </span>
      <label className="min-w-0 flex-1">
        <span className="label-micro text-ink-faint" data-keep-mono>
          {t("admin.fleet.photo.ref")} {index + 1}
        </span>
        <input
          value={photoId}
          onChange={(event) => onChange(index, event.target.value)}
          inputMode="numeric"
          dir="ltr"
          className={`${INPUT} mt-1.5 font-mono`}
          data-keep-mono
        />
      </label>
      <Button variant="quiet" size="sm" onClick={() => onRemove(index)}>
        <Icon name="close" size={14} />
        {t("admin.fleet.photo.remove")}
      </Button>
    </li>
  );
}

export function VehicleEditorPage() {
  const { vehicleId } = useParams();
  const isNew = !vehicleId || vehicleId === "new";
  const navigate = useNavigate();
  const { t, locale } = useLocaleContext();
  // The role is a fact about the session, read the same way the shell reads it.
  const { session } = useSession();
  const mayWrite = can(session?.role, "fleet:write");

  const [form, setForm] = useState(() => emptyVehicle());
  const [codes, setCodes] = useState([]);
  const [slugTaken, setSlugTaken] = useState(false);
  const [status, setStatus] = useState("editing");
  const [saveError, setSaveError] = useState(null);

  const vehicle = useAsyncData(
    () => (isNew ? Promise.resolve(null) : repositories.getVehicleForAdmin(vehicleId)),
    [vehicleId, isNew],
    // `keepPrevious` matters: a reload after a save must not blank the form for
    // the round trip, or every write would visibly wipe what was typed.
    { enabled: !isNew, keepPrevious: true },
  );
  const all = useAsyncData(() => repositories.queryAllVehicles({ sort: "sortOrder" }), []);
  const categories = useAsyncData(() => repositories.queryCategories(), []);
  const inclusions = useAsyncData(() => repositories.queryInclusions(), []);
  const locations = useAsyncData(() => repositories.queryLocations(), []);

  const loadError = vehicle.error ?? categories.error ?? inclusions.error ?? locations.error ?? all.error;
  const notFound = !isNew && !vehicle.loading && !vehicle.error && vehicle.data === null;

  // Seed the form when a *document* arrives. React's supported way to reset
  // state in response to a changed prop: comparing during render, not from an
  // effect. Keyed on the id, never on the data itself — a reload keeps the same
  // id, and treating a transient `undefined` as a new document would throw away
  // whatever the operator had typed but not yet saved.
  const [seededId, setSeededId] = useState(null);
  const loadedId = vehicle.data?.id ?? null;
  if (loadedId !== null && seededId !== loadedId) {
    setSeededId(loadedId);
    setForm(formFromVehicle(vehicle.data));
  }

  useDocumentMeta({
    title: isNew ? t("admin.fleet.new") : t("admin.fleet.editTitle"),
    description: null,
    path: isNew ? "/admin/fleet/new" : `/admin/fleet/${vehicleId ?? ""}`,
  });

  const errors = useMemo(() => {
    const map = {};
    for (const code of codes) map[code] = t(validationKey(code));
    return map;
  }, [codes, t]);

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setCodes((prev) => prev.filter((code) => code !== "global"));
  }

  function toggleIn(key, value) {
    setForm((prev) => {
      const current = prev[key] ?? [];
      return {
        ...prev,
        [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
      };
    });
  }

  /** A slug is a URL. Another vehicle already using it must break nothing. */
  function slugConflicts(candidate, currentVehicle) {
    const slug = slugify(candidate);
    if (!slug) return false;
    return (all.data ?? []).some(
      (item) => item.slug === slug && item.id !== currentVehicle?.id,
    );
  }

  async function submit(event) {
    event?.preventDefault();
    if (status === "saving") return;

    const found = validateVehicleInput(form);
    setCodes(found);
    if (found.length) return;

    const current = vehicle.data ?? null;
    if (slugConflicts(form.slug, current)) {
      setSlugTaken(true);
      return;
    }
    setSlugTaken(false);

    const doc = normalizeVehicleInput(form);
    setStatus("saving");
    setSaveError(null);
    try {
      if (isNew) {
        const created = await repositories.createVehicle(doc);
        navigate(`/admin/fleet/${created.id}`, { replace: true });
        setStatus("saved");
      } else {
        const patch = vehiclePatch(form, current);
        if (Object.keys(patch).length === 0) {
          setStatus("unchanged");
        } else {
          await repositories.updateVehicle(vehicleId, patch);
          vehicle.reload();
          all.reload();
          setStatus("saved");
        }
      }
    } catch (error) {
      setSaveError(error);
      setStatus("editing");
    }
  }

  async function applyStatus(next) {
    setStatus("saving");
    setSaveError(null);
    try {
      await repositories.setVehicleStatus(vehicleId, next);
      vehicle.reload();
      all.reload();
      setStatus("saved");
    } catch (error) {
      setSaveError(error);
      setStatus("editing");
    }
  }

  function setMediaRef(index, value) {
    setForm((prev) => {
      const next = [...prev.mediaRefs];
      next[index] = value;
      return { ...prev, mediaRefs: next };
    });
  }

  function removeMediaRef(index) {
    setForm((prev) => ({ ...prev, mediaRefs: prev.mediaRefs.filter((_, i) => i !== index) }));
  }

  function addMediaRef() {
    setForm((prev) => ({ ...prev, mediaRefs: [...prev.mediaRefs, ""] }));
  }

  if (notFound) return <AdminNotFound />;
  if (loadError && !form.slug) {
    return (
      <div role="alert" className="rounded-lg border border-status-closed/30 bg-status-closed-soft p-6">
        <p className="text-body-sm text-ink">{t("states.error.title")}</p>
        <p className="mt-1.5 text-body-sm text-ink-soft">{t("admin.fleet.error")}</p>
        <Button variant="quiet" size="sm" className="mt-4" onClick={() => vehicle.reload()}>
          {t("states.retry")}
        </Button>
      </div>
    );
  }

  const busy = status === "saving";
  const saved = status === "saved";
  const unchanged = status === "unchanged";
  const current = vehicle.data ?? null;
  const publicPath = current?.status === "active" && current.slug ? `/fleet/${current.slug}` : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/admin/fleet"
            className="inline-flex min-h-11 items-center gap-1.5 text-caption text-ink-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Icon name="chevronLeft" size={14} />
            {t("admin.fleet.title")}
          </Link>
          <h1 className="mt-2 text-title-1 font-medium text-ink">
            {isNew ? t("admin.fleet.new") : pickLocalized(current?.name, locale, vehicleId)}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {current ? (
              <StatusMark
                tone={publishTone(current.status)}
                label={t(publishLabelKey(current.status))}
                size="sm"
              />
            ) : (
              <span className="text-caption text-ink-muted">{t("admin.fleet.draft")}</span>
            )}
            {current ? (
              <span className="font-mono text-caption text-ink-muted" data-keep-mono>
                {t("admin.fleet.updatedAt")} {formatTimestamp(current.updatedAt ?? current.createdAt, locale)}
              </span>
            ) : null}
            {publicPath ? (
              <Link
                to={publicPath}
                className="inline-flex items-center gap-1 text-caption text-ink underline-offset-4 hover:text-accent hover:underline"
              >
                {t("admin.fleet.viewOnSite")}
                <Icon name="external" size={13} />
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {!mayWrite ? (
        <p role="alert" className="rounded-lg border border-status-closed/30 bg-status-closed-soft p-6 text-body-sm text-ink">
          {t("admin.fleet.readOnly")}
        </p>
      ) : null}

      {saved ? (
        <p className="flex items-start gap-2 rounded-md border border-status-open/30 bg-status-open-soft px-4 py-3 text-body-sm text-ink">
          <Icon name="check" size={16} className="mt-0.5 shrink-0 text-status-open" />
          <span>{t("admin.fleet.saved")}</span>
        </p>
      ) : null}
      {unchanged ? (
        <p className="rounded-md border border-line bg-surface px-4 py-3 text-body-sm text-ink-soft">
          {t("admin.fleet.unchanged")}
        </p>
      ) : null}
      {saveError ? (
        <p role="alert" className="flex items-start gap-2 rounded-md border border-status-closed/30 bg-status-closed-soft px-4 py-3 text-body-sm text-ink">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-status-closed" />
          <span>{t("admin.fleet.saveFailed")}</span>
        </p>
      ) : null}

      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* ---- identity ---- */}
          <Section title={t("admin.fleet.identity")}>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label={t("admin.fleet.make")}
                required
                value={form.make}
                onChange={(value) => set("make", value)}
                error={errors.make}
              />
              <TextField
                label={t("admin.fleet.model")}
                required
                value={form.model}
                onChange={(value) => set("model", value)}
                error={errors.model}
              />
              <TextField
                label={t("admin.fleet.year")}
                inputMode="numeric"
                dir="ltr"
                required
                value={form.year}
                onChange={(value) => set("year", value)}
                error={errors.year}
              />
              <SelectField
                label={t("admin.fleet.category")}
                value={form.categoryId}
                onChange={(value) => set("categoryId", value)}
                error={errors.categoryId}
                options={(categories.data ?? []).map((category) => ({
                  value: category.id,
                  label: pickLocalized(category.name, locale, category.id),
                }))}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label={t("admin.fleet.slug")}
                required
                dir="ltr"
                hint={t("admin.fleet.slugHint")}
                value={form.slug}
                onChange={(value) => {
                  set("slug", value);
                  setSlugTaken(false);
                }}
                error={slugTaken ? t("admin.fleet.slugTaken") : errors.slug}
              />
              <SelectField
                label={t("admin.fleet.publishAction")}
                value={form.status}
                onChange={(value) => set("status", value)}
                options={VEHICLE_STATUSES.map((value) => ({
                  value,
                  label: t(publishLabelKey(value)),
                }))}
              />
              <TextField
                label={t("admin.fleet.sortOrder")}
                inputMode="numeric"
                dir="ltr"
                value={form.sortOrder}
                onChange={(value) => set("sortOrder", value)}
              />
              <SelectField
                label={t("admin.fleet.availabilityField")}
                value={form.availability}
                onChange={(value) => set("availability", value)}
                error={errors.availability}
                options={AVAILABILITY_MODES.map((value) => ({
                  value,
                  label: t(availabilityLabelKey(value)),
                }))}
              />
            </div>

            <label className="flex min-h-11 items-center gap-2.5 text-body-sm text-ink">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={() => set("featured", !form.featured)}
                className="size-4 accent-[var(--color-accent)]"
              />
              {t("admin.fleet.featured")}
            </label>
          </Section>

          {/* ---- naming, both languages inline ---- */}
          <Section title={t("admin.fleet.naming")} hint={t("admin.fleet.namingHint")}>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label={t("admin.fleet.nameEn")}
                required
                value={form.nameEn}
                onChange={(value) => set("nameEn", value)}
                error={errors.name}
              />
              <TextField
                label={t("admin.fleet.nameAr")}
                dir="rtl"
                value={form.nameAr}
                onChange={(value) => set("nameAr", value)}
              />
              <TextField
                label={t("admin.fleet.trimEn")}
                value={form.trimEn}
                onChange={(value) => set("trimEn", value)}
              />
              <TextField
                label={t("admin.fleet.trimAr")}
                dir="rtl"
                value={form.trimAr}
                onChange={(value) => set("trimAr", value)}
              />
              <TextField
                label={t("admin.fleet.bodyTypeEn")}
                required
                value={form.bodyTypeEn}
                onChange={(value) => set("bodyTypeEn", value)}
                error={errors.bodyType}
              />
              <TextField
                label={t("admin.fleet.bodyTypeAr")}
                dir="rtl"
                value={form.bodyTypeAr}
                onChange={(value) => set("bodyTypeAr", value)}
              />
            </div>
            <TextAreaField
              label={t("admin.fleet.descriptionEn")}
              required
              rows={7}
              value={form.descriptionEn}
              onChange={(value) => set("descriptionEn", value)}
              error={errors.description}
            />
            <TextAreaField
              label={t("admin.fleet.descriptionAr")}
              dir="rtl"
              rows={7}
              value={form.descriptionAr}
              onChange={(value) => set("descriptionAr", value)}
            />
          </Section>

          {/* ---- pricing ---- */}
          <Section title={t("admin.fleet.pricing")} hint={t("admin.fleet.pricingHint")}>
            <div className="grid gap-5 sm:grid-cols-3">
              <TextField
                label={t("admin.fleet.daily")}
                required
                inputMode="decimal"
                dir="ltr"
                value={form.daily}
                onChange={(value) => set("daily", value)}
                error={errors.daily}
              />
              <TextField
                label={t("admin.fleet.currency")}
                required
                dir="ltr"
                maxLength={3}
                value={form.currency}
                onChange={(value) => set("currency", value.toUpperCase())}
                error={errors.currency}
              />
              <TextField
                label={t("admin.fleet.deposit")}
                required
                inputMode="decimal"
                dir="ltr"
                value={form.deposit}
                onChange={(value) => set("deposit", value)}
                error={errors.deposit}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <TextField
                label={t("admin.fleet.weeklyDiscount")}
                inputMode="decimal"
                dir="ltr"
                value={form.weeklyDiscountPct}
                onChange={(value) => set("weeklyDiscountPct", value)}
              />
              <TextField
                label={t("admin.fleet.weeklyMinDays")}
                inputMode="numeric"
                dir="ltr"
                value={form.weeklyMinDays}
                onChange={(value) => set("weeklyMinDays", value)}
              />
              <TextField
                label={t("admin.fleet.monthlyDiscount")}
                inputMode="decimal"
                dir="ltr"
                value={form.monthlyDiscountPct}
                onChange={(value) => set("monthlyDiscountPct", value)}
              />
              <TextField
                label={t("admin.fleet.monthlyMinDays")}
                inputMode="numeric"
                dir="ltr"
                value={form.monthlyMinDays}
                onChange={(value) => set("monthlyMinDays", value)}
              />
            </div>
          </Section>

          {/* ---- specs, mileage, insurance ---- */}
          <Section title={t("admin.fleet.specs")}>
            <div className="grid gap-5 sm:grid-cols-3">
              <TextField
                label={t("admin.fleet.seats")}
                inputMode="numeric"
                dir="ltr"
                value={form.seats}
                onChange={(value) => set("seats", value)}
                error={errors.seats}
              />
              <TextField
                label={t("admin.fleet.doors")}
                inputMode="numeric"
                dir="ltr"
                value={form.doors}
                onChange={(value) => set("doors", value)}
                error={errors.doors}
              />
              <TextField
                label={t("admin.fleet.luggage")}
                inputMode="numeric"
                dir="ltr"
                value={form.luggage}
                onChange={(value) => set("luggage", value)}
                error={errors.luggage}
              />
              <TextField
                label={t("admin.fleet.transmission")}
                value={form.transmission}
                onChange={(value) => set("transmission", value)}
              />
              <TextField
                label={t("admin.fleet.fuel")}
                value={form.fuel}
                onChange={(value) => set("fuel", value)}
              />
              <TextField
                label={t("admin.fleet.includedKm")}
                inputMode="numeric"
                dir="ltr"
                value={form.includedKm}
                onChange={(value) => set("includedKm", value)}
                error={errors.includedKm}
              />
              <TextField
                label={t("admin.fleet.overagePerKm")}
                inputMode="decimal"
                dir="ltr"
                value={form.overagePerKm}
                onChange={(value) => set("overagePerKm", value)}
              />
              <TextField
                label={t("admin.fleet.insuranceExcess")}
                inputMode="decimal"
                dir="ltr"
                value={form.insuranceExcess}
                onChange={(value) => set("insuranceExcess", value)}
              />
              <TextField
                label={t("admin.fleet.insurancePlan")}
                value={form.insurancePlan}
                onChange={(value) => set("insurancePlan", value)}
              />
            </div>
          </Section>

          {/* ---- where it can be picked up ---- */}
          <Section title={t("admin.fleet.locations")} hint={t("admin.fleet.locationsHint")}>
            <CheckboxGroup
              legend={t("admin.fleet.pickupPoints")}
              options={(locations.data ?? []).map((location) => ({
                value: location.id,
                label: pickLocalized(location.shortName ?? location.name, locale, location.id),
              }))}
              selected={form.locationIds}
              onToggle={(value) => toggleIn("locationIds", value)}
            />
            {errors.locations ? (
              <p className="text-caption text-status-closed" role="alert">
                {errors.locations}
              </p>
            ) : null}
          </Section>

          {/* ---- what comes with it ---- */}
          <Section title={t("admin.fleet.inclusions")} hint={t("admin.fleet.inclusionsHint")}>
            <CheckboxGroup
              legend={t("admin.fleet.extras")}
              options={(inclusions.data ?? []).map((inclusion) => ({
                value: inclusion.id,
                label: pickLocalized(inclusion.name, locale, inclusion.id),
              }))}
              selected={form.inclusionIds}
              onToggle={(value) => toggleIn("inclusionIds", value)}
            />
          </Section>

          {/* ---- photographs ---- */}
          <Section title={t("admin.fleet.photos")} hint={t("admin.fleet.photosHint")}>
            <ul className="flex flex-col">
              {form.mediaRefs.map((photoId, index) => (
                <MediaRow
                  key={`${index}-${photoId}`}
                  photoId={photoId}
                  index={index}
                  onChange={setMediaRef}
                  onRemove={removeMediaRef}
                  t={t}
                />
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="quiet" size="sm" onClick={addMediaRef} type="button">
                <Icon name="plus" size={14} />
                {t("admin.fleet.photo.add")}
              </Button>
              {errors.media ? (
                <span className="text-caption text-status-closed" role="alert">
                  {errors.media}
                </span>
              ) : null}
            </div>
          </Section>
        </div>

        {/* ---- the panel that actually saves ---- */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-line bg-surface p-5">
            <h2 className="text-title-3 font-medium text-ink">{t("admin.fleet.save")}</h2>
            <p className="mt-2 text-caption leading-relaxed text-ink-muted">
              {t("admin.fleet.saveHint")}
            </p>
            {codes.length ? (
              <p role="alert" className="mt-4 text-caption text-status-closed">
                {t("admin.fleet.invalid")}
              </p>
            ) : null}
            <Button type="submit" className="mt-4 w-full" disabled={busy || !mayWrite}>
              {busy ? t("admin.fleet.saving") : t("admin.fleet.save")}
            </Button>
            <Button
              variant="quiet"
              className="mt-2 w-full"
              onClick={() => (isNew ? navigate("/admin/fleet") : vehicle.reload())}
              disabled={busy}
            >
              {t("admin.fleet.discard")}
            </Button>
          </div>

          {!isNew && mayWrite ? (
            <div className="rounded-lg border border-line bg-surface p-5">
              <h2 className="text-title-3 font-medium text-ink">{t("admin.fleet.state")}</h2>
              <p className="mt-2 text-caption leading-relaxed text-ink-muted">
                {t("admin.fleet.stateHint")}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {current?.status !== "active" ? (
                  <Button variant="secondary" size="sm" onClick={() => applyStatus("active")} disabled={busy}>
                    {t("admin.fleet.publishAction")}
                  </Button>
                ) : (
                  <Button variant="quiet" size="sm" onClick={() => applyStatus("draft")} disabled={busy}>
                    {t("admin.fleet.unpublish")}
                  </Button>
                )}
                <Button variant="quiet" size="sm" onClick={() => applyStatus("archived")} disabled={busy}>
                  {t("admin.fleet.archive")}
                </Button>
                {current?.status === "archived" ? (
                  <Button variant="quiet" size="sm" onClick={() => applyStatus("draft")} disabled={busy}>
                    {t("admin.fleet.restore")}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </aside>
      </form>
    </div>
  );
}

export default VehicleEditorPage;
