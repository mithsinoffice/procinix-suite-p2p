import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { ensureRelationalMasterRecords, saveRelationalMasterRecords } from '../lib/supabase/masterTables';

export function useIncrementalMasterRecords<T>(
  masterKey: string,
  initialRecords: T[]
): [T[], Dispatch<SetStateAction<T[]>>, boolean, (nextRecords?: T[]) => Promise<boolean>] {
  const [records, setRecords] = useState<T[]>(initialRecords);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const savedRecords = await ensureRelationalMasterRecords(
        masterKey as Parameters<typeof ensureRelationalMasterRecords<T>>[0],
        initialRecords
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
  }, [initialRecords, masterKey]);

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
