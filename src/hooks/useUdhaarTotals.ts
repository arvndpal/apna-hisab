import { useLiveQuery } from './useLiveQuery';
import * as udhaarRepo from '../database/repositories/udhaarRepo';

export function useUdhaarTotals(userId: string): { receivePaise: number; payPaise: number } {
  return useLiveQuery(['udhaar_people', 'udhaar_entries'], () => udhaarRepo.totals(userId), [userId]);
}
