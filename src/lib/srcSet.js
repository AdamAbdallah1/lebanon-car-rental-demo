/**
 * Turn a media asset's `srcSet` into an HTML `srcset` attribute string.
 *
 * Repository media records hold srcSet as structured data — `[{ width, url }]`
 * — because that is what the Firestore document stores and what the admin UI
 * renders. The HTML attribute is a plain string.
 *
 * Handing React the array does not throw: React stringifies it, the attribute
 * renders as `srcset="[object Object],[object Object],…"`, the browser rejects
 * it as malformed, and every image silently falls back to its full-size `src`.
 * Since `media()` builds `src` at 1600px, that means downloading 1600px art
 * for a 390px slot — a ~5x bandwidth regression that no runtime error will
 * ever surface. This happened once already in the fleet reel.
 *
 * `Picture` has always done this conversion inline; it now lives here so any
 * component that renders a repository image without `<Picture>` gets identical,
 * correct output.
 */
export function srcSetString(asset) {
  return (asset?.srcSet ?? [])
    .map((entry) => `${entry.url} ${entry.width}w`)
    .join(", ");
}

export default srcSetString;
