import { useMemo, useState } from 'react';
import { Award, Flame, Plus, Trash2 } from 'lucide-react';
import type { Book, NoteEntry, Readathon, ReadingGoals, ReadingSession } from '../types/bookly';
import {
  addDaysToDateKey,
  calculateDailyProgress,
  calculateMonthlyProgress,
  calculateReadathonProgress,
  calculateStreak,
  calculateYearlyBooksProgress,
  computeAchievements,
  formatShortDate,
  getDailyActivitySeries,
  getDateKey,
} from '../utils/readingStats';

interface GoalsViewProps {
  books: Book[];
  sessions: ReadingSession[];
  notes: NoteEntry[];
  goals: ReadingGoals;
  readathons: Readathon[];
  onUpdateGoals: (nextGoals: ReadingGoals) => void;
  onAddReadathon: (readathon: Omit<Readathon, 'id'>) => void;
  onDeleteReadathon: (id: string) => void;
}

export function GoalsView({
  books,
  sessions,
  notes,
  goals,
  readathons,
  onUpdateGoals,
  onAddReadathon,
  onDeleteReadathon,
}: GoalsViewProps) {
  const todayKey = getDateKey();
  const daily = useMemo(() => calculateDailyProgress(sessions, goals, todayKey), [sessions, goals, todayKey]);
  const monthly = useMemo(() => calculateMonthlyProgress(sessions, goals, todayKey), [sessions, goals, todayKey]);
  const yearly = useMemo(() => calculateYearlyBooksProgress(books, goals, todayKey), [books, goals, todayKey]);
  const streak = useMemo(() => calculateStreak(sessions, todayKey), [sessions, todayKey]);
  const heatmapDays = useMemo(() => getDailyActivitySeries(sessions, 28, todayKey), [sessions, todayKey]);
  const achievements = useMemo(
    () => computeAchievements({ books, sessions, notes }, todayKey),
    [books, sessions, notes, todayKey]
  );

  // Goal edit state
  const [editingGoals, setEditingGoals] = useState(false);
  const [dailyInput, setDailyInput] = useState(String(goals.dailyMinutes));
  const [monthlyInput, setMonthlyInput] = useState(String(goals.monthlyHours));
  const [yearlyInput, setYearlyInput] = useState(String(goals.yearlyBooks));
  const [goalError, setGoalError] = useState('');

  // Readathon composer state
  const [showReadathonForm, setShowReadathonForm] = useState(false);
  const [rName, setRName] = useState('');
  const [rType, setRType] = useState<'minutes' | 'pages'>('minutes');
  const [rTarget, setRTarget] = useState('180');
  const [rDays, setRDays] = useState('7');
  const [rError, setRError] = useState('');

  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault();
    const d = Number.parseInt(dailyInput, 10);
    const m = Number.parseInt(monthlyInput, 10);
    const y = Number.parseInt(yearlyInput, 10);
    if (!Number.isFinite(d) || d < 5 || !Number.isFinite(m) || m < 1 || !Number.isFinite(y) || y < 1) {
      setGoalError('Enter valid positive targets (daily goal at least 5 minutes).');
      return;
    }
    onUpdateGoals({ dailyMinutes: d, monthlyHours: m, yearlyBooks: y });
    setGoalError('');
    setEditingGoals(false);
  };

  const handleCreateReadathon = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = rName.trim();
    const targetVal = Number.parseInt(rTarget, 10);
    const durationDays = Number.parseInt(rDays, 10);

    if (!trimmed) {
      setRError('Enter a name for your readathon challenge.');
      return;
    }
    if (!Number.isFinite(targetVal) || targetVal <= 0) {
      setRError('Target value must be greater than zero.');
      return;
    }
    if (!Number.isFinite(durationDays) || durationDays < 1) {
      setRError('Duration must be at least 1 day.');
      return;
    }

    onAddReadathon({
      name: trimmed,
      targetType: rType,
      targetValue: targetVal,
      startDate: todayKey,
      endDate: addDaysToDateKey(todayKey, durationDays - 1),
    });
    setRName('');
    setRTarget('180');
    setRDays('7');
    setRError('');
    setShowReadathonForm(false);
  };

  // Daily goal SVG ring math
  const ringRadius = 46;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - daily.percent / 100);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-6">
      {/* Top Row: Daily Goal Ring + Monthly/Yearly Goals + Streak Heatmap */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Reading Goals Card */}
        <section className="rounded-2xl border border-[#E4E7EC] bg-white p-6 lg:col-span-7 dark:border-slate-800 dark:bg-[#131B2E]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#121826] dark:text-slate-100">
                Reading Goals
              </h2>
              <p className="mt-0.5 text-xs text-[#5A6577] dark:text-slate-400">
                Daily habit ring plus monthly and yearly milestones.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDailyInput(String(goals.dailyMinutes));
                setMonthlyInput(String(goals.monthlyHours));
                setYearlyInput(String(goals.yearlyBooks));
                setGoalError('');
                setEditingGoals((v) => !v);
              }}
              className="min-h-[38px] whitespace-nowrap rounded-xl border border-[#D5DBE5] px-3.5 py-1.5 text-xs font-medium text-[#121826] hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {editingGoals ? 'Close Editor' : 'Edit Goals'}
            </button>
          </div>

          {editingGoals ? (
            <form onSubmit={handleSaveGoals} noValidate className="mt-5 space-y-4">
              {goalError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                >
                  {goalError}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="goal-daily-minutes"
                    className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                  >
                    Daily Target (min)
                  </label>
                  <input
                    id="goal-daily-minutes"
                    type="number"
                    min={5}
                    value={dailyInput}
                    onChange={(e) => setDailyInput(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3 py-2 font-mono text-sm tabular-nums text-[#121826] dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="goal-monthly-hours"
                    className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                  >
                    Monthly Target (hrs)
                  </label>
                  <input
                    id="goal-monthly-hours"
                    type="number"
                    min={1}
                    value={monthlyInput}
                    onChange={(e) => setMonthlyInput(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3 py-2 font-mono text-sm tabular-nums text-[#121826] dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="goal-yearly-books"
                    className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                  >
                    Yearly Books
                  </label>
                  <input
                    id="goal-yearly-books"
                    type="number"
                    min={1}
                    value={yearlyInput}
                    onChange={(e) => setYearlyInput(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#D5DBE5] bg-white px-3 py-2 font-mono text-sm tabular-nums text-[#121826] dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="min-h-[40px] rounded-xl bg-[#1D63ED] px-5 py-2 text-xs font-semibold text-white hover:bg-[#1550C8]"
                >
                  Save Goals
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-6 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              {/* SVG Daily Ring */}
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <svg className="h-28 w-28 -rotate-90" viewBox="0 0 112 112" aria-hidden="true">
                  <circle
                    cx="56"
                    cy="56"
                    r={ringRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="9"
                    className="text-slate-100 dark:text-slate-800"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r={ringRadius}
                    fill="none"
                    stroke={daily.goalMet ? '#16A34A' : '#1D63ED'}
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-xl font-semibold tabular-nums text-[#121826] dark:text-slate-100">
                    {daily.percent}%
                  </span>
                  <span className="text-[11px] text-[#5A6577] dark:text-slate-400">Today</span>
                </div>
              </div>

              <div className="w-full flex-1 space-y-4">
                <div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-medium text-[#121826] dark:text-slate-200">
                      Daily Goal
                    </span>
                    <span className="font-mono tabular-nums text-[#5A6577] dark:text-slate-400">
                      {daily.minutesToday} / {daily.targetMinutes} min
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#5A6577] dark:text-slate-400">
                    {daily.goalMet
                      ? 'Goal completed for today.'
                      : `${Math.max(1, daily.targetMinutes - daily.minutesToday)} minutes remaining today · ${daily.pagesToday} pages logged`}
                  </p>
                </div>

                <div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-medium text-[#121826] dark:text-slate-200">
                      Monthly Hours
                    </span>
                    <span className="font-mono tabular-nums text-[#5A6577] dark:text-slate-400">
                      {monthly.hoursThisMonth} / {monthly.targetHours} hrs ({monthly.percent}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-[#1D63ED]"
                      style={{ width: `${monthly.percent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-medium text-[#121826] dark:text-slate-200">
                      Yearly Books
                    </span>
                    <span className="font-mono tabular-nums text-[#5A6577] dark:text-slate-400">
                      {yearly.booksFinishedThisYear} / {yearly.targetBooks} books ({yearly.percent}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${yearly.percent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Streak & 28-Day Heatmap */}
        <section className="rounded-2xl border border-[#E4E7EC] bg-white p-6 lg:col-span-5 dark:border-slate-800 dark:bg-[#131B2E]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#121826] dark:text-slate-100">
                Reading Streak
              </h2>
              <p className="mt-0.5 text-xs text-[#5A6577] dark:text-slate-400">
                Last 28 days of reading consistency
              </p>
            </div>
            <Flame className="h-5 w-5 text-amber-500" aria-hidden="true" />
          </div>

          <div className="mt-4 flex items-baseline gap-6">
            <div>
              <p className="font-mono text-3xl font-semibold tabular-nums text-[#121826] dark:text-slate-100">
                {streak.currentStreak}
              </p>
              <p className="text-xs text-[#5A6577] dark:text-slate-400">Current days</p>
            </div>
            <div className="h-8 w-px bg-[#E4E7EC] dark:bg-slate-800" aria-hidden="true" />
            <div>
              <p className="font-mono text-3xl font-semibold tabular-nums text-[#121826] dark:text-slate-100">
                {streak.longestStreak}
              </p>
              <p className="text-xs text-[#5A6577] dark:text-slate-400">Longest streak</p>
            </div>
          </div>

          <div
            aria-label="28-day reading activity calendar"
            className="mt-5 grid grid-cols-7 gap-2"
          >
            {heatmapDays.map((day) => {
              const intensity =
                day.minutes === 0
                  ? 'bg-slate-100 dark:bg-slate-800/80'
                  : day.minutes < 20
                    ? 'bg-[#BFDBFE] dark:bg-[#1D63ED]/40'
                    : day.minutes < 45
                      ? 'bg-[#60A5FA] dark:bg-[#1D63ED]/75'
                      : 'bg-[#1D63ED] dark:bg-[#3B82F6]';
              return (
                <div
                  key={day.dateKey}
                  title={`${formatShortDate(day.dateKey)}: ${day.minutes}m · ${day.pages} pages`}
                  className={`flex aspect-square items-center justify-center rounded-lg font-mono text-[10px] tabular-nums ${intensity} ${
                    day.minutes >= 45
                      ? 'text-white'
                      : 'text-[#5A6577] dark:text-slate-300'
                  }`}
                >
                  {day.dateKey.slice(8)}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Readathons Section */}
      <section className="rounded-2xl border border-[#E4E7EC] bg-white p-6 dark:border-slate-800 dark:bg-[#131B2E]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#121826] dark:text-slate-100">
              Readathons & Reading Sprints
            </h2>
            <p className="mt-0.5 text-xs text-[#5A6577] dark:text-slate-400">
              Focused time-boxed challenges that update automatically from your sessions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowReadathonForm((v) => !v)}
            className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#1D63ED] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1550C8]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{showReadathonForm ? 'Close' : 'New Readathon'}</span>
          </button>
        </div>

        {showReadathonForm && (
          <form
            onSubmit={handleCreateReadathon}
            noValidate
            className="mt-5 rounded-xl border border-[#E4E7EC] bg-[#F7F8FA] p-4 dark:border-slate-800 dark:bg-[#0B1120]"
          >
            {rError && (
              <p role="alert" className="mb-3 text-xs font-medium text-red-600 dark:text-red-400">
                {rError}
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="readathon-name"
                  className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                >
                  Challenge Name
                </label>
                <input
                  id="readathon-name"
                  type="text"
                  value={rName}
                  onChange={(e) => setRName(e.target.value)}
                  placeholder="e.g., Cozy Weekend 200-Page Sprint"
                  className="mt-1 w-full rounded-xl border border-[#D5DBE5] bg-white px-3 py-2 text-sm text-[#121826] dark:border-slate-700 dark:bg-[#131B2E] dark:text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="readathon-type"
                  className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                >
                  Measure By
                </label>
                <select
                  id="readathon-type"
                  value={rType}
                  onChange={(e) => setRType(e.target.value as 'minutes' | 'pages')}
                  className="mt-1 w-full rounded-xl border border-[#D5DBE5] bg-white px-3 py-2 text-sm text-[#121826] dark:border-slate-700 dark:bg-[#131B2E] dark:text-slate-100"
                >
                  <option value="minutes">Minutes</option>
                  <option value="pages">Pages</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="readathon-target"
                    className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                  >
                    Target
                  </label>
                  <input
                    id="readathon-target"
                    type="number"
                    min={1}
                    value={rTarget}
                    onChange={(e) => setRTarget(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#D5DBE5] bg-white px-2.5 py-2 font-mono text-sm tabular-nums text-[#121826] dark:border-slate-700 dark:bg-[#131B2E] dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="readathon-days"
                    className="block text-xs font-medium text-[#5A6577] dark:text-slate-400"
                  >
                    Days
                  </label>
                  <input
                    id="readathon-days"
                    type="number"
                    min={1}
                    max={90}
                    value={rDays}
                    onChange={(e) => setRDays(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#D5DBE5] bg-white px-2.5 py-2 font-mono text-sm tabular-nums text-[#121826] dark:border-slate-700 dark:bg-[#131B2E] dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                className="min-h-[38px] rounded-xl bg-[#121826] px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-[#121826]"
              >
                Create Readathon
              </button>
            </div>
          </form>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {readathons.length === 0 ? (
            <p className="text-sm text-[#5A6577] dark:text-slate-400">
              No active readathons yet. Create a weekend sprint to challenge yourself.
            </p>
          ) : (
            readathons.map((r) => {
              const prog = calculateReadathonProgress(r, sessions);
              const unit = r.targetType === 'minutes' ? 'min' : 'pages';
              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-[#E4E7EC] p-4 dark:border-slate-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#5A6577] dark:text-slate-400">
                        {formatShortDate(r.startDate)} – {formatShortDate(r.endDate)}
                        {prog.completed ? ' · Completed' : ''}
                      </p>
                      <h3 className="mt-1 font-editorial text-base font-semibold text-[#121826] dark:text-slate-100">
                        {r.name}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteReadathon(r.id)}
                      aria-label={`Delete readathon ${r.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5A6577] hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between font-mono text-xs tabular-nums">
                    <span className="text-[#121826] dark:text-slate-200">
                      {prog.currentValue} / {prog.targetValue} {unit}
                    </span>
                    <span className={prog.completed ? 'font-semibold text-emerald-600' : 'text-[#5A6577] dark:text-slate-400'}>
                      {prog.percent}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${prog.completed ? 'bg-emerald-600' : 'bg-[#1D63ED]'}`}
                      style={{ width: `${prog.percent}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Achievements & Milestones */}
      <section className="rounded-2xl border border-[#E4E7EC] bg-white p-6 dark:border-slate-800 dark:bg-[#131B2E]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#121826] dark:text-slate-100">
              Milestones & Achievements
            </h2>
            <p className="mt-0.5 text-xs text-[#5A6577] dark:text-slate-400">
              {unlockedCount} of {achievements.length} milestones unlocked from your reading log.
            </p>
          </div>
          <Award className="h-5 w-5 text-[#1D63ED] dark:text-[#60A5FA]" aria-hidden="true" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-4 ${
                item.unlocked
                  ? 'border-[#1D63ED]/30 bg-[#EEF4FF]/60 dark:border-[#1D63ED]/40 dark:bg-[#1D63ED]/10'
                  : 'border-[#E4E7EC] bg-[#F7F8FA]/60 opacity-75 dark:border-slate-800 dark:bg-[#0B1120]'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-[#121826] dark:text-slate-100">
                  {item.title}
                </h3>
                <span
                  className={`font-mono text-[11px] font-medium tabular-nums ${
                    item.unlocked
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-[#5A6577] dark:text-slate-400'
                  }`}
                >
                  {item.unlocked ? 'Unlocked' : item.progressLabel}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[#5A6577] dark:text-slate-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
