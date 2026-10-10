import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { pickLocalized, publishLabelKey, publishTone, validationKey } from "../../features/admin/fleetDisplay.js";
import { useLocaleContext } from "../../i18n/context.js";
import { useDocumentMeta } from "../../hooks/useDocumentMeta.js";
import { useAsyncData } from "../../hooks/useAsyncData.js";
import { repositories } from "../../lib/repositories/index.js";
import { CONTENT_STATUSES } from "../../lib/content/contentInput.js";
import {
  LOCATION_TYPES,
  emptyLocation,
  formFromLocation,
  locationPatch,
  normalizeLocationInput,
  validateLocationInput,
} from "../../lib/content/locationInput.js";
import { can } from "../../features/admin/capabilities.js";
import { useSession } from "../../features/admin/sessionContext.js";
import Button from "../../components/ui/Button.jsx";
import Field from "../../components/ui/Field.jsx";
import Icon from "../../components/ui/Icon.jsx";
import StatusMark from "../../components/ui/StatusMark.jsx";
import { AdminNotFound } from "../../features/admin/AdminStates.jsx";

/**
 * One location, editable.
 *
 * Two-language fields sit side by side because that is how a person edits them:
 * write the English, then the Arabic, without scrolling past a dozen fields to
 * remember what they were translating. Everything language-neutral — the fee,
 * the coordinates, the hours — is a single field, because it is not something
 * that varies by language.
 */

const INPUT =
  "min-h-11 w-full rounded-md border border-line bg-surface px-3 text-body-sm text-ink transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

function TextField({ label, hint, error, required, value, onChange, dir, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy }) => (
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          dir={dir}
          className={INPUT}
          {...rest}
        />
      )}
    </Field>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <Field label={label}>
      {({ id }) => (
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
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

function Pair({ english, arabic }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField label={english.label} required={english.required} value={english.value} onChange={english.onChange} dir="ltr" />
      <TextField label={arabic.label} value={arabic.value} onChange={arabic.onChange} dir="rtl" />
    </div>
  );
}

export function LocationEditorPage() {
  const { locationId } = useParams();
  const isNew = !locationId || locationId === "new";
  const navigate = useNavigate();
  const { t, locale } = useLocaleContext();
  const { session } = useSession();
  const mayWrite = can(session?.role, "content:write");

  const [form, setForm] = useState(() => emptyLocation());
  const [codes, setCodes] = useState([]);
  const [status, setStatus] = useState("editing");
  const [saveError, setSaveError] = useState(null);

  const doc = useAsyncData(
    () => (isNew ? Promise.resolve(null) : repositories.getContentById("locations", locationId)),
    [locationId, isNew],
    { enabled: !isNew, keepPrevious: true },
  );

  const [seededId, setSeededId] = useState(null);
  const loadedId = doc.data?.id ?? null;
  if (loadedId !== null && seededId !== loadedId) {
    setSeededId(loadedId);
    setForm(formFromLocation(doc.data));
  }

  useDocumentMeta({
    title: isNew ? t("admin.locations.new") : t("admin.locations.title"),
    description: null,
    path: "/admin/locations",
  });

  const errors = useMemo(() => {
    const map = {};
    for (const code of codes) map[code] = t(validationKey(code));
    return map;
  }, [codes, t]);

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setCodes((prev) => prev.filter((code) => code !== key));
  }

  async function submit(event) {
    event?.preventDefault();
    if (status === "saving") return;
    const found = validateLocationInput(form);
    setCodes(found);
    if (found.length) return;

    setStatus("saving");
    setSaveError(null);
    try {
      if (isNew) {
        const created = await repositories.createLocation(normalizeLocationInput(form));
        navigate(`/admin/locations/${created.id}`, { replace: true });
        // Without this the page stays on "Saving…": the route changed, so the
        // operator cannot press anything else until they reload.
        setStatus("saved");
      } else {
        const patch = locationPatch(form, doc.data);
        if (Object.keys(patch).length === 0) setStatus("unchanged");
        else {
          await repositories.updateLocation(locationId, patch);
          doc.reload();
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
      await repositories.setLocationStatus(locationId, next);
      doc.reload();
      setStatus("saved");
    } catch (error) {
      setSaveError(error);
      setStatus("editing");
    }
  }

  if (!isNew && !doc.loading && !doc.error && doc.data === null) return <AdminNotFound />;

  const loadError = doc.error;
  const busy = status === "saving";
  const current = doc.data ?? null;
  const title = isNew ? t("admin.locations.new") : pickLocalized(current?.name, locale, locationId);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/admin/locations"
            className="inline-flex min-h-11 items-center gap-1.5 text-caption text-ink-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Icon name="chevronLeft" size={14} />
            {t("admin.locations.title")}
          </Link>
          <h1 className="mt-2 text-title-1 font-medium text-ink">{title}</h1>
          {current ? (
            <div className="mt-3">
              <StatusMark
                tone={publishTone(current.status === undefined ? "active" : current.status)}
                label={t(publishLabelKey(current.status === undefined ? "active" : current.status))}
                size="sm"
              />
            </div>
          ) : null}
        </div>
      </header>

      {!mayWrite ? (
        <p role="alert" className="rounded-lg border border-status-closed/30 bg-status-closed-soft p-6 text-body-sm text-ink">
          {t("admin.fleet.readOnly")}
        </p>
      ) : null}

      {status === "saved" ? (
        <p className="flex items-start gap-2 rounded-md border border-status-open/30 bg-status-open-soft px-4 py-3 text-body-sm text-ink">
          <Icon name="check" size={16} className="mt-0.5 shrink-0 text-status-open" />
          <span>{t("admin.fleet.saved")}</span>
        </p>
      ) : null}
      {saveError ? (
        <p role="alert" className="flex items-start gap-2 rounded-md border border-status-closed/30 bg-status-closed-soft px-4 py-3 text-body-sm text-ink">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-status-closed" />
          <span>{t("admin.fleet.saveFailed")}</span>
        </p>
      ) : null}
      {loadError && !form.nameEn ? (
        <div role="alert" className="rounded-lg border border-status-closed/30 bg-status-closed-soft p-6">
          <p className="text-body-sm text-ink">{t("states.error.title")}</p>
          <p className="mt-1.5 text-body-sm text-ink-soft">{t("admin.fleet.error")}</p>
          <Button variant="quiet" size="sm" className="mt-4" onClick={() => doc.reload()}>
            {t("states.retry")}
          </Button>
        </div>
      ) : null}

      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
            <div className="border-b border-line pb-3">
              <h2 className="text-title-3 font-medium text-ink">{t("admin.locations.naming")}</h2>
              <p className="mt-1.5 text-caption leading-relaxed text-ink-muted">
                {t("admin.content.namingHint")}
              </p>
            </div>
            <div className="mt-5 flex flex-col gap-5">
              <Pair
                english={{ label: t("admin.locations.nameEn"), required: true, value: form.nameEn, onChange: (v) => set("nameEn", v) }}
                arabic={{ label: t("admin.locations.nameAr"), value: form.nameAr, onChange: (v) => set("nameAr", v) }}
              />
              {errors.name ? <p className="text-caption text-status-closed">{errors.name}</p> : null}
              <Pair
                english={{ label: t("admin.locations.shortNameEn"), value: form.shortNameEn, onChange: (v) => set("shortNameEn", v) }}
                arabic={{ label: t("admin.locations.shortNameAr"), value: form.shortNameAr, onChange: (v) => set("shortNameAr", v) }}
              />
              {errors.shortName ? <p className="text-caption text-status-closed">{errors.shortName}</p> : null}
              <Pair
                english={{ label: t("admin.locations.addressEn"), value: form.addressEn, onChange: (v) => set("addressEn", v) }}
                arabic={{ label: t("admin.locations.addressAr"), value: form.addressAr, onChange: (v) => set("addressAr", v) }}
              />
              {errors.address ? <p className="text-caption text-status-closed">{errors.address}</p> : null}
              <Pair
                english={{ label: t("admin.locations.areaEn"), value: form.areaEn, onChange: (v) => set("areaEn", v) }}
                arabic={{ label: t("admin.locations.areaAr"), value: form.areaAr, onChange: (v) => set("areaAr", v) }}
              />
              {errors.area ? <p className="text-caption text-status-closed">{errors.area}</p> : null}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
            <div className="border-b border-line pb-3">
              <h2 className="text-title-3 font-medium text-ink">{t("admin.locations.operational")}</h2>
              <p className="mt-1.5 text-caption leading-relaxed text-ink-muted">
                {t("admin.locations.operationalHint")}
              </p>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <SelectField
                label={t("admin.locations.type.label")}
                value={form.type}
                onChange={(v) => set("type", v)}
                options={LOCATION_TYPES.map((value) => ({ value, label: t(`admin.locations.type.${value}`) }))}
              />
              <TextField
                label={t("admin.locations.group.label")}
                dir="ltr"
                value={form.group}
                onChange={(v) => set("group", v)}
                error={errors.group}
              />
              <TextField
                label={t("admin.locations.code")}
                dir="ltr"
                value={form.code}
                onChange={(v) => set("code", v)}
                error={errors.code}
              />
              <TextField
                label={t("admin.locations.serviceFee")}
                inputMode="decimal"
                dir="ltr"
                value={form.serviceFee}
                onChange={(v) => set("serviceFee", v)}
                error={errors.serviceFee}
              />
              <TextField
                label={t("admin.locations.lat")}
                inputMode="decimal"
                dir="ltr"
                value={form.lat}
                onChange={(v) => set("lat", v)}
                error={errors.lat}
              />
              <TextField
                label={t("admin.locations.lng")}
                inputMode="decimal"
                dir="ltr"
                value={form.lng}
                onChange={(v) => set("lng", v)}
                error={errors.lng}
              />
              <TextField
                label={t("admin.locations.hoursOpen")}
                dir="ltr"
                value={form.hoursOpen}
                onChange={(v) => set("hoursOpen", v)}
                error={errors.hours}
              />
              <TextField
                label={t("admin.locations.hoursClose")}
                dir="ltr"
                value={form.hoursClose}
                onChange={(v) => set("hoursClose", v)}
              />
              <TextField
                label={t("admin.locations.hoursDays")}
                value={form.hoursDays}
                onChange={(v) => set("hoursDays", v)}
              />
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <label className="flex min-h-11 items-center gap-2.5 text-body-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.allowsDifferentReturn}
                  onChange={() => set("allowsDifferentReturn", !form.allowsDifferentReturn)}
                  className="size-4 accent-[var(--color-accent)]"
                />
                {t("admin.locations.differentReturn")}
              </label>
              <label className="flex min-h-11 items-center gap-2.5 text-body-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.deliveryOnly}
                  onChange={() => set("deliveryOnly", !form.deliveryOnly)}
                  className="size-4 accent-[var(--color-accent)]"
                />
                {t("admin.locations.deliveryOnly")}
              </label>
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-line bg-surface p-5">
            <h2 className="text-title-3 font-medium text-ink">{t("admin.fleet.save")}</h2>
            <p className="mt-2 text-caption leading-relaxed text-ink-muted">{t("admin.fleet.saveHint")}</p>
            <div className="mt-4 flex flex-col gap-4">
              <SelectField
                label={t("admin.fleet.publish")}
                value={form.status}
                onChange={(v) => set("status", v)}
                options={CONTENT_STATUSES.map((value) => ({ value, label: t(publishLabelKey(value)) }))}
              />
              <TextField
                label={t("admin.fleet.sortOrder")}
                inputMode="numeric"
                dir="ltr"
                value={form.sortOrder}
                onChange={(v) => set("sortOrder", v)}
                error={errors.sortOrder}
              />
            </div>
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
              onClick={() => (isNew ? navigate("/admin/locations") : doc.reload())}
              disabled={busy}
            >
              {t("admin.fleet.discard")}
            </Button>
          </div>

          {!isNew && mayWrite ? (
            <div className="rounded-lg border border-line bg-surface p-5">
              <h2 className="text-title-3 font-medium text-ink">{t("admin.fleet.state")}</h2>
              <p className="mt-2 text-caption leading-relaxed text-ink-muted">{t("admin.fleet.stateHint")}</p>
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
              </div>
            </div>
          ) : null}
        </aside>
      </form>
    </div>
  );
}

export default LocationEditorPage;
