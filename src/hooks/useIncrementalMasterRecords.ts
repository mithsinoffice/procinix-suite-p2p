import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import {
  ensureRelationalMasterRecords,
  getCachedRelationalMasterRecords,
  saveRelationalMasterRecords,
} from '../lib/mysql/masterTables';

export function useIncrementalMasterRecords<T>(
  masterKey: string,
  initialRecords: T[]
): [T[], Dispatch<SetStateAction<T[]>>, boolean, (nextRecords?: T[]) => Promise<boolean>] {
  const seedRecordsRef = useRef(initialRecords);
  const [records, setRecords] = useState<T[]>(() =>
    getCachedRelationalMasterRecords(
      masterKey as Parameters<typeof getCachedRelationalMasterRecords<T>>[0],
      seedRecordsRef.current
    )
  );
  const [isHydrating, setIsHydrating] = useState(true);
  /** Callers often pass an inline array literal; useRef keeps the first seed stable so hydrate does not re-run every render. */

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const savedRecords = await ensureRelationalMasterRecords(
        masterKey as Parameters<typeof ensureRelationalMasterRecords<T>>[0],
        seedRecordsRef.current
      );
      if (!isMounted) {
        return;
      }

      setRecords(savedRecords);
      setIsHydrating(false);
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [masterKey]);

  useEffect(() => {
    const handleInvalidated = (event: Event) => {
      const detail = (event as CustomEvent<{ masterKey?: string }>).detail;
      if (detail?.masterKey !== masterKey) return;

      void ensureRelationalMasterRecords(
        masterKey as Parameters<typeof ensureRelationalMasterRecords<T>>[0],
        seedRecordsRef.current
      ).then((nextRecords) => {
        setRecords(nextRecords);
      });
    };

    window.addEventListener('master-invalidated', handleInvalidated as EventListener);
    return () => {
      window.removeEventListener('master-invalidated', handleInvalidated as EventListener);
    };
  }, [masterKey]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    void saveRelationalMasterRecords(
      masterKey as Parameters<typeof saveRelationalMasterRecords<T>>[0],
      records
    );
  }, [records, isHydrating, masterKey]);

  const persistNow = async (nextRecords?: T[]) => {
    if (isHydrating) {
      return false;
    }

    return saveRelationalMasterRecords(
      masterKey as Parameters<typeof saveRelationalMasterRecords<T>>[0],
      nextRecords ?? records
    );
  };

  return [records, setRecords, isHydrating, persistNow];
}
