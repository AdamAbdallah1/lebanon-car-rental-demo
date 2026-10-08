import { useLocaleContext, usePick } from "../i18n/context.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { repositories } from "../lib/repositories/index.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import PageHeader from "../components/layout/PageHeader.jsx";
import Icon from "../components/ui/Icon.jsx";

export function ContactPage() {
  const { t, locale } = useLocaleContext();
  const pickLocalized = usePick();

  useDocumentMeta({
    title: "Contact",
    description: "Email, phone and WhatsApp for the Cedars Drive demonstration.",
    path: "/contact",
  });

  const { data: settings } = useAsyncData(() => repositories.getSiteSettings(), []);
  const contact = settings?.contact ?? {};

  const channels = [
    {
      id: "email",
      icon: "mail",
      label: t("contact.channel.email"),
      value: contact.email ?? "hello@cedarsdrive.example",
      href: `mailto:${contact.email ?? "hello@cedarsdrive.example"}`,
      external: false,
    },
    {
      id: "phone",
      icon: "phone",
      label: t("contact.channel.phone"),
      value: contact.phone ?? "+961 1 000 000",
      href: `tel:${(contact.phone ?? "+9611000000").replace(/\s/g, "")}`,
      external: false,
    },
    {
      id: "whatsapp",
      icon: "whatsapp",
      label: t("contact.channel.whatsapp"),
      value: contact.whatsappLabel ?? "+961 71 000 000",
      href: "https://wa.me/96171000000",
      external: true,
    },
  ];

  return (
    <>
      <PageHeader eyebrow={t("nav.contact")} title={t("contact.title")} lede={t("contact.lede")} />

      <section className="block-pad" aria-label={t("contact.title")}>
        <div className="container-page grid grid-cols-1 gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col gap-6">
            <ul className="flex flex-col gap-px overflow-hidden rounded-lg border border-line bg-line">
              {channels.map((channel) => (
                <li key={channel.id}>
                  <a
                    href={channel.href}
                    {...(channel.external ? { target: "_blank", rel: "noreferrer" } : {})}
                    className="group flex items-center gap-4 bg-surface px-5 py-4 transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                  >
                    <span className="inline-flex size-10 items-center justify-center rounded-full border border-accent-line bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                      <Icon name={channel.icon} size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block label-micro text-ink-faint">{channel.label}</span>
                      <span className="block truncate text-body text-ink" data-keep-mono>
                        {channel.value}
                      </span>
                    </span>
                    <Icon
                      name={locale === "ar" ? "arrowLeft" : "arrowRight"}
                      size={16}
                      className="text-ink-faint transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                    />
                    {channel.external ? (
                      <span className="sr-only">{t("a11y.openInNewTab")}</span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>

            <div className="rounded-lg border border-line bg-surface p-6">
              <h2 className="text-title-2 font-medium text-ink">{t("contact.office.title")}</h2>
              <p className="mt-2 text-body-sm text-ink-soft">
                {pickLocalized(contact.address ?? { en: "", ar: "" }, locale)}
              </p>
              <p className="mt-4 font-mono text-caption text-ink-muted" data-keep-mono>
                {contact.hours
                  ? `${contact.hours.open} – ${contact.hours.close} · ${contact.hours.days}`
                  : ""}
              </p>
            </div>
          </div>

          <aside className="flex flex-col gap-4 rounded-lg border border-line bg-surface-sunken p-6">
            <h2 className="text-title-2 font-medium text-ink">{t("contact.response.title")}</h2>
            <p className="text-body-sm leading-relaxed text-ink-soft">
              {t("contact.response.body")}
            </p>
            <ul className="mt-2 flex flex-col gap-3 text-body-sm text-ink">
              <li className="flex items-start gap-3">
                <Icon name="check" size={15} className="mt-1 text-accent" />
                {t("contact.point.request")}
              </li>
              <li className="flex items-start gap-3">
                <Icon name="check" size={15} className="mt-1 text-accent" />
                {t("contact.point.payment")}
              </li>
              <li className="flex items-start gap-3">
                <Icon name="check" size={15} className="mt-1 text-accent" />
                {t("contact.point.demo")}
              </li>
            </ul>

            <p className="mt-4 border-t border-line pt-4 text-caption leading-relaxed text-ink-muted">
              {t("demo.notice")}
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}

export default ContactPage;
