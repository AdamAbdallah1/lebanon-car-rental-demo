import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Async repository read with explicit loading / error / retry states.
 *
 * The loader is a repository call — components never touch data sources
 * directly. `keepPrevious` avoids a flash of empty content when filters change.
 */
export function useAsyncData(loader, deps = [], options = {}) {
  const { keepPrevious = false, enabled = true } = options;
  const [state, setState] = useState({ data: undefined, loading: enabled, error: null });
  const [nonce, setNonce] = useState(0);
  const previousRef = useRef(undefined);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    setState((prev) => {
      const base = keepPrevious && prev.data !== undefined ? prev.data : undefined;
      if (prev.loading && prev.data === base) return prev;
      return { data: base, loading: true, error: null };
    });

    Promise.resolve()
      .then(() => loaderRef.current())
      .then((data) => {
        if (cancelled) return;
        previousRef.current = data;
        setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        setState((prev) => ({
          data: keepPrevious ? prev.data : undefined,
          loading: false,
          error: error ?? new Error("Unknown error"),
        }));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, enabled, keepPrevious]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    reload,
    isEmpty: !state.loading && !state.error && Array.isArray(state.data) && state.data.length === 0,
  };
}
