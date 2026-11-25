import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, ScanBarcode, Search, X } from 'lucide-react';
import type { Book, Collection, ShelfStatus } from '../types/bookly';
import { COVER_COLORS, COVER_PRESETS } from '../data/seedData';
import { getDateKey } from '../utils/readingStats';
import { isValidIsbn, lookupBookByIsbn, normalizeIsbn } from '../utils/isbnLookup';
import { IsbnScannerModal } from './IsbnScannerModal';

interface BookFormModalProps {
  isOpen: boolean;
  initialBook?: Book | null;
  openScannerOnMount?: boolean;
  scannerCloseSignal?: number;
  onScannerOpenChange?: (open: boolean) => void;
  collections: Collection[];
  onClose: () => void;
  onSave: (bookData: Omit<Book, 'id' | 'addedAt'> & { id?: string }) => void;
}

const SHELF_OPTIONS: { value: ShelfStatus; label: string }[] = [
  { value: 'reading', label: 'Currently Reading' },
  { value: 'want', label: 'Want to Read' },
  { value: 'finished', label: 'Finished' },
  { value: 'unfinished', label: 'Unfinished' },
];

export function BookFormModal({
  isOpen,
  initialBook,
  openScannerOnMount = false,
  scannerCloseSignal = 0,
  onScannerOpenChange,
  collections,
  onClose,
  onSave,
}: BookFormModalProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [currentPage, setCurrentPage] = useState('0');
  const [shelf, setShelf] = useState<ShelfStatus>('reading');
  const [genre, setGenre] = useState('Fiction');
  const [isbn, setIsbn] = useState('');
  const [coverImage, setCoverImage] = useState<string | undefined>(COVER_PRESETS[0].url);
  const [fetchedCoverUrl, setFetchedCoverUrl] = useState<string | undefined>(undefined);
  const [fetchedCoverBroken, setFetchedCoverBroken] = useState(false);
  const [coverColor, setCoverColor] = useState<string>(COVER_COLORS[0]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [error, setError] = useState('');

  // ISBN lookup & barcode scanner states
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const lastLookedUpIsbnRef = useRef<string>('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) {
      abortRef.current?.abort();
      setIsScannerOpen(false);
      return;
    }
    if (initialBook) {
      setTitle(initialBook.title);
      setAuthor(initialBook.author);
      setTotalPages(String(initialBook.totalPages));
      setCurrentPage(String(initialBook.currentPage));
      setShelf(initialBook.shelf);
      setGenre(initialBook.genre);
      setIsbn(initialBook.isbn ?? '');
      setCoverImage(initialBook.coverImage);
      const isPreset = COVER_PRESETS.some((p) => p.url === initialBook.coverImage);
      setFetchedCoverUrl(initialBook.coverImage && !isPreset ? initialBook.coverImage : undefined);
      setFetchedCoverBroken(false);
      setCoverColor(initialBook.coverColor);
      setSelectedCollections(initialBook.collectionIds);
      lastLookedUpIsbnRef.current = initialBook.isbn ? normalizeIsbn(initialBook.isbn) : '';
    } else {
      setTitle('');
      setAuthor('');
      setTotalPages('');
      setCurrentPage('0');
      setShelf('reading');
      setGenre('Fiction');
      setIsbn('');
      setCoverImage(COVER_PRESETS[0].url);
      setFetchedCoverUrl(undefined);
      setFetchedCoverBroken(false);
      setCoverColor(COVER_COLORS[0]);
      setSelectedCollections([]);
      lastLookedUpIsbnRef.current = '';
    }
    setError('');
    setLookupStatus(null);
    setIsLookingUp(false);
    setIsScannerOpen(openScannerOnMount && !initialBook);
  }, [isOpen, initialBook, openScannerOnMount]);

  useEffect(() => {
    onScannerOpenChange?.(isScannerOpen);
  }, [isScannerOpen, onScannerOpenChange]);

  useEffect(() => {
    if (scannerCloseSignal > 0) {
      setIsScannerOpen(false);
    }
  }, [scannerCloseSignal]);

  const performIsbnLookup = useCallback(async (rawInput: string) => {
    const clean = normalizeIsbn(rawInput);
    if (!clean) {
      setLookupStatus({ kind: 'error', message: 'Enter an ISBN-10 or ISBN-13 first.' });
      return;
    }
    if (!isValidIsbn(clean)) {
      setLookupStatus({
        kind: 'error',
        message: 'Invalid ISBN checksum. Check the 10- or 13-digit number.',
      });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLookingUp(true);
    setLookupStatus(null);
    setError('');
    lastLookedUpIsbnRef.current = clean;

    try {
      const metadata = await lookupBookByIsbn(clean, controller.signal);
      if (controller.signal.aborted) return;

      setIsbn(metadata.isbn);
      if (metadata.title) setTitle(metadata.title);
      if (metadata.author) setAuthor(metadata.author);
      if (metadata.totalPages) setTotalPages(String(metadata.totalPages));
      if (metadata.genre) setGenre(metadata.genre);
      if (metadata.coverImage) {
        setFetchedCoverUrl(metadata.coverImage);
        setFetchedCoverBroken(false);
        setCoverImage(metadata.coverImage);
      }

      const filledFields = [
        metadata.title && 'title',
        metadata.author && 'author',
        metadata.totalPages && 'pages',
        metadata.coverImage && 'cover',
      ].filter(Boolean);

      setLookupStatus({
        kind: 'success',
        message: `Auto-filled ${filledFields.join(', ')} from ${metadata.source}.`,
      });
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setLookupStatus({
        kind: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Could not look up that ISBN right now. You can enter details manually.',
      });
    } finally {
      if (!controller.signal.aborted) {
        setIsLookingUp(false);
      }
    }
  }, []);

  // Automatically trigger ISBN lookup when user finishes typing/pasting a valid ISBN-10 or ISBN-13
  useEffect(() => {
    if (!isOpen) return;
    const clean = normalizeIsbn(isbn);
    if (!isValidIsbn(clean)) return;
    if (clean === lastLookedUpIsbnRef.current) return;

    const timerId = window.setTimeout(() => {
      void performIsbnLookup(clean);
    }, 450);

    return () => window.clearTimeout(timerId);
  }, [isbn, isOpen, performIsbnLookup]);

  const handleBarcodeDetected = useCallback(
    (scannedIsbn: string) => {
      setIsScannerOpen(false);
      setIsbn(scannedIsbn);
      void performIsbnLookup(scannedIsbn);
    },
    [performIsbnLookup]
  );

  if (!isOpen) return null;

  const toggleCollection = (id: string) => {
    setSelectedCollections((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedAuthor = author.trim();
    const parsedTotal = Number.parseInt(totalPages, 10);
    const parsedCurrent = Number.parseInt(currentPage || '0', 10);

    if (!trimmedTitle) {
      setError('Please enter a book title.');
      return;
    }
    if (!trimmedAuthor) {
      setError('Please enter the author name.');
      return;
    }
    if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) {
      setError('Total pages must be a positive number.');
      return;
    }
    if (!Number.isFinite(parsedCurrent) || parsedCurrent < 0 || parsedCurrent > parsedTotal) {
      setError(`Current page must be between 0 and ${parsedTotal}.`);
      return;
    }

    const finalPage = shelf === 'finished' ? parsedTotal : parsedCurrent;
    const today = getDateKey();
    const safeCoverImage =
      coverImage === fetchedCoverUrl && fetchedCoverBroken ? undefined : coverImage;

    onSave({
      id: initialBook?.id,
      title: trimmedTitle,
      author: trimmedAuthor,
      totalPages: parsedTotal,
      currentPage: finalPage,
      shelf,
      genre: genre.trim() || 'General',
      isbn: isbn.trim() || undefined,
      coverImage: safeCoverImage,
      coverColor,
      rating: initialBook?.rating ?? 0,
      review: initialBook?.review,
      collectionIds: selectedCollections,
      startedAt:
        initialBook?.startedAt ??
        (shelf === 'reading' || shelf === 'finished' ? today : undefined),
      finishedAt:
        shelf === 'finished' ? initialBook?.finishedAt ?? today : undefined,
    });
    onClose();
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-form-title"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      >
        <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#E4E7EC] bg-white shadow-xl dark:border-slate-800 dark:bg-[#131B2E]">
          <div className="flex items-center justify-between border-b border-[#E4E7EC] px-6 py-4 dark:border-slate-800">
            <h2
              id="book-form-title"
              className="text-lg font-semibold text-[#121826] dark:text-slate-100"
            >
              {initialBook ? 'Edit Book' : 'Add Book to Library'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close book form"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[#5A6577] transition-colors hover:bg-slate-100 hover:text-[#121826] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5 p-6">
            {/* ISBN Quick Auto-Fill & Barcode Scan Bar */}
            <div className="rounded-xl border border-[#E4E7EC] bg-[#F7F8FA] p-4 dark:border-slate-800 dark:bg-[#0B1120]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="book-isbn-input"
                  className="text-xs font-semibold text-[#121826] dark:text-slate-100"
                >
                  Quick Fill by ISBN or Barcode
                </label>
                <span className="text-[11px] text-[#5A6577] dark:text-slate-400">
                  Auto-fills title, author, pages & cover
                </span>
              </div>

              <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                <input
                  id="book-isbn-input"
                  type="text"
                  inputMode="text"
                  value={isbn}
                  onChange={(e) => {
                    setIsbn(e.target.value);
                    if (lookupStatus) setLookupStatus(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void performIsbnLookup(isbn);
                    }
                  }}
                  placeholder="9780143127741"
                  className="min-h-[40px] flex-1 rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2 font-mono text-sm text-[#121826] placeholder:text-slate-400 focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#131B2E] dark:text-slate-100"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isLookingUp}
                    onClick={() => void performIsbnLookup(isbn)}
                    className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2 text-xs font-semibold text-[#121826] transition-colors hover:bg-slate-50 disabled:opacity-60 sm:flex-none dark:border-slate-700 dark:bg-[#131B2E] dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    {isLookingUp ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Search className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>{isLookingUp ? 'Looking up...' : 'Lookup'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[#121826] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 sm:flex-none dark:bg-slate-100 dark:text-[#121826] dark:hover:bg-white"
                  >
                    <ScanBarcode className="h-4 w-4" aria-hidden="true" />
                    <span>Scan Barcode</span>
                  </button>
                </div>
              </div>

              {lookupStatus && (
                <div
                  role={lookupStatus.kind === 'error' ? 'alert' : 'status'}
                  className={`mt-2.5 flex items-center gap-1.5 text-xs font-medium ${
                    lookupStatus.kind === 'success'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {lookupStatus.kind === 'success' && (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>{lookupStatus.message}</span>
                </div>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="book-title-input"
                  className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                >
                  Book Title
                </label>
                <input
                  id="book-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., The Left Hand of Darkness"
                  className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2.5 text-sm text-[#121826] placeholder:text-slate-400 focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="book-author-input"
                  className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                >
                  Author
                </label>
                <input
                  id="book-author-input"
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g., Ursula K. Le Guin"
                  className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2.5 text-sm text-[#121826] placeholder:text-slate-400 focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="book-total-pages"
                  className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                >
                  Total Pages
                </label>
                <input
                  id="book-total-pages"
                  type="number"
                  min={1}
                  value={totalPages}
                  onChange={(e) => setTotalPages(e.target.value)}
                  placeholder="320"
                  className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-[#121826] focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="book-current-page"
                  className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                >
                  Current Page
                </label>
                <input
                  id="book-current-page"
                  type="number"
                  min={0}
                  value={currentPage}
                  onChange={(e) => setCurrentPage(e.target.value)}
                  placeholder="0"
                  className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-[#121826] focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="book-shelf-select"
                  className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                >
                  Shelf
                </label>
                <select
                  id="book-shelf-select"
                  value={shelf}
                  onChange={(e) => setShelf(e.target.value as ShelfStatus)}
                  className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2.5 text-sm text-[#121826] focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
                >
                  {SHELF_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="book-genre-input"
                  className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                >
                  Genre
                </label>
                <input
                  id="book-genre-input"
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="Sci-Fi, Essays, History..."
                  className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2.5 text-sm text-[#121826] focus:border-[#1D63ED] focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
                />
              </div>
            </div>

            {/* Cover Artwork Picker */}
            <div>
              <p className="text-xs font-medium text-[#5A6577] dark:text-slate-400">
                Cover Photo
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                {fetchedCoverUrl && !fetchedCoverBroken && (
                  <button
                    type="button"
                    onClick={() => setCoverImage(fetchedCoverUrl)}
                    aria-label="Select fetched ISBN cover photo"
                    aria-pressed={coverImage === fetchedCoverUrl}
                    className={`relative h-14 w-11 overflow-hidden rounded-lg border-2 transition-transform hover:scale-105 ${
                      coverImage === fetchedCoverUrl
                        ? 'border-[#1D63ED] ring-2 ring-[#1D63ED]/30'
                        : 'border-transparent'
                    }`}
                  >
                    <img
                      src={fetchedCoverUrl}
                      alt="Fetched ISBN cover"
                      referrerPolicy="no-referrer"
                      onError={() => {
                        setFetchedCoverBroken(true);
                        if (coverImage === fetchedCoverUrl) {
                          setCoverImage(COVER_PRESETS[0].url);
                        }
                      }}
                      className="h-full w-full object-cover"
                    />
                  </button>
                )}

                {COVER_PRESETS.map((preset) => {
                  const selected = coverImage === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setCoverImage(preset.url);
                        setCoverColor(preset.color);
                      }}
                      aria-label={`Select ${preset.label} cover artwork`}
                      aria-pressed={selected}
                      className={`relative h-14 w-11 overflow-hidden rounded-lg border-2 transition-transform hover:scale-105 ${
                        selected
                          ? 'border-[#1D63ED] ring-2 ring-[#1D63ED]/30'
                          : 'border-transparent'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setCoverImage(undefined)}
                  aria-pressed={!coverImage}
                  className={`flex h-14 items-center justify-center rounded-lg border px-3 text-xs font-medium transition-colors ${
                    !coverImage
                      ? 'border-[#1D63ED] bg-[#EEF4FF] text-[#1D63ED] dark:bg-[#1D63ED]/20 dark:text-[#60A5FA]'
                      : 'border-[#D5DBE5] text-[#5A6577] hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  Solid Linen
                </button>
              </div>

              {!coverImage && (
                <div className="mt-3 flex items-center gap-2">
                  {COVER_COLORS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setCoverColor(hex)}
                      aria-label={`Use cover color ${hex}`}
                      aria-pressed={coverColor === hex}
                      className={`h-7 w-7 rounded-full border-2 transition-transform ${
                        coverColor === hex
                          ? 'scale-110 border-[#121826] dark:border-white'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Collections */}
            {collections.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[#5A6577] dark:text-slate-400">
                  Collections
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {collections.map((col) => {
                    const active = selectedCollections.includes(col.id);
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => toggleCollection(col.id)}
                        aria-pressed={active}
                        className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? 'border-[#1D63ED] bg-[#EEF4FF] text-[#1D63ED] dark:bg-[#1D63ED]/20 dark:text-[#60A5FA]'
                            : 'border-[#D5DBE5] bg-white text-[#5A6577] hover:text-[#121826] dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-300'
                        }`}
                      >
                        {col.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-[#E4E7EC] pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] rounded-xl border border-[#D5DBE5] px-4 py-2 text-sm font-medium text-[#5A6577] transition-colors hover:bg-slate-50 hover:text-[#121826] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[40px] rounded-xl bg-[#1D63ED] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1550C8]"
              >
                {initialBook ? 'Save Changes' : 'Add Book'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <IsbnScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDetected={handleBarcodeDetected}
      />
    </>
  );
}
