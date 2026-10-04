import { create } from 'zustand';

export interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface ToastState {
  current: (ToastOptions & { id: number }) | null;
  show: (options: ToastOptions) => void;
  hide: () => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (options) => set({ current: { ...options, id: ++nextId } }),
  hide: () => set({ current: null }),
}));

/** Imperative helper — call from anywhere (repos, handlers) without needing the hook. */
export function showToast(options: ToastOptions) {
  useToastStore.getState().show(options);
}
