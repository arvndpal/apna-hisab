import { create } from 'zustand';

interface AddSheetState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

/** Lets the FAB (deep in TabBar) trigger the AddTypeSheet (mounted once in MainTabs). */
export const useAddSheetStore = create<AddSheetState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
