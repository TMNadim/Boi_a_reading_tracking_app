import { useState } from 'react';
import { Pencil, Play, Star, Trash2, X } from 'lucide-react';
import type { Book, Collection, NoteEntry, ReadingSession, ShelfStatus } from '../types/bookly';
import { BookCover } from './BookCover';
import {
  calculateBookProgress,
  calculateBookStats,
  estimateTimeToFinishMinutes,
  formatMinutesReadable,
  formatShortDate,
} from '../utils/readingStats';

interface BookDetailModalProps {
  book: Book | null;
  sessions: ReadingSession[];
  notes: NoteEntry[];
  collections: Collection[];
  onClose: () => void;
  onStartReading: (bookId: string) => void;
  onEdit: (book: Book) => void;
  onDelete: (bookId: string) => void;
  onUpdateBook: (bookId: string, patch: Partial<Book>) => void;
}

const SHELF_LABELS: Record<ShelfStatus, string> = {
  reading: 'Currently Reading',
  finished: 'Finished',
  want: 'Want to Read',
  unfinished: 'Unfinished',
};

export function BookDetailModal({
  book,
  sessions,
  notes,
  collections,
  onClose,
  onStartReading,
  onEdit,
  onDelete,
  onUpdateBook,
}: BookDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'sessions' | 'notes'>('sessions');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!book) return null;

  const progress = calculateBookProgress(book);
  const stats = calculateBookStats(book.id, sessions);
  const estMinutes = estimateTimeToFinishMinutes(book, sessions);
  const bookSessions = sessions
    .filter((s) => s.bookId === book.id)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const bookNotes = notes
    .filter((n) => n.bookId === book.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const bookCollections = collections.filter((c) => book.collectionIds.includes(c.id));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-detail-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs"
    >
      <div className="flex h-full w-full max-w-xl flex-col border-l border-[#E4E7EC] bg-white shadow-2xl dark:border-slate-800 dark:bg-[#131B2E]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E4E7EC] px-6 py-4 dark:border-slate-800">
          <span className="text-sm font-medium text-[#5A6577] dark:text-slate-400">
            Book Details
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(book)}
              aria-label={`Edit ${book.title}`}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[#5A6577] hover:bg-slate-100 hover:text-[#121826] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close book details"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[#5A6577] hover:bg-slate-100 hover:text-[#121826] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col gap-5 sm:flex-row">
            <BookCover
              title={book.title}
              author={book.author}
              coverImage={book.coverImage}
              coverColor={book.coverColor}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[#5A6577] dark:text-slate-400">
                {book.genre}
                {book.isbn ? ` · ISBN ${book.isbn}` : ''}
              </p>
              <h2
                id="book-detail-title"
                className="mt-1 text-2xl font-semibold leading-snug text-[#121826] dark:text-slate-100"
              >
                {book.title}
              </h2>
              <p className="mt-1 text-sm text-[#5A6577] dark:text-slate-400">
                by {book.author}
              </p>

              {/* Star Rating */}
              <div className="mt-3 flex items-center gap-1" role="group" aria-label="Book rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() =>
                      onUpdateBook(book.id, { rating: book.rating === star ? 0 : star })
                    }
                    aria-label={`Rate ${star} out of 5 stars`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-amber-500 transition-transform hover:scale-110"
                  >
                    <Star
                      className="h-4 w-4"
                      fill={star <= book.rating ? 'currentColor' : 'none'}
                      aria-hidden="true"
                    />
                  </button>
                ))}
                <span className="ml-1 font-mono text-xs tabular-nums text-[#5A6577] dark:text-slate-400">
                  {book.rating > 0 ? `${book.rating}.0` : 'Unrated'}
                </span>
              </div>

              {/* Shelf Switcher */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label htmlFor="detail-shelf-select" className="sr-only">
                  Shelf status
                </label>
                <select
                  id="detail-shelf-select"
                  value={book.shelf}
                  onChange={(e) => {
                    const nextShelf = e.target.value as ShelfStatus;
                    onUpdateBook(book.id, {
                      shelf: nextShelf,
                      currentPage:
                        nextShelf === 'finished' ? book.totalPages : book.currentPage,
                    });
                  }}
                  className="min-h-[40px] rounded-xl border border-[#D5DBE5] bg-white px-3 py-1.5 text-xs font-medium text-[#121826] focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
                >
                  {(Object.keys(SHELF_LABELS) as ShelfStatus[]).map((key) => (
                    <option key={key} value={key}>
                      {SHELF_LABELS[key]}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartReading(book.id);
                  }}
                  className="inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-xl bg-[#1D63ED] px-4 py-2 text-xs font-medium text-white hover:bg-[#1550C8]"
                >
                  <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  <span>Start Reading</span>
                </button>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-mono tabular-nums text-[#121826] dark:text-slate-200">
                Page {book.currentPage} of {book.totalPages}
              </span>
              <span className="font-mono font-semibold tabular-nums text-[#1D63ED] dark:text-[#60A5FA]">
                {progress.percent}%
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-[#1D63ED] transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            {bookCollections.length > 0 && (
              <p className="mt-2.5 text-xs text-[#5A6577] dark:text-slate-400">
                Collections: {bookCollections.map((c) => c.name).join(' · ')}
              </p>
            )}
          </div>

          {/* Metrics Row */}
          <div className="mt-6 grid grid-cols-3 divide-x divide-[#E4E7EC] rounded-xl border border-[#E4E7EC] bg-[#F7F8FA] py-3.5 text-center dark:divide-slate-800 dark:border-slate-800 dark:bg-[#0B1120]">
            <div>
              <p className="text-xs text-[#5A6577] dark:text-slate-400">Time Read</p>
              <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#121826] dark:text-slate-100">
                {formatMinutesReadable(stats.totalMinutes)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#5A6577] dark:text-slate-400">Avg Speed</p>
              <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#121826] dark:text-slate-100">
                {stats.pagesPerHour > 0 ? `${stats.pagesPerHour} pg/h` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#5A6577] dark:text-slate-400">Est. Left</p>
              <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#121826] dark:text-slate-100">
                {progress.pagesRemaining === 0
                  ? 'Done'
                  : estMinutes !== null
                    ? formatMinutesReadable(estMinutes)
                    : '—'}
              </p>
            </div>
          </div>

          {/* Review */}
          <div className="mt-6">
            <label
              htmlFor="detail-book-review"
              className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
            >
              Personal Review & Summary
            </label>
            <textarea
              id="detail-book-review"
              rows={2}
              value={book.review ?? ''}
              onChange={(e) => onUpdateBook(book.id, { review: e.target.value })}
              placeholder="Write your takeaway or review for this book..."
              className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2.5 text-sm text-[#121826] placeholder:text-slate-400 focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
            />
          </div>

          {/* History Tabs */}
          <div className="mt-6">
            <div className="flex items-center gap-1 rounded-xl bg-[#F0F2F5] p-1 dark:bg-[#0B1120]">
              <button
                type="button"
                onClick={() => setActiveTab('sessions')}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                  activeTab === 'sessions'
                    ? 'bg-white text-[#121826] shadow-xs dark:bg-[#1C263D] dark:text-slate-100'
                    : 'text-[#5A6577] hover:text-[#121826] dark:text-slate-400'
                }`}
              >
                Sessions ({bookSessions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                  activeTab === 'notes'
                    ? 'bg-white text-[#121826] shadow-xs dark:bg-[#1C263D] dark:text-slate-100'
                    : 'text-[#5A6577] hover:text-[#121826] dark:text-slate-400'
                }`}
              >
                Quotes & Notes ({bookNotes.length})
              </button>
            </div>

            {activeTab === 'sessions' ? (
              <div className="mt-4 divide-y divide-[#E4E7EC] dark:divide-slate-800">
                {bookSessions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-[#5A6577] dark:text-slate-400">
                    No timed sessions logged for this book yet.
                  </p>
                ) : (
                  bookSessions.map((session) => (
                    <div key={session.id} className="flex items-start justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#121826] dark:text-slate-100">
                          {formatShortDate(session.date)} · Pages {session.startPage}–{session.endPage}
                        </p>
                        {session.note && (
                          <p className="mt-0.5 text-xs text-[#5A6577] dark:text-slate-400">
                            {session.note}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right font-mono text-xs tabular-nums text-[#5A6577] dark:text-slate-400">
                        <p className="font-semibold text-[#121826] dark:text-slate-200">
                          {formatMinutesReadable(session.durationSeconds / 60)}
                        </p>
                        <p>+{session.pagesRead} pg</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="mt-4 divide-y divide-[#E4E7EC] dark:divide-slate-800">
                {bookNotes.length === 0 ? (
                  <p className="py-6 text-center text-sm text-[#5A6577] dark:text-slate-400">
                    No quotes, thoughts, or vocabulary words saved for this book yet.
                  </p>
                ) : (
                  bookNotes.map((entry) => (
                    <div key={entry.id} className="py-3.5">
                      <p className="text-xs text-[#5A6577] dark:text-slate-400">
                        {entry.type === 'quote'
                          ? 'Quote'
                          : entry.type === 'vocab'
                            ? `Vocabulary · ${entry.term}`
                            : 'Thought'}
                        {entry.page ? ` · Page ${entry.page}` : ''}
                      </p>
                      <p
                        className={`mt-1 text-sm leading-relaxed text-[#121826] dark:text-slate-100 ${
                          entry.type === 'quote' ? 'font-editorial italic' : ''
                        }`}
                      >
                        {entry.type === 'quote' ? `“${entry.content}”` : entry.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Delete Area */}
        <div className="flex items-center justify-between border-t border-[#E4E7EC] px-6 py-4 dark:border-slate-800">
          {confirmingDelete ? (
            <div className="flex w-full items-center justify-between gap-3">
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                Remove book and its session links?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="min-h-[36px] rounded-lg border border-[#D5DBE5] px-3 py-1.5 text-xs font-medium text-[#5A6577] dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(book.id);
                    onClose();
                  }}
                  className="min-h-[36px] rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Remove Book</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
