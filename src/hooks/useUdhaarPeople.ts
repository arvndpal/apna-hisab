import { useLiveQuery } from './useLiveQuery';
import * as udhaarRepo from '../database/repositories/udhaarRepo';
import type { UdhaarPersonWithBalance } from '../types/models';

export function useUdhaarPeople(userId: string, search?: string): UdhaarPersonWithBalance[] {
  return useLiveQuery(['udhaar_people', 'udhaar_entries'], () => udhaarRepo.listPeople(userId, search), [userId, search]);
}

export function useUdhaarPerson(personId: string): UdhaarPersonWithBalance | null {
  return useLiveQuery(['udhaar_people', 'udhaar_entries'], () => udhaarRepo.getPerson(personId), [personId]);
}
