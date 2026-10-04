import { useLiveQuery } from './useLiveQuery';
import * as transactionsRepo from '../database/repositories/transactionsRepo';
import type { Summary } from '../types/models';

export function useSummary(userId: string, from: string, to: string): Summary {
  return useLiveQuery(['transactions'], () => transactionsRepo.summary({ userId, from, to }), [userId, from, to]);
}
