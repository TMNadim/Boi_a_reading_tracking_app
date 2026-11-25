import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBackButtonAction } from './backNavigation';

test('resolveBackButtonAction closes top-most modal/overlay first in priority order', () => {
  assert.deepEqual(
    resolveBackButtonAction({
      isScannerOpen: true,
      isFinishModalOpen: true,
      isBookFormOpen: true,
      hasDetailBook: true,
      activeTab: 'stats',
      lastExitPressMs: 0,
      nowMs: 1000,
    }),
    { type: 'close-scanner' }
  );

  assert.deepEqual(
    resolveBackButtonAction({
      isScannerOpen: false,
      isFinishModalOpen: true,
      isBookFormOpen: false,
      hasDetailBook: false,
      activeTab: 'timer',
      lastExitPressMs: 0,
      nowMs: 1000,
    }),
    { type: 'close-finish-modal' }
  );

  assert.deepEqual(
    resolveBackButtonAction({
      isScannerOpen: false,
      isFinishModalOpen: false,
      isBookFormOpen: true,
      hasDetailBook: false,
      activeTab: 'library',
      lastExitPressMs: 0,
      nowMs: 1000,
    }),
    { type: 'close-book-form' }
  );

  assert.deepEqual(
    resolveBackButtonAction({
      isScannerOpen: false,
      isFinishModalOpen: false,
      isBookFormOpen: false,
      hasDetailBook: true,
      activeTab: 'library',
      lastExitPressMs: 0,
      nowMs: 1000,
    }),
    { type: 'close-detail-modal' }
  );
});

test('resolveBackButtonAction navigates from secondary tabs back to Library', () => {
  assert.deepEqual(
    resolveBackButtonAction({
      isScannerOpen: false,
      isFinishModalOpen: false,
      isBookFormOpen: false,
      hasDetailBook: false,
      activeTab: 'stats',
      lastExitPressMs: 0,
      nowMs: 1000,
    }),
    { type: 'go-library' }
  );
});

test('resolveBackButtonAction prompts on first root back press and exits on second press within window', () => {
  const first = resolveBackButtonAction({
    isScannerOpen: false,
    isFinishModalOpen: false,
    isBookFormOpen: false,
    hasDetailBook: false,
    activeTab: 'library',
    lastExitPressMs: 0,
    nowMs: 5000,
  });
  assert.deepEqual(first, { type: 'prompt-exit', nextExitPressMs: 5000 });

  const secondWithinWindow = resolveBackButtonAction({
    isScannerOpen: false,
    isFinishModalOpen: false,
    isBookFormOpen: false,
    hasDetailBook: false,
    activeTab: 'library',
    lastExitPressMs: 5000,
    nowMs: 6500,
  });
  assert.deepEqual(secondWithinWindow, { type: 'exit-app' });

  const secondAfterWindow = resolveBackButtonAction({
    isScannerOpen: false,
    isFinishModalOpen: false,
    isBookFormOpen: false,
    hasDetailBook: false,
    activeTab: 'library',
    lastExitPressMs: 5000,
    nowMs: 8000,
  });
  assert.deepEqual(secondAfterWindow, { type: 'prompt-exit', nextExitPressMs: 8000 });
});
