import { useLiveQuery } from './useLiveQuery';
import * as transactionsRepo from '../database/repositories/transactionsRepo';
import * as udhaarRepo from '../database/repositories/udhaarRepo';

const SUGGESTION_LIMIT = 20;

/** Notes the user has typed before on transactions — raw material for the Add/Edit note autocomplete. */
export function useTransactionNoteSuggestions(userId: string): string[] {
  return useLiveQuery(['transactions'], () => transactionsRepo.recentNotes(userId, SUGGESTION_LIMIT), [userId]);
}

/** Notes the user has typed before on Udhaar entries — raw material for the Udhaar note autocomplete. */
export function useUdhaarNoteSuggestions(userId: string): string[] {
  return useLiveQuery(['udhaar_entries'], () => udhaarRepo.recentNotes(userId, SUGGESTION_LIMIT), [userId]);
}
