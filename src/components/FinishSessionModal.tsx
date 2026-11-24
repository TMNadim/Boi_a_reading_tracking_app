import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Book, SessionMood } from '../types/bookly';
import { calculateSpeedPagesPerHour, formatTimerClock } from '../utils/readingStats';

interface FinishSessionModalProps {
  isOpen: boolean;
  book: Book | null;
  elapsedSeconds: number;
  onClose: () => void;
  onConfirm: (payload: {
    endPage: number;
    durationSeconds: number;
    mood?: SessionMood;
    note?: string;
    markFinished: boolean;
  }) => void;
}

const MOODS: { value: SessionMood; label: string }[] = [
  { value: 'focused', label: 'Focused' },
  { value: 'inspired', label: 'Inspired' },
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'curious', label: 'Curious' },
  { value: 'emotional', label: 'Emotional' },
];

export function FinishSessionModal({
  isOpen,
  book,
  elapsedSeconds,
  onClose,
  onConfirm,
}: FinishSessionModalProps) {
  const [endPageInput, setEndPageInput] = useState('');
  const [durationMinutesOverride, setDurationMinutesOverride] = useState('');
  const [mood, setMood] = useState<SessionMood | undefined>('focused');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !book) return;
    const suggestedEnd = Math.min(book.totalPages, book.currentPage + 10);
    setEndPageInput(String(suggestedEnd));
    setDurationMinutesOverride(String(Math.max(1, Math.round(elapsedSeconds / 60))));
    setMood('focused');
    setNote('');
    setError('');
  }, [isOpen, book, elapsedSeconds]);

  if (!isOpen || !book) return null;

  const parsedEnd = Number.parseInt(endPageInput, 10);
  const effectiveSeconds =
    elapsedSeconds >= 60
      ? elapsedSeconds
      : Math.max(60, (Number.parseInt(durationMinutesOverride || '1', 10) || 1) * 60);
  const pagesReadPreview =
    Number.isFinite(parsedEnd) && parsedEnd >= book.currentPage
      ? parsedEnd - book.currentPage
      : 0;
  const speedPreview = calculateSpeedPagesPerHour(pagesReadPreview, effectiveSeconds);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(parsedEnd)) {
      setError('Enter the page number you finished on.');
      return;
    }
    if (parsedEnd < book.currentPage) {
      setError(`Ending page cannot be earlier than your starting page (${book.currentPage}).`);
      return;
    }
    if (parsedEnd > book.totalPages) {
      setError(`Ending page cannot exceed total pages (${book.totalPages}).`);
      return;
    }

    onConfirm({
      endPage: parsedEnd,
      durationSeconds: effectiveSeconds,
      mood,
      note: note.trim() || undefined,
      markFinished: parsedEnd >= book.totalPages,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-session-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#E4E7EC] bg-white shadow-xl dark:border-slate-800 dark:bg-[#131B2E]">
        <div className="flex items-center justify-between border-b border-[#E4E7EC] px-6 py-4 dark:border-slate-800">
          <div>
            <h2
              id="finish-session-title"
              className="text-lg font-semibold text-[#121826] dark:text-slate-100"
            >
              Finish Reading Session
            </h2>
            <p className="mt-0.5 text-xs text-[#5A6577] dark:text-slate-400">
              {book.title} · Started at page {book.currentPage}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close finish session dialog"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#5A6577] hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5 p-6">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {/* Session live summary bar */}
          <div className="grid grid-cols-3 divide-x divide-[#E4E7EC] rounded-xl border border-[#E4E7EC] bg-[#F7F8FA] py-3 text-center dark:divide-slate-800 dark:border-slate-800 dark:bg-[#0B1120]">
            <div>
              <p className="text-xs text-[#5A6577] dark:text-slate-400">Duration</p>
              <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#121826] dark:text-slate-100">
                {formatTimerClock(effectiveSeconds)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#5A6577] dark:text-slate-400">Pages Read</p>
              <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#121826] dark:text-slate-100">
                {pagesReadPreview}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#5A6577] dark:text-slate-400">Pace</p>
              <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#121826] dark:text-slate-100">
                {speedPreview} pg/h
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="finish-end-page"
                className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
              >
                Ending Page (of {book.totalPages})
              </label>
              <input
                id="finish-end-page"
                type="number"
                min={book.currentPage}
                max={book.totalPages}
                value={endPageInput}
                onChange={(e) => setEndPageInput(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2.5 font-mono text-base font-semibold tabular-nums text-[#121826] focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
              />
            </div>

            {elapsedSeconds < 60 && (
              <div>
                <label
                  htmlFor="finish-duration-mins"
                  className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                >
                  Minutes Read
                </label>
                <input
                  id="finish-duration-mins"
                  type="number"
                  min={1}
                  max={600}
                  value={durationMinutesOverride}
                  onChange={(e) => setDurationMinutesOverride(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2.5 font-mono text-base font-semibold tabular-nums text-[#121826] focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
                />
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-[#5A6577] dark:text-slate-400">
              How did this session feel?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MOODS.map((item) => {
                const active = mood === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setMood(active ? undefined : item.value)}
                    aria-pressed={active}
                    className={`min-h-[38px] rounded-xl border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'border-[#1D63ED] bg-[#EEF4FF] text-[#1D63ED] dark:bg-[#1D63ED]/20 dark:text-[#60A5FA]'
                        : 'border-[#D5DBE5] bg-white text-[#5A6577] hover:text-[#121826] dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="finish-session-note"
              className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
            >
              Session Reflection (Optional)
            </label>
            <textarea
              id="finish-session-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A brief note on what stood out in these pages..."
              className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2.5 text-sm text-[#121826] placeholder:text-slate-400 focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[#E4E7EC] pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] rounded-xl border border-[#D5DBE5] px-4 py-2 text-sm font-medium text-[#5A6577] hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Keep Reading
            </button>
            <button
              type="submit"
              className="min-h-[40px] rounded-xl bg-[#1D63ED] px-5 py-2 text-sm font-medium text-white hover:bg-[#1550C8]"
            >
              Save Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
