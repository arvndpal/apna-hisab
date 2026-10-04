import { useEffect, useState, useCallback, type DependencyList } from 'react';
import { onChange, type WatchedTable } from '../database/sqlite/client';

/** Re-runs `queryFn` whenever any of `tables` changes (via the SQLite client's update hook). */
export function useLiveQuery<T>(tables: WatchedTable[], queryFn: () => T, deps: DependencyList = []): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(queryFn, deps);
  const [value, setValue] = useState<T>(run);

  useEffect(() => {
    setValue(run());
    const unsubscribes = tables.map((table) => onChange(table, () => setValue(run())));
    return () => unsubscribes.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, ...tables]);

  return value;
}
