import { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { AmbientSoundId, Book, NoteType, ReadingSession, SessionMood } from '../types/bookly';
import { AMBIENT_SOUNDS } from '../utils/ambientAudio';
import { BookCover } from './BookCover';
import {
  calculateBookProgress,
  calculateBookStats,
  estimateTimeToFinishMinutes,
  formatMinutesReadable,
  formatTimerClock,
} from '../utils/readingStats';

interface TimerViewProps {
  books: Book[];
  sessions: ReadingSession[];
  activeBookId: string;
  elapsedSeconds: number;
  isRunning: boolean;
  activeSound: AmbientSoundId | null;
  soundVolume: number;
  onSelectBook: (bookId: string) => void;
  onToggleRun: () => void;
  onResetTimer: () => void;
  onOpenFinishModal: () => void;
  onLogManualSession: (payload: {
    bookId: string;
    minutes: number;
    endPage: number;
    mood?: SessionMood;
    note?: string;
  }) => void;
  onSelectSound: (sound: AmbientSoundId | null) => void;
  onChangeVolume: (vol: number) => void;
  onAddNote: (payload: {
    bookId: string;
    type: NoteType;
    content: string;
    term?: string;
    page?: number;
  }) => void;
  onOpenAddBook: () => void;
}

export function TimerView({
  books,
  sessions,
  activeBookId,
  elapsedSeconds,
  isRunning,
  activeSound,
  soundVolume,
  onSelectBook,
  onToggleRun,
  onResetTimer,
  onOpenFinishModal,
  onLogManualSession,
  onSelectSound,
  onChangeVolume,
  onAddNote,
  onOpenAddBook,
}: TimerViewProps) {
  const [mode, setMode] = useState<'timer' | 'manual'>('timer');

  // Quick capture state
  const [noteType, setNoteType] = useState<NoteType>('quote');
  const [noteContent, setNoteContent] = useState('');
  const [vocabTerm, setVocabTerm] = useState('');
  const [notePage, setNotePage] = useState('');
  const [noteFeedback, setNoteFeedback] = useState('');
  const [noteError, setNoteError] = useState('');

  // Manual log state
  const [manualMinutes, setManualMinutes] = useState('25');
  const [manualEndPage, setManualEndPage] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualError, setManualError] = useState('');
  const [manualSuccess, setManualSuccess] = useState('');

  const activeBook = books.find((b) => b.id === activeBookId) ?? books[0] ?? null;

  if (!activeBook) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D5DBE5] bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-[#131B2E]">
        <h2 className="text-xl font-semibold text-[#121826] dark:text-slate-100">
          Add a book to start your reading timer
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#5A6577] dark:text-slate-400">
          Choose a book to track session duration, calculate pages per hour, and save quotes as you read.
        </p>
        <button
          type="button"
          onClick={onOpenAddBook}
          className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#1D63ED] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1550C8]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add First Book</span>
        </button>
      </div>
    );
  }

  const progress = calculateBookProgress(activeBook);
  const stats = calculateBookStats(activeBook.id, sessions);
  const estMinutes = estimateTimeToFinishMinutes(activeBook, sessions);

  const handleCaptureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = noteContent.trim();
    const trimmedTerm = vocabTerm.trim();
    if (noteType === 'vocab' && !trimmedTerm) {
      setNoteError('Enter the vocabulary word first.');
      return;
    }
    if (!trimmed) {
      setNoteError(
        noteType === 'quote'
          ? 'Enter the quote passage to save.'
          : noteType === 'vocab'
            ? 'Enter the definition for this word.'
            : 'Write a quick thought to save.'
      );
      return;
    }
    const parsedPage = notePage ? Number.parseInt(notePage, 10) : undefined;
    if (parsedPage !== undefined && (!Number.isFinite(parsedPage) || parsedPage < 1)) {
      setNoteError('Page number must be at least 1.');
      return;
    }

    onAddNote({
      bookId: activeBook.id,
      type: noteType,
      content: trimmed,
      term: noteType === 'vocab' ? trimmedTerm : undefined,
      page: parsedPage,
    });
    setNoteContent('');
    setVocabTerm('');
    setNotePage('');
    setNoteError('');
    setNoteFeedback('Saved to your notebook.');
    window.setTimeout(() => setNoteFeedback(''), 3000);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Number.parseInt(manualMinutes, 10);
    const endP = Number.parseInt(manualEndPage, 10);

    if (!Number.isFinite(mins) || mins <= 0) {
      setManualError('Enter how many minutes you read.');
      return;
    }
    if (!Number.isFinite(endP) || endP < activeBook.currentPage || endP > activeBook.totalPages) {
      setManualError(
        `Ending page must be between ${activeBook.currentPage} and ${activeBook.totalPages}.`
      );
      return;
    }

    onLogManualSession({
      bookId: activeBook.id,
      minutes: mins,
      endPage: endP,
      note: manualNote.trim() || undefined,
    });
    setManualEndPage('');
    setManualNote('');
    setManualError('');
    setManualSuccess(`Logged ${mins}m up to page ${endP}.`);
    window.setTimeout(() => setManualSuccess(''), 3500);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Main Timer & Soundscape Column */}
      <div className="space-y-6 lg:col-span-7">
        {/* Timer Card */}
        <section className="rounded-2xl border border-[#E4E7EC] bg-white p-6 dark:border-slate-800 dark:bg-[#131B2E]">
          {/* Book Selector & Mode Switcher */}
          <div className="flex flex-col gap-4 border-b border-[#E4E7EC] pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div className="flex items-center gap-3.5 min-w-0">
              <BookCover
                title={activeBook.title}
                author={activeBook.author}
                coverImage={activeBook.coverImage}
                coverColor={activeBook.coverColor}
                size="sm"
              />
              <div className="min-w-0">
                <label htmlFor="timer-book-select" className="sr-only">
                  Choose book for reading session
                </label>
                <select
                  id="timer-book-select"
                  value={activeBook.id}
                  onChange={(e) => onSelectBook(e.target.value)}
                  className="-ml-1 max-w-full truncate rounded-lg border border-transparent bg-transparent py-0.5 pl-1 pr-6 font-editorial text-lg font-semibold text-[#121826] hover:border-[#D5DBE5] focus:border-[#1D63ED] focus:outline-none dark:text-slate-100"
                >
                  {books.map((b) => (
                    <option key={b.id} value={b.id} className="bg-white text-[#121826] dark:bg-[#131B2E] dark:text-slate-100">
                      {b.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[#5A6577] dark:text-slate-400">
                  {activeBook.author} · Page {activeBook.currentPage} of {activeBook.totalPages} ({progress.percent}%)
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 self-start rounded-xl bg-[#ECEFF4] p-1 dark:bg-[#0B1120]">
              <button
                type="button"
                onClick={() => setMode('timer')}
                className={`min-h-[34px] whitespace-nowrap rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  mode === 'timer'
                    ? 'bg-white text-[#121826] shadow-xs dark:bg-[#1E293B] dark:text-slate-100'
                    : 'text-[#5A6577] dark:text-slate-400'
                }`}
              >
                Live Timer
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`min-h-[34px] whitespace-nowrap rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  mode === 'manual'
                    ? 'bg-white text-[#121826] shadow-xs dark:bg-[#1E293B] dark:text-slate-100'
                    : 'text-[#5A6577] dark:text-slate-400'
                }`}
              >
                Manual Log
              </button>
            </div>
          </div>

          {mode === 'timer' ? (
            <div className="py-8 text-center">
              <p className="text-xs font-medium text-[#5A6577] dark:text-slate-400">
                {isRunning
                  ? 'Reading session in progress'
                  : elapsedSeconds > 0
                    ? 'Session paused'
                    : 'Ready to begin'}
              </p>

              {/* Big Tabular Monospace Clock */}
              <div
                aria-live="off"
                data-testid="timer-clock"
                className="mt-3 font-mono text-5xl font-semibold tracking-tight tabular-nums text-[#121826] sm:text-6xl dark:text-slate-50"
              >
                {formatTimerClock(elapsedSeconds)}
              </div>

              {/* Primary Controls */}
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onToggleRun}
                  className="inline-flex min-h-[48px] min-w-[152px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#1D63ED] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1550C8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D63ED]"
                >
                  {isRunning ? (
                    <>
                      <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                      <span>{elapsedSeconds > 0 ? 'Resume' : 'Start Reading'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onOpenFinishModal}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#121826] bg-[#121826] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:border-slate-200 dark:bg-slate-100 dark:text-[#121826] dark:hover:bg-white"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>Finish Session</span>
                </button>

                {elapsedSeconds > 0 && (
                  <button
                    type="button"
                    onClick={onResetTimer}
                    aria-label="Reset reading timer"
                    className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-[#D5DBE5] px-4 py-3 text-sm font-medium text-[#5A6577] hover:bg-slate-50 hover:text-[#121826] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Quiet Book Speed Footer */}
              <div className="mt-8 grid grid-cols-3 divide-x divide-[#E4E7EC] border-t border-[#E4E7EC] pt-5 text-center dark:divide-slate-800 dark:border-slate-800">
                <div>
                  <p className="text-xs text-[#5A6577] dark:text-slate-400">Book Pace</p>
                  <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#121826] dark:text-slate-100">
                    {stats.pagesPerHour > 0 ? `${stats.pagesPerHour} pg/h` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#5A6577] dark:text-slate-400">Pages Left</p>
                  <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#121826] dark:text-slate-100">
                    {progress.pagesRemaining}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#5A6577] dark:text-slate-400">Est. Finish</p>
                  <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#121826] dark:text-slate-100">
                    {progress.pagesRemaining === 0
                      ? 'Finished'
                      : estMinutes !== null
                        ? formatMinutesReadable(estMinutes)
                        : '—'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} noValidate className="space-y-4 pt-5">
              <p className="text-sm text-[#5A6577] dark:text-slate-400">
                Read offline? Log your minutes and new page number directly.
              </p>

              {manualError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                >
                  {manualError}
                </div>
              )}
              {manualSuccess && (
                <div
                  role="status"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  {manualSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="manual-minutes"
                    className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                  >
                    Minutes Read
                  </label>
                  <input
                    id="manual-minutes"
                    type="number"
                    min={1}
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-[#121826] focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="manual-end-page"
                    className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                  >
                    New Page (current: {activeBook.currentPage})
                  </label>
                  <input
                    id="manual-end-page"
                    type="number"
                    min={activeBook.currentPage}
                    max={activeBook.totalPages}
                    value={manualEndPage}
                    onChange={(e) => setManualEndPage(e.target.value)}
                    placeholder={String(Math.min(activeBook.totalPages, activeBook.currentPage + 15))}
                    className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-[#121826] focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="manual-note"
                  className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                >
                  Session Note (Optional)
                </label>
                <input
                  id="manual-note"
                  type="text"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="Read on the morning train..."
                  className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2.5 text-sm text-[#121826] focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                className="min-h-[42px] rounded-xl bg-[#1D63ED] px-5 py-2 text-sm font-medium text-white hover:bg-[#1550C8]"
              >
                Log Reading Session
              </button>
            </form>
          )}
        </section>

        {/* Ambient Soundscape Studio */}
        <section className="rounded-2xl border border-[#E4E7EC] bg-white p-6 dark:border-slate-800 dark:bg-[#131B2E]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#121826] dark:text-slate-100">
                Ambient Reading Soundscapes
              </h2>
              <p className="mt-0.5 text-xs text-[#5A6577] dark:text-slate-400">
                Synthesized local acoustic backgrounds for deep focus.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {activeSound ? (
                <Volume2 className="h-4 w-4 text-[#1D63ED] dark:text-[#60A5FA]" aria-hidden="true" />
              ) : (
                <VolumeX className="h-4 w-4 text-[#5A6577] dark:text-slate-400" aria-hidden="true" />
              )}
              <label htmlFor="ambient-volume" className="sr-only">
                Ambient sound volume
              </label>
              <input
                id="ambient-volume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={soundVolume}
                onChange={(e) => onChangeVolume(Number.parseFloat(e.target.value))}
                className="w-28 accent-[#1D63ED]"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
            {AMBIENT_SOUNDS.map((sound) => {
              const active = activeSound === sound.id;
              return (
                <button
                  key={sound.id}
                  type="button"
                  onClick={() => onSelectSound(active ? null : sound.id)}
                  aria-pressed={active}
                  className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-colors ${
                    active
                      ? 'border-[#1D63ED] bg-[#EEF4FF] text-[#121826] dark:bg-[#1D63ED]/20 dark:text-slate-100'
                      : 'border-[#E4E7EC] bg-[#F7F8FA] text-[#121826] hover:border-[#C5CFDF] dark:border-slate-800 dark:bg-[#0B1120] dark:text-slate-200'
                  }`}
                >
                  <span className="text-sm font-semibold">
                    {sound.label}
                  </span>
                  <span className="mt-1 text-xs leading-snug text-[#5A6577] dark:text-slate-400">
                    {active ? 'Playing now · Tap to stop' : sound.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Right Column: Mid-Session Quick Capture (Quotes, Thoughts, Vocabulary) */}
      <div className="lg:col-span-5">
        <section className="rounded-2xl border border-[#E4E7EC] bg-white p-6 dark:border-slate-800 dark:bg-[#131B2E]">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#1D63ED] dark:text-[#60A5FA]" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[#121826] dark:text-slate-100">
              Capture While Reading
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#5A6577] dark:text-slate-400">
            Save passages, thoughts, or new vocabulary linked to {activeBook.title}.
          </p>

          <div className="mt-4 flex items-center gap-1 rounded-xl bg-[#ECEFF4] p-1 dark:bg-[#0B1120]">
            {(
              [
                { id: 'quote', label: 'Quote' },
                { id: 'thought', label: 'Thought' },
                { id: 'vocab', label: 'Vocabulary' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setNoteType(tab.id);
                  setNoteError('');
                }}
                className={`min-h-[36px] flex-1 rounded-lg text-xs font-medium transition-colors ${
                  noteType === tab.id
                    ? 'bg-white text-[#121826] shadow-xs dark:bg-[#1E293B] dark:text-slate-100'
                    : 'text-[#5A6577] dark:text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleCaptureSubmit} noValidate className="mt-4 space-y-4">
            {noteError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                {noteError}
              </div>
            )}
            {noteFeedback && (
              <div
                role="status"
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                {noteFeedback}
              </div>
            )}

            {noteType === 'vocab' && (
              <div>
                <label
                  htmlFor="capture-vocab-term"
                  className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                >
                  Word / Term
                </label>
                <input
                  id="capture-vocab-term"
                  type="text"
                  value={vocabTerm}
                  onChange={(e) => setVocabTerm(e.target.value)}
                  placeholder="e.g., Ephemeral"
                  className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2.5 text-sm text-[#121826] focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="capture-note-content"
                className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
              >
                {noteType === 'quote'
                  ? 'Quote Passage'
                  : noteType === 'vocab'
                    ? 'Definition / Context'
                    : 'Your Thought'}
              </label>
              <textarea
                id="capture-note-content"
                rows={4}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder={
                  noteType === 'quote'
                    ? 'Type a favorite line from this chapter...'
                    : noteType === 'vocab'
                      ? 'Meaning or how it is used in the sentence...'
                      : 'Jot down a reflection, question, or connection...'
                }
                className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2.5 text-sm text-[#121826] placeholder:text-slate-400 focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
              />
            </div>

            <div className="flex items-end gap-3">
              <div className="w-28">
                <label
                  htmlFor="capture-note-page"
                  className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                >
                  Page #
                </label>
                <input
                  id="capture-note-page"
                  type="number"
                  min={1}
                  max={activeBook.totalPages}
                  value={notePage}
                  onChange={(e) => setNotePage(e.target.value)}
                  placeholder={String(activeBook.currentPage || 1)}
                  className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3 py-2 font-mono text-sm tabular-nums text-[#121826] focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                className="min-h-[40px] flex-1 rounded-xl bg-[#121826] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-[#121826] dark:hover:bg-white"
              >
                Save {noteType === 'quote' ? 'Quote' : noteType === 'vocab' ? 'Word' : 'Thought'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
