/**
 * The FAB (deep in TabBar) needs to trigger AddTypeSheet (mounted once in MainTabs) without a
 * direct ref — they don't share a parent that could hold one. A Zustand boolean + useEffect used
 * to bridge that gap, but BottomSheetModal.present() proved unreliable when called indirectly
 * from an effect reacting to state rather than directly from the triggering event handler (the
 * same class of bug documented in BottomSheet.tsx). This module-level registration lets the
 * trigger call .present() synchronously, exactly like every other (reliable) sheet in the app.
 */
interface AddSheetController {
  present: () => void;
}

let controller: AddSheetController | null = null;

export function registerAddSheet(next: AddSheetController | null): void {
  controller = next;
}

export function openAddSheet(): void {
  controller?.present();
}
