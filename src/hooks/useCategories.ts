import { useLiveQuery } from './useLiveQuery';
import * as categoriesRepo from '../database/repositories/categoriesRepo';
import type { Category, TransactionType } from '../types/models';

export function useCategories(userId: string, type?: TransactionType): Category[] {
  return useLiveQuery(['categories'], () => categoriesRepo.list(userId, type), [userId, type]);
}

/** Most-used-first ordering for the Add/Edit Transaction category picker — see categoriesRepo.listByUsage. */
export function useCategoriesByUsage(userId: string, type: TransactionType): Category[] {
  return useLiveQuery(['categories', 'transactions'], () => categoriesRepo.listByUsage(userId, type), [userId, type]);
}

export function useCategoriesById(userId: string): Record<string, Category> {
  return useLiveQuery(
    ['categories'],
    () => Object.fromEntries(categoriesRepo.list(userId).map((c) => [c.id, c])),
    [userId],
  );
}
