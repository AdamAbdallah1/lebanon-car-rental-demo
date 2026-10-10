import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { pickLocalized, publishLabelKey, publishTone, validationKey } from "../../features/admin/fleetDisplay.js";
import { useLocaleContext } from "../../i18n/context.js";
import { useDocumentMeta } from "../../hooks/useDocumentMeta.js";
import { useAsyncData } from "../../hooks/useAsyncData.js";
import { CONTENT_STATUSES } from "../../lib/content/contentInput.js";
import { CONTENT_SECTIONS } from "../../features/admin/contentSections.js";
import { can } from "../../features/admin/capabilities.js";
import { useSession } from "../../features/admin/sessionContext.js";
import Button from "../../components/ui/Button.jsx";
import Field from "../../components/ui/Field.jsx";
import Icon from "../../components/ui/Icon.jsx";
import StatusMark from "../../components/ui/StatusMark.jsx";
import { AdminNotFound } from "../../features/admin/AdminStates.jsx";

/**
 * One editor for the collections that share a shape.
 *
 * The form holds strings and decides nothing: the domain module normalises and
 * validates, so what the UI accepts is what `firestore.rules` accepts. What is
 * saved is the diff, which keeps an untouched field from overwriting a good one
 * and satisfies the `hasOnly(...)` bounds several rules put on an update.
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

function TextAreaField({ label, hint, error, required, value, onChange, dir, rows = 4 }) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy }) => (
        <textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          dir={dir}
          className={`${INPUT} py-2 leading-relaxed`}
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

/** Two language halves of one field, side by side from `sm` up. */
function LocalizedField({ english, arabic, ...rest }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField label={english.label} required={english.required} value={english.value} onChange={english.onChange} dir="ltr" {...rest} />
      <TextField label={arabic.label} value={arabic.value} onChange={arabic.onChange} dir="rtl" />
    </div>
  );
}

export function ContentEditorPage() {
  const { pathname } = useParams();
  const navigate = useNavigate();
  const { t, locale } = useLocaleContext();
  const { session } = useSession();
  const mayWrite = can(session?.role, "content:write");

  // Which collection this is comes from the path, so one component serves three.
  const section = useMemo(
    () =>
      Object.values(CONTENT_SECTIONS).find(
        (entry) => pathname === entry.base || pathname.startsWith(`${entry.base}/`),
      ) ?? null,
    [pathname],
  );

  const params = useParams();
  const docId = section ? params[section.param] : undefined;
  const isNew = !docId || docId === "new";

  const [form, setForm] = useState(() => section.form.empty());
  const [codes, setCodes] = useState([]);
  const [status, setStatus] = useState("editing");
  const [saveError, setSaveError] = useState(null);
  const [slugTaken, setSlugTaken] = useState(false);

  const doc = useAsyncData(
    () => (isNew || !section ? Promise.resolve(null) : section.readOne(docId)),
    [section?.id, docId, isNew],
    { enabled: !isNew, keepPrevious: true },
  );
  const siblings = useAsyncData(section.load, [section?.id]);

  const [seededId, setSeededId] = useState(null);
  const loadedId = doc.data?.id ?? null;
  if (loadedId !== null && seededId !== loadedId) {
    setSeededId(loadedId);
    setForm(section.form.from(doc.data));
  }

  useDocumentMeta({
    title: isNew ? t(section.newKey) : t(section.titleKey),
    description: null,
    path: section.base,
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

  function slugConflicts(candidate) {
    const value = String(candidate ?? "").trim();
    if (!value || !section.slugTaken) return false;
    return (siblings.data ?? []).some((item) => item.slug === value && item.id !== doc.data?.id);
  }

  async function submit(event) {
    event?.preventDefault();
    if (status === "saving") return;

    const found = section.form.validate(form);
    setCodes(found);
    if (found.length) return;
    if (slugConflicts(form.slug)) {
      setSlugTaken(true);
      return;
    }
    setSlugTaken(false);

    const payload = section.form.normalize(form);
    setStatus("saving");
    setSaveError(null);
    try {
      if (isNew) {
        const created = await section.create(payload);
        navigate(`${section.base}/${created.id}`, { replace: true });
        // Without this the page stays on "Saving…": the route changed, so the
        // operator cannot press anything else until they reload.
        setStatus("saved");
      } else {
        const patch = section.form.patch(form, doc.data);
        if (Object.keys(patch).length === 0) setStatus("unchanged");
        else {
          await section.update(docId, patch);
          doc.reload();
          siblings.reload();
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
      await section.setStatus(docId, next);
      doc.reload();
      siblings.reload();
      setStatus("saved");
    } catch (error) {
      setSaveError(error);
      setStatus("editing");
    }
  }

  function selectOptions() {
    return CONTENT_STATUSES.map((value) => ({ value, label: t(publishLabelKey(value)) }));
  }

  if (!section) return <AdminNotFound />;
  if (!isNew && !doc.loading && !doc.error && doc.data === null) return <AdminNotFound />;

  const notFound = !isNew && !doc.loading && !doc.error && doc.data === null;
  if (notFound) return <AdminNotFound />;

  const loadError = doc.error ?? siblings.error;
  const busy = status === "saving";
  const current = doc.data ?? null;
  const title = isNew
    ? t(section.newKey)
    : pickLocalized(section.primaryField.map((key) => current?.[key] ?? {})[0], locale, docId);
  const isFaq = section.id === "faqs";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link
            to={section.base}
            className="inline-flex min-h-11 items-center gap-1.5 text-caption text-ink-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Icon name="chevronLeft" size={14} />
            {t(section.titleKey)}
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
      {status === "unchanged" ? (
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
      {loadError && !form.slug && !form.titleEn && !form.nameEn && !form.questionEn ? (
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
              <h2 className="text-title-3 font-medium text-ink">{t("admin.content.naming")}</h2>
              <p className="mt-1.5 text-caption leading-relaxed text-ink-muted">
                {t("admin.content.namingHint")}
              </p>
            </div>
            <div className="mt-5 flex flex-col gap-5">
              {isFaq ? (
                <>
                  <LocalizedField
                    english={{ label: t("admin.content.faqs.questionEn"), required: true, value: form.questionEn, onChange: (v) => set("questionEn", v) }}
                    arabic={{ label: t("admin.content.faqs.questionAr"), value: form.questionAr, onChange: (v) => set("questionAr", v) }}
                  />
                  {errors.question ? <p className="text-caption text-status-closed">{errors.question}</p> : null}
                  <TextAreaField
                    label={t("admin.content.faqs.answerEn")}
                    required
                    rows={6}
                    value={form.answerEn}
                    onChange={(v) => set("answerEn", v)}
                    error={errors.answer}
                  />
                  <TextAreaField
                    label={t("admin.content.faqs.answerAr")}
                    dir="rtl"
                    rows={6}
                    value={form.answerAr}
                    onChange={(v) => set("answerAr", v)}
                  />
                </>
              ) : section.id === "categories" ? (
                <>
                  <LocalizedField
                    english={{ label: t("admin.content.categories.nameEn"), required: true, value: form.nameEn, onChange: (v) => set("nameEn", v) }}
                    arabic={{ label: t("admin.content.categories.nameAr"), value: form.nameAr, onChange: (v) => set("nameAr", v) }}
                  />
                  {errors.name ? <p className="text-caption text-status-closed">{errors.name}</p> : null}
                  <TextField
                    label={t("admin.fleet.slug")}
                    required
                    dir="ltr"
                    hint={t("admin.fleet.slugHint")}
                    value={form.slug}
                    onChange={(v) => {
                      set("slug", v);
                      setSlugTaken(false);
                    }}
                    error={slugTaken ? t("admin.fleet.slugTaken") : errors.slug}
                  />
                  <LocalizedField
                    english={{ label: t("admin.content.categories.taglineEn"), value: form.taglineEn, onChange: (v) => set("taglineEn", v) }}
                    arabic={{ label: t("admin.content.categories.taglineAr"), value: form.taglineAr, onChange: (v) => set("taglineAr", v) }}
                  />
                  {errors.tagline ? <p className="text-caption text-status-closed">{errors.tagline}</p> : null}
                </>
              ) : (
                <>
                  <LocalizedField
                    english={{ label: t("admin.content.offers.titleEn"), required: true, value: form.titleEn, onChange: (v) => set("titleEn", v) }}
                    arabic={{ label: t("admin.content.offers.titleAr"), value: form.titleAr, onChange: (v) => set("titleAr", v) }}
                  />
                  {errors.title ? <p className="text-caption text-status-closed">{errors.title}</p> : null}
                  <TextAreaField
                    label={t("admin.content.offers.bodyEn")}
                    required
                    rows={5}
                    value={form.bodyEn}
                    onChange={(v) => set("bodyEn", v)}
                    error={errors.body}
                  />
                  <TextAreaField
                    label={t("admin.content.offers.bodyAr")}
                    dir="rtl"
                    rows={5}
                    value={form.bodyAr}
                    onChange={(v) => set("bodyAr", v)}
                  />
                  <div className="grid gap-5 sm:grid-cols-3">
                    <TextField
                      label={t("admin.content.offers.discountPercent")}
                      inputMode="decimal"
                      dir="ltr"
                      value={form.discountPercent}
                      onChange={(v) => set("discountPercent", v)}
                      error={errors.discountPercent}
                    />
                    <TextField
                      label={t("admin.content.offers.minDays")}
                      inputMode="numeric"
                      dir="ltr"
                      value={form.minDays}
                      onChange={(v) => set("minDays", v)}
                      error={errors.minDays}
                    />
                    <TextField
                      label={t("admin.content.offers.termsKey")}
                      dir="ltr"
                      hint={t("admin.content.offers.termsKeyHint")}
                      value={form.termsKey}
                      onChange={(v) => set("termsKey", v)}
                    />
                  </div>
                </>
              )}
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
                options={selectOptions()}
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
              onClick={() => (isNew ? navigate(section.base) : doc.reload())}
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

          {isFaq && mayWrite ? (
            <div className="rounded-lg border border-status-closed/25 bg-status-closed-soft p-5">
              <h2 className="text-title-3 font-medium text-ink">{t("admin.content.faqs.delete")}</h2>
              <p className="mt-2 text-caption leading-relaxed text-ink-soft">
                {t("admin.content.faqs.deleteHint")}
              </p>
              <Button
                variant="quiet"
                size="sm"
                className="mt-4"
                disabled={busy || isNew}
                onClick={async () => {
                  setStatus("saving");
                  setSaveError(null);
                  try {
                    await section.remove(docId);
                    navigate(section.base, { replace: true });
                  } catch (error) {
                    setSaveError(error);
                    setStatus("editing");
                  }
                }}
              >
                <Icon name="close" size={14} />
                {t("admin.content.faqs.delete")}
              </Button>
            </div>
          ) : null}
        </aside>
      </form>
    </div>
  );
}

export default ContentEditorPage;
