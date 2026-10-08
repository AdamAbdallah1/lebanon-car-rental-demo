import { cn } from "../../lib/cn.js";

/**
 * Native date input — the OS picker is more accessible and more reliable on
 * mobile than any custom calendar, and it keeps the bundle small.
 * The control is styled to the editorial system; the picker is not.
 */
export function DateInput({ id, describedBy, value, min, max, onChange, className, invalid }) {
  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        type="date"
        value={value ?? ""}
        min={min}
        max={max}
        aria-describedby={describedBy}
        aria-invalid={invalid ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "w-full min-w-0 rounded-md border bg-surface px-3 py-2.5",
          "font-mono text-body-sm text-ink",
          "transition-colors duration-[180ms] ease-out",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
          invalid ? "border-status-closed" : "border-line hover:border-line-strong",
          "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
          "[&::-webkit-calendar-picker-indicator]:opacity-60",
          "[&::-webkit-calendar-picker-indicator]:hover:opacity-100",
          "rtl:[&::-webkit-calendar-picker-indicator]:rotate-180",
        )}
      />
    </div>
  );
}

export default DateInput;
