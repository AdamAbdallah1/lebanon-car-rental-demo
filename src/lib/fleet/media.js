const BASE = "https://images.pexels.com/photos";

/**
 * Build a Pexels delivery URL from a stable photo id.
 *
 * Images are served from the Pexels CDN — free for commercial use, no
 * attribution required. This is the only place a photo URL is constructed, so
 * the seed data, the storefront and the fleet editor all produce identical
 * records.
 *
 * @param {string|number} id
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
 * One media asset record. `ref` is the language-neutral photo id; `alt` is the
 * localized part and is the only field that varies by language.
 *
 * @param {string|number} id
 * @param {{alt?: {en: string, ar?: string}, w?: number, h?: number}} [meta]
 */
export function buildMedia(id, meta = {}) {
  const ref = String(id);
  return {
    id: `pexels-${ref}`,
    provider: "pexels",
    ref,
    src: pexels(ref, { w: 1600 }),
    srcSet: [
      { width: 640, url: pexels(ref, { w: 640 }) },
      { width: 1024, url: pexels(ref, { w: 1024 }) },
      { width: 1600, url: pexels(ref, { w: 1600 }) },
      { width: 2400, url: pexels(ref, { w: 2400 }) },
    ],
    width: meta.w ?? 1600,
    height: meta.h ?? 1067,
    alt: meta.alt ?? { en: "" },
  };
}

/**
 * An ordered list of photos for one vehicle.
 *
 * Alt text is derived from the vehicle's localized name rather than authored
 * twice, which is what the demo fleet has always done — an operator chooses
 * the photos and their order, and the description of each photo follows the
 * car it belongs to.
 *
 * @param {(string|number)[]} refs
 * @param {{en: string, ar?: string}} name
 */
export function buildVehicleMedia(refs, name) {
  const en = name?.en ?? "";
  const ar = name?.ar || en;
  return refs.map((ref, index) =>
    buildMedia(ref, {
      alt: {
        en: `${en} — photograph ${index + 1}`,
        ar: `${ar} — صورة ${index + 1}`,
      },
    }),
  );
}

/** The photo ids a vehicle currently points at, in order. */
export function mediaRefs(media) {
  return (media ?? []).map((asset) => asset?.ref).filter(Boolean);
}
