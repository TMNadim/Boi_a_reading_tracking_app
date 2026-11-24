import { useMemo, useRef, useState } from 'react';
import { Download, RotateCcw, Trash2, Upload } from 'lucide-react';
import type { Book, BooklyState, ReadingSession } from '../types/bookly';
import { downloadReadingInfographic } from '../utils/infographicCanvas';
import {
  calculateGlobalAverageSpeed,
  calculateSpeedPagesPerHour,
  calculateStreak,
  formatMinutesReadable,
  formatShortDate,
  getDailyActivitySeries,
  getDateKey,
  getGenreBreakdown,
} from '../utils/readingStats';

interface StatsViewProps {
  state: BooklyState;
  onDeleteSession: (sessionId: string) => void;
  onImportState: (nextState: BooklyState) => void;
  onResetDemoData: () => void;
}

export function StatsView({
  state,
  onDeleteSession,
  onImportState,
  onResetDemoData,
}: StatsViewProps) {
  const [rangeDays, setRangeDays] = useState<7 | 30>(7);
  const [metric, setMetric] = useState<'minutes' | 'pages'>('minutes');
  const [statusMessage, setStatusMessage] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayKey = getDateKey();
  const bookMap = useMemo(() => new Map<string, Book>(state.books.map((b) => [b.id, b])), [state.books]);

  const totals = useMemo(() => {
    const totalSeconds = state.sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
    const totalMinutes = Math.round(totalSeconds / 60);
    const totalPages = state.sessions.reduce((acc, s) => acc + Math.max(0, s.pagesRead), 0);
    const booksFinished = state.books.filter((b) => b.shelf === 'finished').length;
    const avgSpeed = calculateGlobalAverageSpeed(state.sessions);
    const streak = calculateStreak(state.sessions, todayKey);
    return {
      totalMinutes,
      totalPages,
      booksFinished,
      avgSpeed,
      currentStreak: streak.currentStreak,
    };
  }, [state.books, state.sessions, todayKey]);

  const series = useMemo(
    () => getDailyActivitySeries(state.sessions, rangeDays, todayKey),
    [state.sessions, rangeDays, todayKey]
  );

  const maxBarValue = useMemo(() => {
    const values = series.map((p) => (metric === 'minutes' ? p.minutes : p.pages));
    return Math.max(10, ...values);
  }, [series, metric]);

  const genres = useMemo(
    () => getGenreBreakdown(state.books, state.sessions),
    [state.books, state.sessions]
  );

  const sortedSessions = useMemo<ReadingSession[]>(
    () => [...state.sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [state.sessions]
  );

  const topBook = useMemo(() => {
    const minutesByBook = new Map<string, number>();
    for (const s of state.sessions) {
      minutesByBook.set(s.bookId, (minutesByBook.get(s.bookId) ?? 0) + s.durationSeconds);
    }
    let bestId = '';
    let bestVal = 0;
    for (const [id, secs] of minutesByBook.entries()) {
      if (secs > bestVal) {
        bestVal = secs;
        bestId = id;
      }
    }
    return bookMap.get(bestId) ?? state.books[0];
  }, [state.sessions, state.books, bookMap]);

  const handleDownloadInfographic = () => {
    downloadReadingInfographic({
      totalMinutes: totals.totalMinutes,
      totalPages: totals.totalPages,
      booksFinished: totals.booksFinished,
      currentStreak: totals.currentStreak,
      avgSpeed: totals.avgSpeed,
      topBookTitle: topBook?.title,
      topBookAuthor: topBook?.author,
      dateLabel: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    });
    setStatusMessage('Reading infographic PNG downloaded.');
    window.setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boi-backup-${todayKey}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Library backup exported as JSON.');
    window.setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as BooklyState;
        if (!Array.isArray(parsed.books) || !Array.isArray(parsed.sessions)) {
          setStatusMessage('Invalid backup file format.');
          return;
        }
        onImportState(parsed);
        setStatusMessage('Backup restored successfully.');
      } catch {
        setStatusMessage('Could not parse JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div
          role="status"
          className="rounded-xl border border-[#1D63ED]/25 bg-[#EEF4FF] px-4 py-2.5 text-xs font-medium text-[#1D63ED] dark:bg-[#1D63ED]/15 dark:text-[#60A5FA]"
        >
          {statusMessage}
        </div>
      )}

      {/* Top KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E4E7EC] bg-white p-5 dark:border-slate-800 dark:bg-[#131B2E]">
          <p className="text-xs text-[#5A6577] dark:text-slate-400">Total Time Read</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#121826] dark:text-slate-100">
            {formatMinutesReadable(totals.totalMinutes)}
          </p>
          <p className="mt-1 text-xs text-[#5A6577] dark:text-slate-400">
            {state.sessions.length} sessions logged
          </p>
        </div>

        <div className="rounded-2xl border border-[#E4E7EC] bg-white p-5 dark:border-slate-800 dark:bg-[#131B2E]">
          <p className="text-xs text-[#5A6577] dark:text-slate-400">Pages Read</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#121826] dark:text-slate-100">
            {totals.totalPages.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[#5A6577] dark:text-slate-400">
            Across {state.books.length} books
          </p>
        </div>

        <div className="rounded-2xl border border-[#E4E7EC] bg-white p-5 dark:border-slate-800 dark:bg-[#131B2E]">
          <p className="text-xs text-[#5A6577] dark:text-slate-400">Average Speed</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#121826] dark:text-slate-100">
            {totals.avgSpeed} <span className="text-sm font-normal">pg/hr</span>
          </p>
          <p className="mt-1 text-xs text-[#5A6577] dark:text-slate-400">
            All timed sessions
          </p>
        </div>

        <div className="rounded-2xl border border-[#E4E7EC] bg-white p-5 dark:border-slate-800 dark:bg-[#131B2E]">
          <p className="text-xs text-[#5A6577] dark:text-slate-400">Books Finished</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#121826] dark:text-slate-100">
            {totals.booksFinished}
          </p>
          <p className="mt-1 text-xs text-[#5A6577] dark:text-slate-400">
            {totals.currentStreak} day current streak
          </p>
        </div>
      </div>

      {/* Charts & Shareable Infographic Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Reading Activity Bar Chart */}
        <section className="rounded-2xl border border-[#E4E7EC] bg-white p-6 lg:col-span-8 dark:border-slate-800 dark:bg-[#131B2E]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#121826] dark:text-slate-100">
                Reading Activity
              </h2>
              <p className="mt-0.5 text-xs text-[#5A6577] dark:text-slate-400">
                Daily {metric === 'minutes' ? 'minutes read' : 'pages turned'} over the last {rangeDays} days
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl bg-[#ECEFF4] p-1 dark:bg-[#0B1120]">
                <button
                  type="button"
                  onClick={() => setMetric('minutes')}
                  className={`min-h-[32px] rounded-lg px-2.5 text-xs font-medium ${
                    metric === 'minutes'
                      ? 'bg-white text-[#121826] shadow-xs dark:bg-[#1E293B] dark:text-slate-100'
                      : 'text-[#5A6577] dark:text-slate-400'
                  }`}
                >
                  Minutes
                </button>
                <button
                  type="button"
                  onClick={() => setMetric('pages')}
                  className={`min-h-[32px] rounded-lg px-2.5 text-xs font-medium ${
                    metric === 'pages'
                      ? 'bg-white text-[#121826] shadow-xs dark:bg-[#1E293B] dark:text-slate-100'
                      : 'text-[#5A6577] dark:text-slate-400'
                  }`}
                >
                  Pages
                </button>
              </div>

              <div className="flex items-center gap-1 rounded-xl bg-[#ECEFF4] p-1 dark:bg-[#0B1120]">
                <button
                  type="button"
                  onClick={() => setRangeDays(7)}
                  className={`min-h-[32px] rounded-lg px-2.5 text-xs font-medium ${
                    rangeDays === 7
                      ? 'bg-white text-[#121826] shadow-xs dark:bg-[#1E293B] dark:text-slate-100'
                      : 'text-[#5A6577] dark:text-slate-400'
                  }`}
                >
                  7D
                </button>
                <button
                  type="button"
                  onClick={() => setRangeDays(30)}
                  className={`min-h-[32px] rounded-lg px-2.5 text-xs font-medium ${
                    rangeDays === 30
                      ? 'bg-white text-[#121826] shadow-xs dark:bg-[#1E293B] dark:text-slate-100'
                      : 'text-[#5A6577] dark:text-slate-400'
                  }`}
                >
                  30D
                </button>
              </div>
            </div>
          </div>

          {/* Clean Responsive Bar Chart */}
          <div className="mt-6 flex h-52 items-end gap-1 sm:gap-2">
            {series.map((point, index) => {
              const value = metric === 'minutes' ? point.minutes : point.pages;
              const pct = Math.max(value > 0 ? 6 : 2, Math.round((value / maxBarValue) * 100));
              const showLabel = rangeDays === 7 || index % 5 === 0 || index === series.length - 1;
              return (
                <div
                  key={point.dateKey}
                  className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                >
                  <div className="flex h-full w-full items-end justify-center">
                    <div
                      title={`${formatShortDate(point.dateKey)}: ${point.minutes}m · ${point.pages} pages`}
                      className={`w-full max-w-[38px] rounded-t-md transition-colors ${
                        value > 0
                          ? 'bg-[#1D63ED] group-hover:bg-[#1550C8] dark:bg-[#3B82F6]'
                          : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <div className="relative mt-2 h-4 w-full">
                    {showLabel && (
                      <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] tabular-nums text-[#5A6577] dark:text-slate-400">
                        {point.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Shareable Reading Infographic Card */}
        <section className="flex flex-col justify-between rounded-2xl border border-[#E4E7EC] bg-[#121826] p-6 text-white lg:col-span-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-medium text-[#94A3B8]">
              Shareable Reading Infographic
            </p>
            <h2 className="mt-1 font-editorial text-2xl font-semibold text-white">
              Your Reading Snapshot
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">
              Export a clean Boi report card summarizing your hours, pages, streak, and top book.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 border-y border-white/10 py-4 font-mono tabular-nums">
              <div>
                <p className="text-[11px] text-[#94A3B8]">Time Read</p>
                <p className="mt-0.5 text-lg font-semibold">
                  {formatMinutesReadable(totals.totalMinutes)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#94A3B8]">Pages</p>
                <p className="mt-0.5 text-lg font-semibold">
                  {totals.totalPages}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#94A3B8]">Avg Speed</p>
                <p className="mt-0.5 text-lg font-semibold">
                  {totals.avgSpeed} pg/h
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#94A3B8]">Streak</p>
                <p className="mt-0.5 text-lg font-semibold">
                  {totals.currentStreak}d
                </p>
              </div>
            </div>

            {topBook && (
              <p className="mt-4 truncate text-xs text-[#CBD5E1]">
                Most read: <span className="font-semibold text-white">{topBook.title}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleDownloadInfographic}
            className="mt-6 inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-[#1D63ED] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#1550C8]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Download Infographic PNG</span>
          </button>
        </section>
      </div>

      {/* Genre Breakdown & Recent Sessions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-[#E4E7EC] bg-white p-6 lg:col-span-4 dark:border-slate-800 dark:bg-[#131B2E]">
          <h2 className="text-lg font-semibold text-[#121826] dark:text-slate-100">
            Genre Distribution
          </h2>
          <p className="mt-0.5 text-xs text-[#5A6577] dark:text-slate-400">
            Share of total reading time by genre
          </p>

          <div className="mt-5 space-y-3.5">
            {genres.length === 0 ? (
              <p className="text-sm text-[#5A6577] dark:text-slate-400">No genres tracked yet.</p>
            ) : (
              genres.map((g) => (
                <div key={g.genre}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-medium text-[#121826] dark:text-slate-200">
                      {g.genre}
                    </span>
                    <span className="font-mono tabular-nums text-[#5A6577] dark:text-slate-400">
                      {formatMinutesReadable(g.minutes)} · {g.percent}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-[#1D63ED]"
                      style={{ width: `${Math.max(g.percent, g.minutes > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent Reading Sessions Table */}
        <section className="rounded-2xl border border-[#E4E7EC] bg-white p-6 lg:col-span-8 dark:border-slate-800 dark:bg-[#131B2E]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#121826] dark:text-slate-100">
                Reading Sessions Log
              </h2>
              <p className="mt-0.5 text-xs text-[#5A6577] dark:text-slate-400">
                Complete history of timed and manually logged sessions.
              </p>
            </div>
          </div>

          {sortedSessions.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#5A6577] dark:text-slate-400">
              No reading sessions recorded yet. Start the timer to log your first session.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E4E7EC] text-xs font-medium text-[#5A6577] dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2.5 pr-4">Date</th>
                    <th className="py-2.5 pr-4">Book</th>
                    <th className="py-2.5 pr-4 text-right">Duration</th>
                    <th className="py-2.5 pr-4 text-right">Pages</th>
                    <th className="py-2.5 pr-4 text-right">Pace</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F2F5] dark:divide-slate-800/80">
                  {sortedSessions.slice(0, 12).map((session) => {
                    const book = bookMap.get(session.bookId);
                    const speed = calculateSpeedPagesPerHour(
                      session.pagesRead,
                      session.durationSeconds
                    );
                    return (
                      <tr
                        key={session.id}
                        className="transition-colors hover:bg-[#F7F8FA] dark:hover:bg-slate-800/40"
                      >
                        <td className="whitespace-nowrap py-3 pr-4 font-mono text-xs tabular-nums text-[#5A6577] dark:text-slate-400">
                          {formatShortDate(session.date)}
                        </td>
                        <td className="py-3 pr-4">
                          <p className="max-w-[200px] truncate font-medium text-[#121826] dark:text-slate-100">
                            {book?.title ?? 'Removed Book'}
                          </p>
                          {session.mood && (
                            <p className="text-xs capitalize text-[#5A6577] dark:text-slate-400">
                              {session.mood}
                            </p>
                          )}
                        </td>
                        <td className="whitespace-nowrap py-3 pr-4 text-right font-mono text-xs tabular-nums text-[#121826] dark:text-slate-200">
                          {formatMinutesReadable(session.durationSeconds / 60)}
                        </td>
                        <td className="whitespace-nowrap py-3 pr-4 text-right font-mono text-xs tabular-nums text-[#121826] dark:text-slate-200">
                          +{session.pagesRead}
                        </td>
                        <td className="whitespace-nowrap py-3 pr-4 text-right font-mono text-xs tabular-nums text-[#5A6577] dark:text-slate-400">
                          {speed} pg/h
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onDeleteSession(session.id)}
                            aria-label={`Delete reading session on ${session.date}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#5A6577] hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Local Data Backup & Restore Strip */}
      <section className="flex flex-col gap-4 rounded-2xl border border-[#E4E7EC] bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-[#131B2E]">
        <div>
          <h2 className="text-sm font-semibold text-[#121826] dark:text-slate-100">
            Data Backup & Portability
          </h2>
          <p className="mt-0.5 text-xs text-[#5A6577] dark:text-slate-400">
            Your library, sessions, and quotes are saved locally in this browser.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#D5DBE5] px-3.5 py-1.5 text-xs font-medium text-[#121826] hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Export JSON</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportJson}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#D5DBE5] px-3.5 py-1.5 text-xs font-medium text-[#121826] hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Import JSON</span>
          </button>

          {confirmReset ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetDemoData();
                  setConfirmReset(false);
                  setStatusMessage('Demo library restored.');
                }}
                className="min-h-[38px] rounded-xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="min-h-[38px] rounded-xl border border-[#D5DBE5] px-3 py-1.5 text-xs font-medium text-[#5A6577] dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium text-[#5A6577] hover:bg-slate-100 hover:text-[#121826] dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset Demo Data</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
