import { useLocaleContext, usePick } from "../i18n/context.js";
import { repositories } from "../lib/repositories/index.js";
import { useAsyncData } from "../hooks/useAsyncData.js";

/**
 * "How it works" — four steps, sourced from homeSections so the admin can
 * reorder or reword them without a deploy.
 */
export function Steps() {
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();

  const { data } = useAsyncData(() => repositories.getHomeSections(), []);
  const section = data?.find((s) => s.type === "steps");
  const steps = section?.steps ?? [];

  if (!steps.length) return null;

  return (
    <section aria-labelledby="steps-title" className="section-pad border-b border-line">
      <div className="container-page">
        <h2
          id="steps-title"
          className="font-display text-display-3 text-ink"
          data-display-font
        >
          {t("search.legend")}
        </h2>

        <ol className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.id} className="flex flex-col gap-3 bg-surface p-5 lg:p-6">
              <span
                className="label-micro text-accent"
                data-keep-mono
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-title-3 font-medium text-ink">
                {pickLocalized(step.title, locale)}
              </h3>
              <p className="text-body-sm leading-relaxed text-ink-muted">
                {pickLocalized(step.body, locale)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default Steps;
