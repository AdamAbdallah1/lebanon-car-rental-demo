import { cn } from "../../lib/cn.js";

/**
 * Availability / status mark.
 * Uses the semantic status tokens, never the brand accent — status is data,
 * not decoration. Always paired with a text label for accessibility.
 */
const TONES = {
  available: {
    dot: "bg-status-open",
    text: "text-status-open",
    bg: "bg-status-open-soft",
    border: "border-status-open/25",
  },
  limited: {
    dot: "bg-status-limited",
    text: "text-status-limited",
    bg: "bg-status-limited-soft",
    border: "border-status-limited/25",
  },
  unavailable: {
    dot: "bg-status-closed",
    text: "text-status-closed",
    bg: "bg-status-closed-soft",
    border: "border-status-closed/25",
  },
  pending: {
    dot: "bg-status-limited",
    text: "text-status-limited",
    bg: "bg-status-limited-soft",
    border: "border-status-limited/25",
  },
};

export function StatusMark({ tone = "available", label, className, size = "md" }) {
  const t = TONES[tone] ?? TONES.available;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1",
        t.bg,
        t.text,
        t.border,
        size === "sm" && "px-2 py-0.5",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", t.dot)} aria-hidden="true" />
      <span className={cn("label-micro", size === "sm" && "text-[0.625rem]")}>{label}</span>
    </span>
  );
}

export default StatusMark;
