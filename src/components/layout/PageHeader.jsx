import { cn } from "../../lib/cn.js";

/**
 * Shared page introduction: one accent rule, one mono eyebrow, one display
 * heading, one lede. Keeps every route on the same editorial rhythm.
 */
export function PageHeader({ eyebrow, title, lede, actions, children, className }) {
  return (
    <header className={cn("border-b border-line", className)}>
      <div className="container-page flex flex-col gap-6 py-10 lg:py-14">
        {eyebrow ? (
          <p className="flex items-center gap-3">
            <span className="h-px w-8 bg-accent" aria-hidden="true" />
            <span className="label-micro text-ink-muted">{eyebrow}</span>
          </p>
        ) : null}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="font-display text-display-2 text-ink" data-display-font>
              {title}
            </h1>
            {lede ? (
              <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-ink-soft">
                {lede}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>

        {children}
      </div>
    </header>
  );
}

export default PageHeader;
