import { useEffect } from "react";
import { useLocaleContext } from "../i18n/context.js";

const SITE_NAME = "Cedars Drive";

function upsert(selector, create, apply) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  apply(el);
  return el;
}

function metaByName(name) {
  return () => {
    const el = document.createElement("meta");
    el.setAttribute("name", name);
    return el;
  };
}

function metaByProperty(property) {
  return () => {
    const el = document.createElement("meta");
    el.setAttribute("property", property);
    return el;
  };
}

/**
 * Per-route document metadata: title, description, canonical and hreflang
 * alternates. The route path is identical in both languages — only the
 * `?lang` alternate differs, which is what the architecture specifies.
 */
export function useDocumentMeta({ title, description, path }) {
  const { locale } = useLocaleContext();

  useEffect(() => {
    const origin = window.location.origin;
    const full = title ? `${title} · ${SITE_NAME}` : SITE_NAME;

    document.title = full;

    upsert('meta[name="description"]', metaByName("description"), (el) => {
      if (description) el.setAttribute("content", description);
    });

    upsert('meta[property="og:title"]', metaByProperty("og:title"), (el) =>
      el.setAttribute("content", full),
    );
    upsert('meta[property="og:description"]', metaByProperty("og:description"), (el) => {
      if (description) el.setAttribute("content", description);
    });
    upsert('meta[property="og:locale"]', metaByProperty("og:locale"), (el) =>
      el.setAttribute("content", locale === "ar" ? "ar_LB" : "en_US"),
    );

    const canonicalHref = path ? `${origin}${path}` : `${origin}${window.location.pathname}`;
    upsert('link[rel="canonical"]', () => document.createElement("link"), (el) => {
      el.setAttribute("rel", "canonical");
      el.setAttribute("href", canonicalHref);
    });

    const links = [
      ["en", canonicalHref],
      ["ar", `${canonicalHref}${canonicalHref.includes("?") ? "&" : "?"}lang=ar`],
      ["x-default", canonicalHref],
    ];
    for (const [hreflang, href] of links) {
      upsert(
        `link[rel="alternate"][hreflang="${hreflang}"]`,
        () => document.createElement("link"),
        (el) => {
          el.setAttribute("rel", "alternate");
          el.setAttribute("hrefLang", hreflang);
          el.setAttribute("href", href);
        },
      );
    }
  }, [title, description, path, locale]);
}
