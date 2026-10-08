/**
 * Class-name joiner. Tiny on purpose — no dependency needed.
 */
export function cn(...parts) {
  const out = [];
  for (const p of parts) {
    if (!p) continue;
    if (typeof p === "string") out.push(p);
    else if (Array.isArray(p)) {
      const nested = cn(...p);
      if (nested) out.push(nested);
    } else if (typeof p === "object") {
      for (const [k, v] of Object.entries(p)) if (v) out.push(k);
    }
  }
  return out.join(" ");
}
