import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  BarChart3,
  BookMarked,
  Clock,
  Flame,
  Moon,
  Plus,
  Quote,
  Sun,
  Target,
} from 'lucide-react';
import type {
  AmbientSoundId,
  Book,
  BooklyState,
  NavTab,
  NoteType,
  Readathon,
  ReadingGoals,
  ReadingSession,
  SessionMood,
} from './types/bookly';
import { createSeedState, loadBooklyState, saveBooklyState } from './data/seedData';
import { ambientAudio } from './utils/ambientAudio';
import { resolveBackButtonAction } from './utils/backNavigation';
import { syncNativeStatusBar } from './utils/nativePermissions';
import {
  calculateDailyProgress,
  calculateStreak,
  formatTimerClock,
  getDateKey,
} from './utils/readingStats';
import { BoiLogo } from './components/BoiLogo';
import { LibraryView } from './components/LibraryView';
import { TimerView } from './components/TimerView';
import { QuotesNotebookView } from './components/QuotesNotebookView';
import { GoalsView } from './components/GoalsView';
import { StatsView } from './components/StatsView';
import { BookFormModal } from './components/BookFormModal';
import { BookDetailModal } from './components/BookDetailModal';
import { FinishSessionModal } from './components/FinishSessionModal';

const NAV_ITEMS: { id: NavTab; label: string; icon: typeof BookMarked }[] = [
  { id: 'library', label: 'Library', icon: BookMarked },
  { id: 'timer', label: 'Timer', icon: Clock },
  { id: 'quotes', label: 'Quotes', icon: Quote },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
];

const PAGE_TITLES: Record<NavTab, string> = {
  library: 'Library',
  timer: 'Reading Timer',
  quotes: 'Quotes & Notebook',
  goals: 'Goals & Streaks',
  stats: 'Reading Analytics',
};

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function App() {
  const [state, setState] = useState<BooklyState>(() => loadBooklyState());
  const [activeTab, setActiveTab] = useState<NavTab>('library');

  // Reading Timer persistent state across tabs
  const [activeBookId, setActiveBookId] = useState<string>(() => {
    const initial = loadBooklyState();
    return (
      initial.books.find((b) => b.shelf === 'reading')?.id ??
      initial.books[0]?.id ??
      ''
    );
  });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Ambient Soundscape state
  const [activeSound, setActiveSound] = useState<AmbientSoundId | null>(null);
  const [soundVolume, setSoundVolume] = useState(0.45);

  // Modals & notifications
  const [isBookFormOpen, setIsBookFormOpen] = useState(false);
  const [openScannerOnMount, setOpenScannerOnMount] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerCloseSignal, setScannerCloseSignal] = useState(0);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [detailBookId, setDetailBookId] = useState<string | null>(null);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [sessionToast, setSessionToast] = useState<string | null>(null);

  const lastBackPressRef = useRef<number>(0);
  const navStateRef = useRef({
    activeTab,
    isScannerOpen,
    isBookFormOpen,
    hasDetailBook: false,
    isFinishModalOpen,
  });

  useEffect(() => {
    navStateRef.current = {
      activeTab,
      isScannerOpen,
      isBookFormOpen,
      hasDetailBook: Boolean(detailBookId),
      isFinishModalOpen,
    };
  }, [activeTab, isScannerOpen, isBookFormOpen, detailBookId, isFinishModalOpen]);

  const showToast = useCallback((msg: string) => {
    setSessionToast(msg);
    window.setTimeout(() => {
      setSessionToast((curr) => (curr === msg ? null : curr));
    }, 4500);
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    saveBooklyState(state);
  }, [state]);

  // Sync dark mode class on <html> and native Android/iOS status bar
  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    void syncNativeStatusBar(state.theme);
  }, [state.theme]);

  // Handle Android hardware / gesture Back button cleanly
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    let removeListener: (() => Promise<void>) | null = null;

    void CapApp.addListener('backButton', () => {
      const nowMs = Date.now();
      const action = resolveBackButtonAction({
        ...navStateRef.current,
        lastExitPressMs: lastBackPressRef.current,
        nowMs,
      });

      switch (action.type) {
        case 'close-scanner':
          setScannerCloseSignal((n) => n + 1);
          break;
        case 'close-finish-modal':
          setIsFinishModalOpen(false);
          break;
        case 'close-book-form':
          setIsBookFormOpen(false);
          setOpenScannerOnMount(false);
          setEditingBook(null);
          break;
        case 'close-detail-modal':
          setDetailBookId(null);
          break;
        case 'go-library':
          setActiveTab('library');
          break;
        case 'prompt-exit':
          lastBackPressRef.current = action.nextExitPressMs;
          showToast('Press back again to exit Boi');
          break;
        case 'exit-app':
          void CapApp.exitApp();
          break;
      }
    }).then((handle) => {
      if (cancelled) {
        void handle.remove();
      } else {
        removeListener = () => handle.remove();
      }
    });

    return () => {
      cancelled = true;
      if (removeListener) {
        void removeListener();
      }
    };
  }, [showToast]);

  // Live stopwatch interval
  useEffect(() => {
    if (!isTimerRunning) return;
    const id = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isTimerRunning]);

  // Stop ambient audio on unmount
  useEffect(() => {
    return () => {
      ambientAudio.stop();
    };
  }, []);

  const todayKey = getDateKey();
  const dailyProgress = useMemo(
    () => calculateDailyProgress(state.sessions, state.goals, todayKey),
    [state.sessions, state.goals, todayKey]
  );
  const streak = useMemo(
    () => calculateStreak(state.sessions, todayKey),
    [state.sessions, todayKey]
  );

  const activeBook = useMemo(
    () => state.books.find((b) => b.id === activeBookId) ?? state.books[0] ?? null,
    [state.books, activeBookId]
  );
  const detailBook = useMemo(
    () => (detailBookId ? state.books.find((b) => b.id === detailBookId) ?? null : null),
    [state.books, detailBookId]
  );


  const handleSelectSound = (sound: AmbientSoundId | null) => {
    setActiveSound(sound);
    if (sound) {
      ambientAudio.setVolume(soundVolume);
      ambientAudio.play(sound);
    } else {
      ambientAudio.stop();
    }
  };

  const handleChangeVolume = (vol: number) => {
    setSoundVolume(vol);
    ambientAudio.setVolume(vol);
  };

  const handleStartReadingBook = (bookId: string) => {
    setActiveBookId(bookId);
    setActiveTab('timer');
  };

  const handleSaveBook = (bookData: Omit<Book, 'id' | 'addedAt'> & { id?: string }) => {
    if (bookData.id) {
      setState((prev) => ({
        ...prev,
        books: prev.books.map((b) =>
          b.id === bookData.id ? { ...b, ...bookData, id: b.id, addedAt: b.addedAt } : b
        ),
      }));
      showToast(`Updated "${bookData.title}".`);
    } else {
      const newBook: Book = {
        ...bookData,
        id: makeId('book'),
        addedAt: getDateKey(),
      };
      setState((prev) => ({
        ...prev,
        books: [newBook, ...prev.books],
      }));
      if (!activeBookId) setActiveBookId(newBook.id);
      showToast(`Added "${newBook.title}" to your library.`);
    }
  };

  const handleUpdateBook = (bookId: string, patch: Partial<Book>) => {
    setState((prev) => ({
      ...prev,
      books: prev.books.map((b) => (b.id === bookId ? { ...b, ...patch } : b)),
    }));
  };

  const handleDeleteBook = (bookId: string) => {
    setState((prev) => ({
      ...prev,
      books: prev.books.filter((b) => b.id !== bookId),
    }));
    if (activeBookId === bookId) {
      const remaining = state.books.filter((b) => b.id !== bookId);
      setActiveBookId(remaining[0]?.id ?? '');
    }
  };

  const handleCreateCollection = (name: string) => {
    const newCol = { id: makeId('col'), name };
    setState((prev) => ({
      ...prev,
      collections: [...prev.collections, newCol],
    }));
  };

  const recordSession = (payload: {
    bookId: string;
    endPage: number;
    durationSeconds: number;
    mood?: SessionMood;
    note?: string;
    markFinished?: boolean;
  }) => {
    const targetBook = state.books.find((b) => b.id === payload.bookId);
    if (!targetBook) return;

    const pagesRead = Math.max(0, payload.endPage - targetBook.currentPage);
    const today = getDateKey();
    const newSession: ReadingSession = {
      id: makeId('sess'),
      bookId: targetBook.id,
      date: today,
      startedAt: new Date().toISOString(),
      durationSeconds: payload.durationSeconds,
      startPage: targetBook.currentPage,
      endPage: payload.endPage,
      pagesRead,
      mood: payload.mood,
      note: payload.note,
    };

    const finished = payload.markFinished || payload.endPage >= targetBook.totalPages;

    setState((prev) => ({
      ...prev,
      sessions: [newSession, ...prev.sessions],
      books: prev.books.map((b) =>
        b.id === targetBook.id
          ? {
              ...b,
              currentPage: payload.endPage,
              shelf: finished ? 'finished' : b.shelf === 'want' ? 'reading' : b.shelf,
              startedAt: b.startedAt ?? today,
              finishedAt: finished ? today : b.finishedAt,
            }
          : b
      ),
    }));

    showToast(
      finished
        ? `Finished "${targetBook.title}"! Logged +${pagesRead} pages.`
        : `Session saved: +${pagesRead} pages in "${targetBook.title}".`
    );
  };

  const handleConfirmFinishSession = (payload: {
    endPage: number;
    durationSeconds: number;
    mood?: SessionMood;
    note?: string;
    markFinished: boolean;
  }) => {
    if (!activeBook) return;
    recordSession({
      bookId: activeBook.id,
      ...payload,
    });
    setIsTimerRunning(false);
    setElapsedSeconds(0);
    setIsFinishModalOpen(false);
  };

  const handleLogManualSession = (payload: {
    bookId: string;
    minutes: number;
    endPage: number;
    mood?: SessionMood;
    note?: string;
  }) => {
    recordSession({
      bookId: payload.bookId,
      endPage: payload.endPage,
      durationSeconds: payload.minutes * 60,
      mood: payload.mood,
      note: payload.note,
    });
  };

  const handleAddNote = (payload: {
    bookId: string;
    type: NoteType;
    content: string;
    term?: string;
    page?: number;
  }) => {
    setState((prev) => ({
      ...prev,
      notes: [
        {
          id: makeId('note'),
          bookId: payload.bookId,
          type: payload.type,
          content: payload.content,
          term: payload.term,
          page: payload.page,
          createdAt: new Date().toISOString(),
        },
        ...prev.notes,
      ],
    }));
  };

  const handleDeleteNote = (noteId: string) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== noteId),
    }));
  };

  const handleDeleteSession = (sessionId: string) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== sessionId),
    }));
  };

  const handleUpdateGoals = (nextGoals: ReadingGoals) => {
    setState((prev) => ({ ...prev, goals: nextGoals }));
    showToast('Reading goals updated.');
  };

  const handleAddReadathon = (readathon: Omit<Readathon, 'id'>) => {
    setState((prev) => ({
      ...prev,
      readathons: [{ ...readathon, id: makeId('readathon') }, ...prev.readathons],
    }));
    showToast(`Readathon "${readathon.name}" created.`);
  };

  const handleDeleteReadathon = (id: string) => {
    setState((prev) => ({
      ...prev,
      readathons: prev.readathons.filter((r) => r.id !== id),
    }));
  };

  const toggleTheme = () => {
    setState((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#121826] dark:bg-[#0B1120] dark:text-[#F1F5F9]">
      {/* Desktop Left Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[#E4E7EC] bg-white lg:flex dark:border-slate-800 dark:bg-[#101827]">
        {/* Brand */}
        <div className="flex h-16 items-center justify-between border-b border-[#E4E7EC] px-6 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className="flex items-center gap-2.5 font-editorial text-2xl font-bold tracking-tight text-[#121826] dark:text-white"
          >
            <BoiLogo className="h-8 w-8 shrink-0" />
            <span>Boi</span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${state.theme === 'dark' ? 'light' : 'dark'} theme`}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#5A6577] transition-colors hover:bg-slate-100 hover:text-[#121826] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            {state.theme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Main navigation" className="flex-1 space-y-1 p-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[44px] w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#EEF4FF] text-[#1D63ED] dark:bg-[#1D63ED]/20 dark:text-[#60A5FA]'
                    : 'text-[#5A6577] hover:bg-slate-100 hover:text-[#121826] dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                }`}
              >
                <span className="flex items-center gap-3 whitespace-nowrap">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
                {item.id === 'timer' && (isTimerRunning || elapsedSeconds > 0) && (
                  <span className="font-mono text-xs font-semibold tabular-nums">
                    {formatTimerClock(elapsedSeconds)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Daily Progress & Streak Footer */}
        <div className="border-t border-[#E4E7EC] p-4 dark:border-slate-800">
          <div className="rounded-xl bg-[#F7F8FA] p-3.5 dark:bg-[#0B1120]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#121826] dark:text-slate-200">
                Daily Goal
              </span>
              <span className="font-mono tabular-nums text-[#5A6577] dark:text-slate-400">
                {dailyProgress.minutesToday}/{dailyProgress.targetMinutes}m
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${dailyProgress.goalMet ? 'bg-emerald-600' : 'bg-[#1D63ED]'}`}
                style={{ width: `${dailyProgress.percent}%` }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs text-[#5A6577] dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                <span className="font-mono tabular-nums">{streak.currentStreak}d streak</span>
              </span>
              <span className="font-mono tabular-nums">{dailyProgress.percent}%</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex min-h-screen flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-64">
        {/* Compact Single-Row Top Header with safe-area notch clearance */}
        <header className="sticky top-0 z-20 border-b border-[#E4E7EC] bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur-md dark:border-slate-800 dark:bg-[#101827]/95">
          <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-8 lg:h-16">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className="flex items-center gap-2 font-editorial text-xl font-bold tracking-tight text-[#121826] lg:hidden dark:text-white"
              >
                <BoiLogo className="h-7 w-7 shrink-0" />
                <span>Boi</span>
              </button>
              <h1 className="hidden truncate text-xl font-semibold text-[#121826] lg:block dark:text-slate-100">
                {PAGE_TITLES[activeTab]}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              {(isTimerRunning || elapsedSeconds > 0) && activeTab !== 'timer' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('timer')}
                  className="inline-flex min-h-[38px] items-center gap-2 whitespace-nowrap rounded-xl border border-[#1D63ED]/30 bg-[#EEF4FF] px-3 py-1.5 font-mono text-xs font-semibold tabular-nums text-[#1D63ED] dark:bg-[#1D63ED]/20 dark:text-[#60A5FA]"
                >
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{formatTimerClock(elapsedSeconds)}</span>
                </button>
              )}

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Switch to ${state.theme === 'dark' ? 'light' : 'dark'} theme`}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#5A6577] hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
              >
                {state.theme === 'dark' ? (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingBook(null);
                  setOpenScannerOnMount(false);
                  setIsBookFormOpen(true);
                }}
                className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#1D63ED] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1550C8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D63ED]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Add Book</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Workspace Viewport */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {/* Mobile Section Title */}
          <h1 className="mb-5 text-2xl font-semibold text-[#121826] lg:hidden dark:text-slate-100">
            {PAGE_TITLES[activeTab]}
          </h1>

          {sessionToast && (
            <div
              role="status"
              className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <span>{sessionToast}</span>
              <button
                type="button"
                onClick={() => setSessionToast(null)}
                className="ml-4 text-xs underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {activeTab === 'library' && (
            <LibraryView
              books={state.books}
              sessions={state.sessions}
              collections={state.collections}
              goals={state.goals}
              onStartReading={handleStartReadingBook}
              onSelectBook={(book) => setDetailBookId(book.id)}
              onOpenAddBook={() => {
                setEditingBook(null);
                setOpenScannerOnMount(false);
                setIsBookFormOpen(true);
              }}
              onOpenScanIsbn={() => {
                setEditingBook(null);
                setOpenScannerOnMount(true);
                setIsBookFormOpen(true);
              }}
              onCreateCollection={handleCreateCollection}
            />
          )}

          {activeTab === 'timer' && (
            <TimerView
              books={state.books}
              sessions={state.sessions}
              activeBookId={activeBook?.id ?? ''}
              elapsedSeconds={elapsedSeconds}
              isRunning={isTimerRunning}
              activeSound={activeSound}
              soundVolume={soundVolume}
              onSelectBook={(id) => {
                setActiveBookId(id);
                setIsTimerRunning(false);
                setElapsedSeconds(0);
              }}
              onToggleRun={() => setIsTimerRunning((r) => !r)}
              onResetTimer={() => {
                setIsTimerRunning(false);
                setElapsedSeconds(0);
              }}
              onOpenFinishModal={() => {
                setIsTimerRunning(false);
                setIsFinishModalOpen(true);
              }}
              onLogManualSession={handleLogManualSession}
              onSelectSound={handleSelectSound}
              onChangeVolume={handleChangeVolume}
              onAddNote={handleAddNote}
              onOpenAddBook={() => {
                setEditingBook(null);
                setIsBookFormOpen(true);
              }}
            />
          )}

          {activeTab === 'quotes' && (
            <QuotesNotebookView
              books={state.books}
              notes={state.notes}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
            />
          )}

          {activeTab === 'goals' && (
            <GoalsView
              books={state.books}
              sessions={state.sessions}
              notes={state.notes}
              goals={state.goals}
              readathons={state.readathons}
              onUpdateGoals={handleUpdateGoals}
              onAddReadathon={handleAddReadathon}
              onDeleteReadathon={handleDeleteReadathon}
            />
          )}

          {activeTab === 'stats' && (
            <StatsView
              state={state}
              onDeleteSession={handleDeleteSession}
              onImportState={(imported) => setState(imported)}
              onResetDemoData={() => setState(createSeedState())}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar with safe-area gesture bar clearance */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E4E7EC] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden dark:border-slate-800 dark:bg-[#101827]/95"
      >
        <div className="grid h-14 grid-cols-5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                  active
                    ? 'text-[#1D63ED] dark:text-[#60A5FA]'
                    : 'text-[#5A6577] dark:text-slate-400'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      <BookFormModal
        isOpen={isBookFormOpen}
        initialBook={editingBook}
        openScannerOnMount={openScannerOnMount}
        scannerCloseSignal={scannerCloseSignal}
        onScannerOpenChange={setIsScannerOpen}
        collections={state.collections}
        onClose={() => {
          setIsBookFormOpen(false);
          setOpenScannerOnMount(false);
          setEditingBook(null);
        }}
        onSave={handleSaveBook}
      />

      <BookDetailModal
        book={detailBook}
        sessions={state.sessions}
        notes={state.notes}
        collections={state.collections}
        onClose={() => setDetailBookId(null)}
        onStartReading={handleStartReadingBook}
        onEdit={(book) => {
          setDetailBookId(null);
          setEditingBook(book);
          setIsBookFormOpen(true);
        }}
        onDelete={handleDeleteBook}
        onUpdateBook={handleUpdateBook}
      />

      <FinishSessionModal
        isOpen={isFinishModalOpen}
        book={activeBook}
        elapsedSeconds={elapsedSeconds}
        onClose={() => setIsFinishModalOpen(false)}
        onConfirm={handleConfirmFinishSession}
      />
    </div>
  );
}
