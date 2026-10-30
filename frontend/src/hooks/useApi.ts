import { useCallback, useEffect, useState } from "react";

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/** Runs `load` whenever `key` changes, cancelling the previous request. */
export function useApi<T>(load: (signal: AbortSignal) => Promise<T>, key: string) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [attempt, setAttempt] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableLoad = useCallback(load, [key]);

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));
    stableLoad(controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setState((prev) => ({ data: prev.data, error: err.message, loading: false }));
      });
    return () => controller.abort();
  }, [stableLoad, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
