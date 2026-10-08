/**
 * Media helper.
 *
 * Images are served from the Pexels CDN (licence: free for commercial use,
 * no attribution required). Every ID used by the demo has been verified to
 * resolve. Admin-side media references live in `mediaAssets`; this helper
 * only builds the delivery URL from a stable photo ID.
 */

const BASE = "https://images.pexels.com/photos";

/**
 * @param {string|number} id Pexels photo id
 * @param {{w?: number, h?: number, fit?: 'crop'|'pad'}} [opts]
 */
export function pexels(id, opts = {}) {
  const params = new URLSearchParams({
    auto: "compress",
    cs: "tinysrgb",
    w: String(opts.w ?? 1280),
  });
  if (opts.h) {
    params.set("h", String(opts.h));
    params.set("fit", opts.fit ?? "cover");
  }
  return `${BASE}/${id}/pexels-photo-${id}.jpeg?${params.toString()}`;
}

/**
 * Build a media asset record.
 * @param {string|number} id
 * @param {{alt: {en: string, ar?: string}, w?: number, h?: number}} meta
 */
export function media(id, meta) {
  const width = meta.w ?? 1600;
  const height = meta.h ?? 1067;
  return {
    id: `pexels-${id}`,
    provider: "pexels",
    ref: String(id),
    src: pexels(id, { w: 1600 }),
    srcSet: [
      { width: 640, url: pexels(id, { w: 640 }) },
      { width: 1024, url: pexels(id, { w: 1024 }) },
      { width: 1600, url: pexels(id, { w: 1600 }) },
      { width: 2400, url: pexels(id, { w: 2400 }) },
    ],
    width,
    height,
    alt: meta.alt,
  };
}
