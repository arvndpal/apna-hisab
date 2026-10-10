import { useLiveQuery } from './useLiveQuery';
import * as notesRepo from '../database/repositories/notesRepo';
import type { Note } from '../types/models';

export function useNotes(userId: string): Note[] {
  return useLiveQuery(['notes'], () => notesRepo.list(userId), [userId]);
}
