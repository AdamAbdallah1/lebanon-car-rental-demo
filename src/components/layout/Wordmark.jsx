import { Link } from "react-router-dom";
import { cn } from "../../lib/cn.js";
import { useLocaleContext } from "../../i18n/context.js";

/**
 * Wordmark. Typography-only — no invented symbol, mascot or emblem.
 * The accent rule under the "C" is the one structural use of the accent
 * in the identity, and it stays the same size at every breakpoint.
 */
export function Wordmark({ className, onClick }) {
  const { locale } = useLocaleContext();
  const text =
    locale === "ar" ? (
      <span data-display-font className="font-sans text-[1.05rem] font-semibold tracking-tight">
        سيدرز درايف
      </span>
    ) : (
      <span className="font-sans text-[1.05rem] font-medium tracking-[-0.02em]">
        Cedars Drive
      </span>
    );

  return (
    <Link
      to="/"
      onClick={onClick}
      aria-label="Cedars Drive — home"
      className={cn(
        "group inline-flex min-h-11 items-center rounded-xs",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
    >
      <span className="inline-flex items-baseline gap-1.5">
        {text}
        <span
          aria-hidden="true"
          className="mb-0.5 h-[3px] w-5 bg-accent transition-all duration-[280ms] ease-out group-hover:w-7"
        />
      </span>
    </Link>
  );
}

export default Wordmark;
