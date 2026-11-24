import { useMemo, useState } from 'react';
import { FolderPlus, Play, Plus, ScanBarcode, Search, Star } from 'lucide-react';
import type { Book, Collection, ReadingGoals, ReadingSession, ShelfStatus } from '../types/bookly';
import { BookCover } from './BookCover';
import { BlooCompanion } from './BlooCompanion';
import {
  calculateBookProgress,
  estimateTimeToFinishMinutes,
  formatMinutesReadable,
  getBlooMessage,
} from '../utils/readingStats';

interface LibraryViewProps {
  books: Book[];
  sessions: ReadingSession[];
  collections: Collection[];
  goals: ReadingGoals;
  onStartReading: (bookId: string) => void;
  onSelectBook: (book: Book) => void;
  onOpenAddBook: () => void;
  onOpenScanIsbn: () => void;
  onCreateCollection: (name: string) => void;
}

type ShelfFilter = 'all' | ShelfStatus;
type SortOption = 'recent' | 'progress' | 'title' | 'rating';

const SHELF_TABS: { id: ShelfFilter; label: string }[] = [
  { id: 'all', label: 'All Books' },
  { id: 'reading', label: 'Currently Reading' },
  { id: 'want', label: 'Want to Read' },
  { id: 'finished', label: 'Finished' },
  { id: 'unfinished', label: 'Unfinished' },
];

const SHELF_TEXT: Record<ShelfStatus, string> = {
  reading: 'Reading',
  want: 'Want to Read',
  finished: 'Finished',
  unfinished: 'Unfinished',
};

export function LibraryView({
  books,
  sessions,
  collections,
  goals,
  onStartReading,
  onSelectBook,
  onOpenAddBook,
  onOpenScanIsbn,
  onCreateCollection,
}: LibraryViewProps) {
  const [shelfFilter, setShelfFilter] = useState<ShelfFilter>('all');
  const [collectionFilter, setCollectionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [collectionError, setCollectionError] = useState('');

  const bloo = useMemo(
    () => getBlooMessage({ books, sessions, goals }),
    [books, sessions, goals]
  );

  const primaryReadingBook = useMemo(
    () => books.find((b) => b.shelf === 'reading') ?? books[0],
    [books]
  );

  const shelfCounts = useMemo(() => {
    const counts: Record<ShelfFilter, number> = {
      all: books.length,
      reading: 0,
      want: 0,
      finished: 0,
      unfinished: 0,
    };
    for (const b of books) {
      counts[b.shelf] += 1;
    }
    return counts;
  }, [books]);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = books.filter((b) => {
      if (shelfFilter !== 'all' && b.shelf !== shelfFilter) return false;
      if (collectionFilter !== 'all' && !b.collectionIds.includes(collectionFilter)) {
        return false;
      }
      if (q) {
        return (
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.genre.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'progress') {
        return calculateBookProgress(b).percent - calculateBookProgress(a).percent;
      }
      // recent: prioritize currently reading first, then newest addedAt
      if (a.shelf === 'reading' && b.shelf !== 'reading') return -1;
      if (b.shelf === 'reading' && a.shelf !== 'reading') return 1;
      return b.addedAt.localeCompare(a.addedAt);
    });
  }, [books, shelfFilter, collectionFilter, searchQuery, sortBy]);

  const handleCollectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCollectionName.trim();
    if (!trimmed) {
      setCollectionError('Enter a collection name.');
      return;
    }
    onCreateCollection(trimmed);
    setNewCollectionName('');
    setCollectionError('');
    setShowNewCollection(false);
  };

  return (
    <div className="space-y-6">
      {/* Bloo Companion Strip */}
      <BlooCompanion
        headline={bloo.headline}
        detail={bloo.detail}
        actionLabel={primaryReadingBook ? 'Start Session' : 'Add First Book'}
        onAction={() => {
          if (primaryReadingBook) {
            onStartReading(primaryReadingBook.id);
          } else {
            onOpenAddBook();
          }
        }}
      />

      {/* Shelves & Search Controls */}
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
        {/* Segmented Shelf Filter */}
        <div
          role="tablist"
          aria-label="Filter library by shelf"
          className="flex items-center gap-1 overflow-x-auto rounded-xl bg-[#ECEFF4] p-1 dark:bg-[#131B2E]"
        >
          {SHELF_TABS.map((tab) => {
            const active = shelfFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setShelfFilter(tab.id)}
                className={`min-h-[38px] shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-white text-[#121826] shadow-xs dark:bg-[#1E293B] dark:text-slate-100'
                    : 'text-[#5A6577] hover:text-[#121826] dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}{' '}
                <span className="font-mono tabular-nums opacity-70">
                  {shelfCounts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A6577] dark:text-slate-400"
              aria-hidden="true"
            />
            <label htmlFor="library-search" className="sr-only">
              Search books
            </label>
            <input
              id="library-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, author, genre..."
              className="min-h-[40px] w-full rounded-xl border border-[#D5DBE5] bg-white pl-9 pr-3.5 text-sm text-[#121826] placeholder:text-slate-400 focus:border-[#1D63ED] focus:outline-none dark:border-slate-800 dark:bg-[#131B2E] dark:text-slate-100"
            />
          </div>

          <label htmlFor="library-sort" className="sr-only">
            Sort books
          </label>
          <select
            id="library-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="min-h-[40px] shrink-0 rounded-xl border border-[#D5DBE5] bg-white px-3 py-2 text-xs font-medium text-[#121826] focus:border-[#1D63ED] focus:outline-none dark:border-slate-800 dark:bg-[#131B2E] dark:text-slate-100"
          >
            <option value="recent">Sort: Active First</option>
            <option value="progress">Sort: Progress</option>
            <option value="rating">Sort: Highest Rated</option>
            <option value="title">Sort: Title A–Z</option>
          </select>

          <button
            type="button"
            onClick={onOpenScanIsbn}
            aria-label="Scan ISBN barcode to add book"
            className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#D5DBE5] bg-white px-3 py-2 text-xs font-semibold text-[#121826] transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-[#131B2E] dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <ScanBarcode className="h-4 w-4 text-[#1D63ED] dark:text-[#60A5FA]" aria-hidden="true" />
            <span className="hidden sm:inline">Scan ISBN</span>
          </button>
        </div>
      </div>

      {/* Custom Collections Bar */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-[#E4E7EC] pb-3.5 dark:border-slate-800">
        <span className="shrink-0 text-xs font-medium text-[#5A6577] dark:text-slate-400">
          Collections:
        </span>
        <button
          type="button"
          onClick={() => setCollectionFilter('all')}
          className={`min-h-[34px] shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            collectionFilter === 'all'
              ? 'bg-[#121826] text-white dark:bg-slate-100 dark:text-[#121826]'
              : 'text-[#5A6577] hover:bg-slate-100 hover:text-[#121826] dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          All
        </button>
        {collections.map((col) => {
          const active = collectionFilter === col.id;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setCollectionFilter(active ? 'all' : col.id)}
              className={`min-h-[34px] shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'bg-[#121826] text-white dark:bg-slate-100 dark:text-[#121826]'
                  : 'text-[#5A6577] hover:bg-slate-100 hover:text-[#121826] dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {col.name}
            </button>
          );
        })}

        {showNewCollection ? (
          <form onSubmit={handleCollectionSubmit} className="flex items-center gap-1.5">
            <label htmlFor="new-collection-name" className="sr-only">
              New collection name
            </label>
            <input
              id="new-collection-name"
              type="text"
              value={newCollectionName}
              onChange={(e) => {
                setNewCollectionName(e.target.value);
                setCollectionError('');
              }}
              placeholder="Collection name"
              autoFocus
              className="h-8 w-40 rounded-lg border border-[#D5DBE5] bg-white px-2.5 text-xs text-[#121826] focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#131B2E] dark:text-slate-100"
            />
            <button
              type="submit"
              className="h-8 rounded-lg bg-[#1D63ED] px-2.5 text-xs font-medium text-white hover:bg-[#1550C8]"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewCollection(false);
                setCollectionError('');
              }}
              className="h-8 rounded-lg px-2 text-xs text-[#5A6577] hover:text-[#121826] dark:text-slate-400"
            >
              Cancel
            </button>
            {collectionError && (
              <span className="text-xs text-red-600 dark:text-red-400">{collectionError}</span>
            )}
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowNewCollection(true)}
            className="inline-flex min-h-[34px] items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium text-[#1D63ED] hover:bg-[#EEF4FF] dark:text-[#60A5FA] dark:hover:bg-[#1D63ED]/15"
          >
            <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>New Collection</span>
          </button>
        )}
      </div>

      {/* Book Grid */}
      {filteredBooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D5DBE5] bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-[#131B2E]">
          <h3 className="font-editorial text-lg font-semibold text-[#121826] dark:text-slate-100">
            No books match this view
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-[#5A6577] dark:text-slate-400">
            Clear your filter or add a new book to begin tracking pages, reading speed, and quotes.
          </p>
          <button
            type="button"
            onClick={onOpenAddBook}
            className="mt-5 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#1D63ED] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1550C8]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add Book</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredBooks.map((book) => {
            const progress = calculateBookProgress(book);
            const estMinutes = estimateTimeToFinishMinutes(book, sessions);

            return (
              <article
                key={book.id}
                className="flex flex-col justify-between rounded-2xl border border-[#E4E7EC] bg-white p-5 transition-colors hover:border-[#C5CFDF] dark:border-slate-800 dark:bg-[#131B2E] dark:hover:border-slate-700"
              >
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => onSelectBook(book)}
                    aria-label={`Open details for ${book.title}`}
                    className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D63ED]"
                  >
                    <BookCover
                      title={book.title}
                      author={book.author}
                      coverImage={book.coverImage}
                      coverColor={book.coverColor}
                      size="md"
                    />
                  </button>

                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <p className="truncate text-xs text-[#5A6577] dark:text-slate-400">
                        {SHELF_TEXT[book.shelf]} · {book.genre}
                      </p>
                      <h3 className="mt-1 line-clamp-2 font-editorial text-lg font-semibold leading-snug text-[#121826] dark:text-slate-100">
                        <button
                          type="button"
                          onClick={() => onSelectBook(book)}
                          className="text-left hover:text-[#1D63ED] dark:hover:text-[#60A5FA]"
                        >
                          {book.title}
                        </button>
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-[#5A6577] dark:text-slate-400">
                        {book.author}
                      </p>
                    </div>

                    {book.rating > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-[#5A6577] dark:text-slate-400">
                        <Star
                          className="h-3.5 w-3.5 fill-amber-500 text-amber-500"
                          aria-hidden="true"
                        />
                        <span className="font-mono tabular-nums">{book.rating}.0</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress & Time Estimate */}
                <div className="mt-5">
                  <div className="flex items-baseline justify-between gap-2 text-xs text-[#5A6577] dark:text-slate-400">
                    <span className="font-mono tabular-nums">
                      {book.currentPage} / {book.totalPages} pages
                    </span>
                    <span className="font-mono tabular-nums">
                      {progress.percent}%
                      {progress.pagesRemaining > 0 && estMinutes !== null
                        ? ` · ~${formatMinutesReadable(estMinutes)} left`
                        : ' · Complete'}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        book.shelf === 'finished' ? 'bg-emerald-600' : 'bg-[#1D63ED]'
                      }`}
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#F0F2F5] pt-3.5 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => onSelectBook(book)}
                    className="min-h-[38px] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#5A6577] transition-colors hover:bg-slate-100 hover:text-[#121826] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    Details & Notes
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartReading(book.id)}
                    aria-label={`Read ${book.title}`}
                    className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#EEF4FF] px-3.5 py-1.5 text-xs font-semibold text-[#1D63ED] transition-colors hover:bg-[#1D63ED] hover:text-white dark:bg-[#1D63ED]/20 dark:text-[#60A5FA] dark:hover:bg-[#1D63ED] dark:hover:text-white"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    <span>{book.shelf === 'finished' ? 'Re-read' : 'Read Now'}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
