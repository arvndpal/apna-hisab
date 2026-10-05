import { useLiveQuery } from './useLiveQuery';
import * as udhaarRepo from '../database/repositories/udhaarRepo';
import type { UdhaarEntry } from '../types/models';

/** Oldest-first history with a running balance after each entry — SCREENS.md §13. */
export function useUdhaarEntries(personId: string): Array<UdhaarEntry & { runningBalancePaise: number }> {
  return useLiveQuery(['udhaar_entries'], () => udhaarRepo.listEntriesForPerson(personId), [personId]);
}
