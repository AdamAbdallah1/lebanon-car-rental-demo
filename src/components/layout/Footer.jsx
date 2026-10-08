import { Link } from "react-router-dom";
import { useLocaleContext } from "../../i18n/context.js";
import { repositories } from "../../lib/repositories/index.js";
import { useAsyncData } from "../../hooks/useAsyncData.js";
import Wordmark from "./Wordmark.jsx";
import Icon from "../ui/Icon.jsx";

function Column({ title, links }) {
  const { t } = useLocaleContext();
  return (
    <div>
      <h2 className="label-micro mb-3 text-ink-faint">{title}</h2>
      <ul className="flex flex-col gap-1">
        {links.map((link) => (
          <li key={link.id}>
            <Link
              to={link.href}
              className="inline-flex min-h-11 items-center text-body-sm text-ink-soft transition-colors duration-[180ms] hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {t(link.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const { t, locale } = useLocaleContext();
  const { data: nav } = useAsyncData(() => repositories.getNavigation(), []);
  const { data: settings } = useAsyncData(() => repositories.getSiteSettings(), []);
  const adapter = repositories.adapter;

  const contact = settings?.contact;

  return (
    <footer className="rule-top mt-auto bg-canvas">
      <div className="container-page py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] lg:gap-10">
          <div className="col-span-2 lg:col-span-1">
            <Wordmark />
            <p className="mt-4 max-w-sm text-body-sm leading-relaxed text-ink-muted">
              {t("footer.legal")}
            </p>
          </div>

          {(nav?.footer ?? []).map((group) => (
            <Column key={group.id} title={t(group.titleKey)} links={group.links} />
          ))}
        </div>

        {contact ? (
          <div className="rule-top mt-10 flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <address className="flex flex-wrap items-center gap-x-5 gap-y-2 not-italic text-body-sm text-ink-soft">
              <a
                href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                className="inline-flex min-h-11 items-center gap-2 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Icon name="phone" size={14} className="text-ink-faint" />
                <span data-keep-mono>{contact.phone}</span>
              </a>
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex min-h-11 items-center gap-2 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Icon name="mail" size={14} className="text-ink-faint" />
                <span dir="ltr">{contact.email}</span>
              </a>
              <span className="inline-flex min-h-9 items-center gap-2 text-ink-muted">
                <Icon name="pin" size={14} className="text-ink-faint" />
                {locale === "ar" ? contact.address.ar : contact.address.en}
              </span>
            </address>

            <a
              href="#top"
              className="inline-flex min-h-11 items-center gap-2 self-start text-body-sm text-ink-soft transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Icon name="arrowUp" size={14} />
              {t("footer.backToTop")}
            </a>
          </div>
        ) : null}

        <div className="rule-top mt-6 flex flex-col gap-2 pt-6 text-caption text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t("footer.builtBy")} · {t("brand.legal")}
          </p>
          <p data-keep-mono className="text-ink-faint">
            {`data: ${adapter ?? "seed"}`}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
