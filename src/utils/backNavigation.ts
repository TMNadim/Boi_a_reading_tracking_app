import type { NavTab } from '../types/bookly';

export interface BackButtonSnapshot {
  isScannerOpen: boolean;
  isFinishModalOpen: boolean;
  isBookFormOpen: boolean;
  hasDetailBook: boolean;
  activeTab: NavTab;
  lastExitPressMs: number;
  nowMs: number;
  exitWindowMs?: number;
}

export type BackButtonAction =
  | { type: 'close-scanner' }
  | { type: 'close-finish-modal' }
  | { type: 'close-book-form' }
  | { type: 'close-detail-modal' }
  | { type: 'go-library' }
  | { type: 'prompt-exit'; nextExitPressMs: number }
  | { type: 'exit-app' };

/**
 * Pure state resolver for Android hardware/gesture Back button behavior.
 * Priority: top-most overlay -> root Library tab -> double-tap to exit app.
 */
export function resolveBackButtonAction(snapshot: BackButtonSnapshot): BackButtonAction {
  const windowMs = snapshot.exitWindowMs ?? 2000;

  if (snapshot.isScannerOpen) {
    return { type: 'close-scanner' };
  }
  if (snapshot.isFinishModalOpen) {
    return { type: 'close-finish-modal' };
  }
  if (snapshot.isBookFormOpen) {
    return { type: 'close-book-form' };
  }
  if (snapshot.hasDetailBook) {
    return { type: 'close-detail-modal' };
  }
  if (snapshot.activeTab !== 'library') {
    return { type: 'go-library' };
  }

  if (
    snapshot.lastExitPressMs > 0 &&
    snapshot.nowMs - snapshot.lastExitPressMs <= windowMs
  ) {
    return { type: 'exit-app' };
  }

  return { type: 'prompt-exit', nextExitPressMs: snapshot.nowMs };
}
