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
          // Merge over the normalised current state so a partial patch such
          // as { locationId } keeps dates, category, sort and trip filters.
          const incoming = { ...readSearchState(current), ...next };

          for (const key of Object.values(SEARCH_KEYS)) merged.delete(key);
          const written = new URLSearchParams(searchQuery(incoming));
          for (const [key, value] of written) merged.set(key, value);
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
