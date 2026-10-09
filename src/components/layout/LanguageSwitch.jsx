import { cn } from "../../lib/cn.js";
import { useLocaleContext } from "../../i18n/context.js";
import Icon from "../ui/Icon.jsx";

/**
 * EN ⇄ العربية switch.
 *
 * Extracted from the public header so the admin shell can offer the same
 * control — the operations surface is bilingual too, RTL included. The label
 * always names the language you would switch *to*, never the current one.
 */
export function LanguageSwitch({ className }) {
  const { locale, setLocale, t } = useLocaleContext();
  const next = locale === "en" ? "ar" : "en";

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={next === "ar" ? t("lang.switchTo") : t("lang.switchToEn")}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-md border border-line px-3",
        "font-mono text-caption text-ink-soft transition-colors duration-[180ms]",
        "hover:border-ink hover:text-ink",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
      data-keep-mono
    >
      <Icon name="globe" size={14} className="text-ink-faint" />
      <span>{next === "ar" ? "العربية" : "EN"}</span>
    </button>
  );
}

export default LanguageSwitch;
