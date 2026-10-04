import { useLiveQuery } from './useLiveQuery';
import * as transactionsRepo from '../database/repositories/transactionsRepo';
import type { Transaction } from '../types/models';

export function useRecentTransactions(userId: string, limit: number): Transaction[] {
  return useLiveQuery(['transactions'], () => transactionsRepo.recentForUser(userId, limit), [userId, limit]);
}
