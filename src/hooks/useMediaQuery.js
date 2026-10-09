import { useCallback, useSyncExternalStore } from "react";

/**
 * Live CSS media-query match.
 *
 * This is read *during render*, not in an effect, deliberately: FleetReel
 * renders a different image tree per breakpoint, and a first paint that
 * defaulted to mobile before flipping would download one whole set of
 * vehicle photographs and then throw them away.
 *
 * `useSyncExternalStore` gives exactly that — a synchronous, correct snapshot
 * on the very first render, plus a re-render whenever the query changes.
 * Without JS (or without `matchMedia`) the snapshot is `false`, so the
 * fallback branch is the mobile stack, which is the one that reads correctly
 * as plain document flow.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return () => {};
      }
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default useMediaQuery;
