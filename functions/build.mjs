import { build } from "esbuild";
import { rm } from "node:fs/promises";

/**
 * Bundle the functions into a single self-contained CommonJS file.
 *
 * The Cloud Function shares the domain logic in `src/lib/` (pricing,
 * availability, booking record) with the browser — that is the whole point of
 * having one pricing service. Firebase only uploads the `functions/` folder at
 * deploy time, so the shared modules must be inlined here rather than
 * `require`d from `../../src`.
 *
 * Firebase's own SDKs stay external: they are provided by the runtime and
 * must not be duplicated into the bundle.
 */
await rm(new URL("./lib", import.meta.url), { recursive: true, force: true });

await build({
  entryPoints: [new URL("./src/index.mjs", import.meta.url).pathname],
  outfile: new URL("./lib/index.js", import.meta.url).pathname,
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  sourcemap: true,
  logLevel: "info",
  external: ["firebase-admin", "firebase-admin/*", "firebase-functions", "firebase-functions/*"],
});
