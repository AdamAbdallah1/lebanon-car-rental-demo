import { cn } from "../../lib/cn.js";

/**
 * The one button in the system.
 *
 * Variants map to intent, not to decoration:
 *   primary   — the single action on a surface (accent)
 *   secondary — a real alternative (outlined, near-black)
 *   quiet     — supporting action inside dense content
 *   link      — inline navigation
 */
const VARIANTS = {
  primary:
    "bg-accent text-white border border-accent hover:bg-accent-hover hover:border-accent-hover active:translate-y-px",
  secondary:
    "bg-transparent text-ink border border-ink hover:bg-ink hover:text-canvas active:translate-y-px",
  quiet:
    "bg-surface text-ink border border-line hover:border-ink hover:bg-surface-sunken active:translate-y-px",
  link: "bg-transparent text-ink border border-transparent hover:text-accent underline-offset-4 hover:underline",
  inverse:
    "bg-canvas text-ink border border-canvas hover:bg-white hover:border-white active:translate-y-px",
};

const SIZES = {
  sm: "min-h-11 px-3.5 text-caption gap-1.5",
  md: "min-h-11 px-5 text-body-sm gap-2",
  lg: "min-h-12 px-6 text-body-sm gap-2",
};

export function Button({
  as: Tag = "button",
  variant = "primary",
  size = "md",
  className,
  type,
  children,
  ...rest
}) {
  const isButton = Tag === "button";
  return (
    <Tag
      {...(isButton && !rest.href ? { type: type ?? "button" } : null)}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-mono",
        "transition-[background-color,border-color,color,transform] duration-[180ms] ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:pointer-events-none disabled:opacity-45",
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default Button;
