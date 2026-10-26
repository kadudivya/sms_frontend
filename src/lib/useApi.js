import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Load data on mount (and when deps change).
 * const { data, meta, loading, error, reload } = useApi(() => api.x(id), [id]);
 */
export function useApi(fn, deps = []) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fnRef.current();
      setState({ data: res?.data ?? null, meta: res?.meta ?? null, loading: false, error: null });
    } catch (error) {
      setState({ data: null, meta: null, loading: false, error });
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, deps);
  return { ...state, reload: load };
}

/**
 * Run a mutation with busy/error state.
 * const { run, busy, error } = useAction();
 * await run(() => api.y(), { onSuccess })
 */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = useCallback(async (fn) => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);
  return { run, busy, error, setError };
}
