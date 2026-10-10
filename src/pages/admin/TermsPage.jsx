import { useMemo, useState } from "react";
import {
  emptyTerms,
  formFromTerms,
  normalizeSections,
  termsPatch,
  validateTermsInput,
} from "../../lib/content/termsInput.js";
import { validationKey } from "../../features/admin/fleetDisplay.js";
import { useLocaleContext } from "../../i18n/context.js";
import { useDocumentMeta } from "../../hooks/useDocumentMeta.js";
import { useAsyncData } from "../../hooks/useAsyncData.js";
import { repositories } from "../../lib/repositories/index.js";
import { can } from "../../features/admin/capabilities.js";
import { useSession } from "../../features/admin/sessionContext.js";
import Button from "../../components/ui/Button.jsx";
import Field from "../../components/ui/Field.jsx";
import Icon from "../../components/ui/Icon.jsx";

/**
 * Rental terms — one document, edited as a page rather than as a row.
 *
 * A section's heading points at a translation key because it is navigation, not
 * content; translating it in five languages inline is not something an editor
 * should be asked to do. The body is content and is authored in both languages.
 *
 * The hero of the public site is untouched by this page — it is not content the
 * console owns.
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

function TextAreaField({ label, error, required, value, onChange, dir, rows = 5 }) {
  return (
    <Field label={label} error={error} required={required}>
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

export function TermsPage() {
  const { t } = useLocaleContext();
  const { session } = useSession();
  const mayWrite = can(session?.role, "settings:write");

  const [form, setForm] = useState(() => emptyTerms());
  const [codes, setCodes] = useState([]);
  const [status, setStatus] = useState("editing");
  const [saveError, setSaveError] = useState(null);

  const terms = useAsyncData(() => repositories.getRentalTerms(), []);

  const [seededAt, setSeededAt] = useState(null);
  const updatedAt = terms.data?.updatedAt ?? null;
  if (updatedAt !== null && seededAt !== updatedAt) {
    setSeededAt(updatedAt);
    setForm(formFromTerms(terms.data));
  }

  useDocumentMeta({ title: t("admin.terms.title"), description: null, path: "/admin/terms" });

  const errors = useMemo(() => {
    const map = {};
    for (const code of codes) map[code] = t(validationKey(code));
    return map;
  }, [codes, t]);

  function setSection(index, key, value) {
    setForm((prev) => {
      const sections = normalizeSections(prev.sections);
      sections[index] = { ...sections[index], [key]: value };
      return { ...prev, sections };
    });
  }

  function addSection() {
    setForm((prev) => ({
      ...prev,
      sections: normalizeSections(prev.sections).concat({
        id: "",
        titleKey: "",
        bodyEn: "",
        bodyAr: "",
      }),
    }));
  }

  function removeSection(index) {
    setForm((prev) => ({
      ...prev,
      sections: normalizeSections(prev.sections).filter((_, i) => i !== index),
    }));
  }

  function moveSection(index, delta) {
    setForm((prev) => {
      const sections = normalizeSections(prev.sections);
      const next = index + delta;
      if (next < 0 || next >= sections.length) return prev;
      const [moved] = sections.splice(index, 1);
      sections.splice(next, 0, moved);
      return { ...prev, sections };
    });
  }

  async function submit(event) {
    event?.preventDefault();
    if (status === "saving") return;

    const found = validateTermsInput(form);
    setCodes(found);
    if (found.length) return;

    setStatus("saving");
    setSaveError(null);
    try {
      const patch = termsPatch(form, terms.data);
      if (Object.keys(patch).length === 0) setStatus("unchanged");
      else {
        await repositories.updateRentalTerms(patch);
        terms.reload();
        setStatus("saved");
      }
    } catch (error) {
      setSaveError(error);
      setStatus("editing");
    }
  }

  if (terms.error) {
    return (
      <div role="alert" className="rounded-lg border border-status-closed/30 bg-status-closed-soft p-6">
        <p className="text-body-sm text-ink">{t("states.error.title")}</p>
        <p className="mt-1.5 text-body-sm text-ink-soft">{t("admin.fleet.error")}</p>
        <Button variant="quiet" size="sm" className="mt-4" onClick={() => terms.reload()}>
          {t("states.retry")}
        </Button>
      </div>
    );
  }

  const busy = status === "saving";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title-1 font-medium text-ink">{t("admin.terms.title")}</h1>
          <p className="mt-2 max-w-prose text-body-sm leading-relaxed text-ink-soft">
            {t("admin.terms.subtitle")}
          </p>
        </div>
        {updatedAt ? (
          <span className="font-mono text-caption text-ink-muted" data-keep-mono>
            {t("admin.fleet.updatedAt")} {updatedAt.slice(0, 10)}
          </span>
        ) : null}
      </header>

      {!mayWrite ? (
        <p role="alert" className="rounded-lg border border-status-closed/30 bg-status-closed-soft p-6 text-body-sm text-ink">
          {t("admin.content.termsReadOnly")}
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

      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
          <div className="border-b border-line pb-3">
            <h2 className="text-title-3 font-medium text-ink">{t("admin.terms.introduction")}</h2>
            <p className="mt-1.5 text-caption leading-relaxed text-ink-muted">
              {t("admin.terms.introductionHint")}
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-5">
            <TextAreaField
              label={t("admin.terms.introductionEn")}
              required
              rows={3}
              value={form.introductionEn}
              onChange={(v) => setForm((prev) => ({ ...prev, introductionEn: v }))}
              error={errors.introduction}
            />
            <TextAreaField
              label={t("admin.terms.introductionAr")}
              dir="rtl"
              rows={3}
              value={form.introductionAr}
              onChange={(v) => setForm((prev) => ({ ...prev, introductionAr: v }))}
            />
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
          <div className="border-b border-line pb-3">
            <h2 className="text-title-3 font-medium text-ink">{t("admin.terms.sections")}</h2>
            <p className="mt-1.5 text-caption leading-relaxed text-ink-muted">
              {t("admin.terms.sectionsHint")}
            </p>
          </div>

          <ul className="mt-5 flex flex-col gap-5">
            {(form.sections ?? []).map((section, index) => (
              <li key={section.id || index} className="rounded-md border border-line bg-canvas p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="label-micro text-ink-faint">
                    {t("admin.terms.section")} {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="quiet"
                      size="sm"
                      type="button"
                      onClick={() => moveSection(index, -1)}
                      disabled={index === 0 || busy}
                    >
                      <Icon name="chevronLeft" size={14} />
                      <span className="sr-only">{t("admin.terms.moveUp")}</span>
                    </Button>
                    <Button
                      variant="quiet"
                      size="sm"
                      type="button"
                      onClick={() => moveSection(index, 1)}
                      disabled={index === form.sections.length - 1 || busy}
                    >
                      <Icon name="chevronRight" size={14} />
                      <span className="sr-only">{t("admin.terms.moveDown")}</span>
                    </Button>
                    <Button
                      variant="quiet"
                      size="sm"
                      type="button"
                      onClick={() => removeSection(index)}
                      disabled={busy}
                    >
                      <Icon name="close" size={14} />
                      <span className="sr-only">{t("admin.terms.remove")}</span>
                    </Button>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-4">
                  <TextField
                    label={t("admin.terms.sectionKey")}
                    dir="ltr"
                    hint={t("admin.terms.sectionKeyHint")}
                    value={section.titleKey}
                    onChange={(v) => setSection(index, "titleKey", v)}
                    error={errors.titleKey}
                  />
                  <TextAreaField
                    label={t("admin.terms.sectionBodyEn")}
                    required
                    rows={4}
                    value={section.bodyEn}
                    onChange={(v) => setSection(index, "bodyEn", v)}
                    error={errors.body}
                  />
                  <TextAreaField
                    label={t("admin.terms.sectionBodyAr")}
                    dir="rtl"
                    rows={4}
                    value={section.bodyAr}
                    onChange={(v) => setSection(index, "bodyAr", v)}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button variant="quiet" size="sm" type="button" onClick={addSection} disabled={busy}>
              <Icon name="plus" size={14} />
              {t("admin.terms.addSection")}
            </Button>
            {errors.sections ? (
              <span className="text-caption text-status-closed">{errors.sections}</span>
            ) : null}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy || !mayWrite}>
            {busy ? t("admin.fleet.saving") : t("admin.fleet.save")}
          </Button>
          <Button variant="quiet" onClick={() => terms.reload()} disabled={busy}>
            {t("admin.fleet.discard")}
          </Button>
          {codes.length ? (
            <span role="alert" className="text-caption text-status-closed">
              {t("admin.fleet.invalid")}
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}

export default TermsPage;
