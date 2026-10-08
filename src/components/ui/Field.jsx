import { useId } from "react";
import { cn } from "../../lib/cn.js";

/**
 * Label + control + hint/error, wired with real `for`/`aria-describedby`.
 * Every input in the app gets its visible label — no placeholder-only fields.
 */
export function Field({ label, hint, error, required, children, className, id: providedId }) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="label-micro text-ink-muted"
        data-keep-mono
      >
        {label}
        {required ? (
          <span className="text-accent" aria-hidden="true">
            {" *"}
          </span>
        ) : null}
      </label>
      {children({ id, describedBy: [hintId, errorId].filter(Boolean).join(" ") || undefined })}
      {hint && !error ? (
        <p id={hintId} className="text-caption text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-caption text-status-closed" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default Field;
