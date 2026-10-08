import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { SEARCH_KEYS, readSearchState, searchQuery } from "./searchState.js";

/**
 * The single source of rental search state, mirrored in the URL.
 * `lang` and any other unrelated params are preserved on every write.
 */
export function useSearchState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => readSearchState(searchParams), [searchParams]);

  const setState = useCallback(
    (next, options = {}) => {
      setSearchParams(
        (current) => {
          const merged = new URLSearchParams(current);
          const incoming = readSearchState(
            new URLSearchParams(searchQuery({ ...readSearchState(current), ...next })),
          );

          for (const key of Object.values(SEARCH_KEYS)) merged.delete(key);
          if (incoming.locationId) merged.set(SEARCH_KEYS.loc, incoming.locationId);
          if (incoming.pickupDate) merged.set(SEARCH_KEYS.from, incoming.pickupDate);
          if (incoming.returnDate) merged.set(SEARCH_KEYS.to, incoming.returnDate);
          if (incoming.category && incoming.category !== "all") {
            merged.set(SEARCH_KEYS.cat, incoming.category);
          }
          if (incoming.sort && incoming.sort !== "sortOrder") {
            merged.set(SEARCH_KEYS.sort, incoming.sort);
          }
          return merged;
        },
        { replace: options.replace ?? true },
      );
    },
    [setSearchParams],
  );

  const clear = useCallback(() => {
    setSearchParams(
      (current) => {
        const merged = new URLSearchParams(current);
        for (const key of Object.values(SEARCH_KEYS)) merged.delete(key);
        return merged;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  return { state, setState, clear, searchParams };
}
