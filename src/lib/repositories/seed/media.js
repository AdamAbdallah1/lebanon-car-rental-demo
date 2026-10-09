/**
 * Demo media helper.
 *
 * The asset shape and the Pexels URL builder live in `src/lib/fleet/media.js`
 * now, so the seed, the storefront and the fleet editor cannot produce two
 * different records for the same photo. This file only keeps the seed's
 * two-line call sites working.
 */
export { buildMedia as media, pexels } from "../../fleet/media.js";
