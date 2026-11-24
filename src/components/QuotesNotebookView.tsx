import { useMemo, useState } from 'react';
import { Check, Copy, Download, Plus, Search, Trash2 } from 'lucide-react';
import type { Book, NoteEntry, NoteType } from '../types/bookly';
import { downloadQuoteCard } from '../utils/infographicCanvas';

interface QuotesNotebookViewProps {
  books: Book[];
  notes: NoteEntry[];
  onAddNote: (payload: {
    bookId: string;
    type: NoteType;
    content: string;
    term?: string;
    page?: number;
  }) => void;
  onDeleteNote: (noteId: string) => void;
}

type TypeFilter = 'all' | NoteType;

const TYPE_LABELS: Record<NoteType, string> = {
  quote: 'Quote',
  thought: 'Thought',
  vocab: 'Vocabulary',
};

export function QuotesNotebookView({
  books,
  notes,
  onAddNote,
  onDeleteNote,
}: QuotesNotebookViewProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [bookFilter, setBookFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add entry composer state
  const [showComposer, setShowComposer] = useState(false);
  const [newType, setNewType] = useState<NoteType>('quote');
  const [newBookId, setNewBookId] = useState(books[0]?.id ?? '');
  const [newTerm, setNewTerm] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPage, setNewPage] = useState('');
  const [formError, setFormError] = useState('');

  const bookMap = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);

  const counts = useMemo(() => {
    const res = { all: notes.length, quote: 0, thought: 0, vocab: 0 };
    for (const n of notes) res[n.type] += 1;
    return res;
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...notes]
      .filter((n) => {
        if (typeFilter !== 'all' && n.type !== typeFilter) return false;
        if (bookFilter !== 'all' && n.bookId !== bookFilter) return false;
        if (q) {
          const book = bookMap.get(n.bookId);
          return (
            n.content.toLowerCase().includes(q) ||
            (n.term && n.term.toLowerCase().includes(q)) ||
            (book && book.title.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [notes, typeFilter, bookFilter, searchQuery, bookMap]);

  const handleCopy = async (note: NoteEntry) => {
    const book = bookMap.get(note.bookId);
    const text =
      note.type === 'quote'
        ? `“${note.content}” — ${book?.title ?? 'Boi'}${book?.author ? ` by ${book.author}` : ''}`
        : note.type === 'vocab'
          ? `${note.term}: ${note.content}`
          : note.content;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(note.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard blocked in some headless contexts; still provide quiet state
      setCopiedId(note.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const targetBookId = newBookId || books[0]?.id;
    if (!targetBookId) {
      setFormError('Add a book to your library before saving a note.');
      return;
    }
    if (newType === 'vocab' && !newTerm.trim()) {
      setFormError('Please enter a vocabulary word.');
      return;
    }
    if (!newContent.trim()) {
      setFormError('Please enter your passage, note, or definition.');
      return;
    }
    const pageNum = newPage ? Number.parseInt(newPage, 10) : undefined;
    if (pageNum !== undefined && (!Number.isFinite(pageNum) || pageNum < 1)) {
      setFormError('Page number must be a positive integer.');
      return;
    }

    onAddNote({
      bookId: targetBookId,
      type: newType,
      content: newContent.trim(),
      term: newType === 'vocab' ? newTerm.trim() : undefined,
      page: pageNum,
    });
    setNewTerm('');
    setNewContent('');
    setNewPage('');
    setFormError('');
    setShowComposer(false);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Filter notebook entries by type"
          className="flex flex-wrap items-center gap-1 rounded-xl bg-[#ECEFF4] p-1 dark:bg-[#131B2E]"
        >
          {(
            [
              { id: 'all', label: 'All Entries' },
              { id: 'quote', label: 'Quotes' },
              { id: 'thought', label: 'Thoughts' },
              { id: 'vocab', label: 'Vocabulary' },
            ] as const
          ).map((tab) => {
            const active = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTypeFilter(tab.id)}
                className={`min-h-[38px] whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-white text-[#121826] shadow-xs dark:bg-[#1E293B] dark:text-slate-100'
                    : 'text-[#5A6577] hover:text-[#121826] dark:text-slate-400'
                }`}
              >
                {tab.label}{' '}
                <span className="font-mono tabular-nums opacity-70">{counts[tab.id]}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-56 sm:flex-none">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A6577] dark:text-slate-400"
              aria-hidden="true"
            />
            <label htmlFor="notebook-search" className="sr-only">
              Search quotes and notes
            </label>
            <input
              id="notebook-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search passages or words..."
              className="min-h-[40px] w-full rounded-xl border border-[#D5DBE5] bg-white pl-9 pr-3 text-sm text-[#121826] placeholder:text-slate-400 focus:border-[#1D63ED] focus:outline-none dark:border-slate-800 dark:bg-[#131B2E] dark:text-slate-100"
            />
          </div>

          <label htmlFor="notebook-book-filter" className="sr-only">
            Filter by book
          </label>
          <select
            id="notebook-book-filter"
            value={bookFilter}
            onChange={(e) => setBookFilter(e.target.value)}
            className="min-h-[40px] max-w-[180px] rounded-xl border border-[#D5DBE5] bg-white px-3 py-2 text-xs font-medium text-[#121826] focus:border-[#1D63ED] focus:outline-none dark:border-slate-800 dark:bg-[#131B2E] dark:text-slate-100"
          >
            <option value="all">All Books</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowComposer((v) => !v)}
            className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#1D63ED] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1550C8]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{showComposer ? 'Close Form' : 'New Entry'}</span>
          </button>
        </div>
      </div>

      {/* Inline Entry Composer */}
      {showComposer && (
        <form
          onSubmit={handleCreate}
          noValidate
          className="rounded-2xl border border-[#E4E7EC] bg-white p-6 dark:border-slate-800 dark:bg-[#131B2E]"
        >
          <h2 className="text-base font-semibold text-[#121826] dark:text-slate-100">
            Add to Reading Notebook
          </h2>
          {formError && (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
            >
              {formError}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="new-note-type"
                className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
              >
                Entry Type
              </label>
              <select
                id="new-note-type"
                value={newType}
                onChange={(e) => setNewType(e.target.value as NoteType)}
                className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3 py-2 text-sm text-[#121826] dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
              >
                <option value="quote">Quote</option>
                <option value="thought">Thought / Note</option>
                <option value="vocab">Vocabulary Word</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="new-note-book"
                className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
              >
                Book
              </label>
              <select
                id="new-note-book"
                value={newBookId || books[0]?.id || ''}
                onChange={(e) => setNewBookId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3 py-2 text-sm text-[#121826] dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="new-note-page"
                className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
              >
                Page # (Optional)
              </label>
              <input
                id="new-note-page"
                type="number"
                min={1}
                value={newPage}
                onChange={(e) => setNewPage(e.target.value)}
                placeholder="142"
                className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3 py-2 font-mono text-sm tabular-nums text-[#121826] dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
              />
            </div>

            {newType === 'vocab' && (
              <div className="sm:col-span-3">
                <label
                  htmlFor="new-note-term"
                  className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                >
                  Vocabulary Word
                </label>
                <input
                  id="new-note-term"
                  type="text"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  placeholder="e.g., Mellifluous"
                  className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2 text-sm text-[#121826] dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
                />
              </div>
            )}

            <div className="sm:col-span-3">
              <label
                htmlFor="new-note-content"
                className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
              >
                {newType === 'quote'
                  ? 'Quote Text'
                  : newType === 'vocab'
                    ? 'Definition'
                    : 'Thought / Note'}
              </label>
              <textarea
                id="new-note-content"
                rows={3}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write here..."
                className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3.5 py-2.5 text-sm text-[#121826] dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowComposer(false)}
              className="min-h-[38px] rounded-xl border border-[#D5DBE5] px-4 py-1.5 text-xs font-medium text-[#5A6577] dark:border-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[38px] rounded-xl bg-[#1D63ED] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1550C8]"
            >
              Save Entry
            </button>
          </div>
        </form>
      )}

      {/* Entries Grid */}
      {filteredNotes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D5DBE5] bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-[#131B2E]">
          <h3 className="font-editorial text-lg font-semibold text-[#121826] dark:text-slate-100">
            No notebook entries found
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-[#5A6577] dark:text-slate-400">
            Capture memorable quotes, thoughts, and vocabulary words while reading or add one above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredNotes.map((entry) => {
            const book = bookMap.get(entry.bookId);
            return (
              <article
                key={entry.id}
                className="flex flex-col justify-between rounded-2xl border border-[#E4E7EC] bg-white p-5 dark:border-slate-800 dark:bg-[#131B2E]"
              >
                <div>
                  <p className="text-xs text-[#5A6577] dark:text-slate-400">
                    {TYPE_LABELS[entry.type]}
                    {book ? ` · ${book.title}` : ''}
                    {entry.page ? ` · p. ${entry.page}` : ''}
                  </p>

                  {entry.type === 'vocab' && entry.term && (
                    <h3 className="mt-2 font-editorial text-lg font-semibold text-[#121826] dark:text-slate-100">
                      {entry.term}
                    </h3>
                  )}

                  <p
                    className={`mt-2 text-sm leading-relaxed text-[#121826] dark:text-slate-100 ${
                      entry.type === 'quote'
                        ? 'font-editorial text-base italic leading-relaxed'
                        : ''
                    }`}
                  >
                    {entry.type === 'quote' ? `“${entry.content}”` : entry.content}
                  </p>

                  {book && (
                    <p className="mt-3 text-xs text-[#5A6577] dark:text-slate-400">
                      — {book.author}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-end gap-1 border-t border-[#F0F2F5] pt-3 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleCopy(entry)}
                    aria-label={`Copy ${entry.type} from ${book?.title ?? 'book'}`}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-[#5A6577] hover:bg-slate-100 hover:text-[#121826] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    {copiedId === entry.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  {entry.type === 'quote' && (
                    <button
                      type="button"
                      onClick={() => downloadQuoteCard(entry, book)}
                      aria-label={`Download quote card for ${book?.title ?? 'quote'}`}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-[#1D63ED] hover:bg-[#EEF4FF] dark:text-[#60A5FA] dark:hover:bg-[#1D63ED]/15"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Quote Card</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onDeleteNote(entry.id)}
                    aria-label={`Delete ${entry.type}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#5A6577] hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
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
