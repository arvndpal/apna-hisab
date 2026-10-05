import type { UdhaarDirection } from '../types/models';

export interface UdhaarEntrySheetParams {
  personId?: string;
  direction?: UdhaarDirection;
  editId?: string;
}

/**
 * Triggers for UdhaarEntrySheet (mounted once in MainTabs) live in arbitrary, unrelated screens
 * (UdhaarListScreen, UdhaarPersonScreen, AddTypeSheet's "Udhaar" row) that don't share a parent
 * that could hold its ref. A Zustand boolean + useEffect used to bridge that gap, but
 * BottomSheetModal.present() proved unreliable when called indirectly from an effect reacting to
 * state rather than directly from the triggering event handler (see BottomSheet.tsx for the same
 * class of bug on the dismiss side). This module-level registration lets every trigger call
 * .present() synchronously, exactly like every other (reliable) sheet in the app.
 */
interface UdhaarEntrySheetController {
  present: (params: UdhaarEntrySheetParams) => void;
}

let controller: UdhaarEntrySheetController | null = null;

export function registerUdhaarEntrySheet(next: UdhaarEntrySheetController | null): void {
  controller = next;
}

export function openUdhaarEntrySheet(params: UdhaarEntrySheetParams = {}): void {
  controller?.present(params);
}
