import type { Book, BooklyState, Readathon, ReadingGoals, ReadingSession } from '../types/bookly';

export function getDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return getDateKey(dt);
}

export function formatTimerClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

export function formatMinutesReadable(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  if (safe < 60) return `${safe}m`;
  const hrs = Math.floor(safe / 60);
  const mins = safe % 60;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function formatShortDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function calculateBookProgress(book: Pick<Book, 'currentPage' | 'totalPages'>): {
  percent: number;
  pagesRemaining: number;
} {
  if (book.totalPages <= 0) {
    return { percent: 0, pagesRemaining: 0 };
  }
  const clamped = Math.min(Math.max(0, book.currentPage), book.totalPages);
  const percent =
    clamped >= book.totalPages
      ? 100
      : Math.min(99, Math.round((clamped / book.totalPages) * 100));
  return {
    percent,
    pagesRemaining: Math.max(0, book.totalPages - clamped),
  };
}

export function calculateSpeedPagesPerHour(pagesRead: number, durationSeconds: number): number {
  if (pagesRead <= 0 || durationSeconds <= 0) return 0;
  const hours = durationSeconds / 3600;
  return Math.round((pagesRead / hours) * 10) / 10;
}

export function calculateBookStats(
  bookId: string,
  sessions: ReadingSession[]
): {
  totalSeconds: number;
  totalMinutes: number;
  totalPagesLogged: number;
  sessionCount: number;
  pagesPerHour: number;
} {
  const bookSessions = sessions.filter((s) => s.bookId === bookId);
  const totalSeconds = bookSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const totalPagesLogged = bookSessions.reduce((acc, s) => acc + Math.max(0, s.pagesRead), 0);
  return {
    totalSeconds,
    totalMinutes: Math.round(totalSeconds / 60),
    totalPagesLogged,
    sessionCount: bookSessions.length,
    pagesPerHour: calculateSpeedPagesPerHour(totalPagesLogged, totalSeconds),
  };
}

export function calculateGlobalAverageSpeed(sessions: ReadingSession[]): number {
  const totalSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const totalPages = sessions.reduce((acc, s) => acc + Math.max(0, s.pagesRead), 0);
  return calculateSpeedPagesPerHour(totalPages, totalSeconds);
}

export function estimateTimeToFinishMinutes(
  book: Book,
  sessions: ReadingSession[],
  fallbackSpeedPagesPerHour = 35
): number | null {
  const { pagesRemaining } = calculateBookProgress(book);
  if (pagesRemaining <= 0) return 0;

  const bookStats = calculateBookStats(book.id, sessions);
  const globalSpeed = calculateGlobalAverageSpeed(sessions);
  const effectiveSpeed =
    bookStats.pagesPerHour > 0
      ? bookStats.pagesPerHour
      : globalSpeed > 0
        ? globalSpeed
        : fallbackSpeedPagesPerHour;

  if (effectiveSpeed <= 0) return null;
  return Math.round((pagesRemaining / effectiveSpeed) * 60);
}

export function calculateStreak(
  sessions: ReadingSession[],
  todayKey: string = getDateKey()
): {
  currentStreak: number;
  longestStreak: number;
  readToday: boolean;
  activeDateSet: Set<string>;
} {
  const activeDates = Array.from(
    new Set(sessions.filter((s) => s.durationSeconds > 0).map((s) => s.date))
  ).sort();
  const activeDateSet = new Set(activeDates);

  if (activeDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, readToday: false, activeDateSet };
  }

  const readToday = activeDateSet.has(todayKey);
  const yesterdayKey = addDaysToDateKey(todayKey, -1);

  // Current streak counts backward from today if read today, else from yesterday if read yesterday
  let currentStreak = 0;
  let cursor = readToday ? todayKey : activeDateSet.has(yesterdayKey) ? yesterdayKey : '';
  while (cursor && activeDateSet.has(cursor)) {
    currentStreak += 1;
    cursor = addDaysToDateKey(cursor, -1);
  }

  // Longest streak across full history
  let longestStreak = 0;
  let run = 0;
  for (let i = 0; i < activeDates.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      const expectedNext = addDaysToDateKey(activeDates[i - 1], 1);
      run = activeDates[i] === expectedNext ? run + 1 : 1;
    }
    if (run > longestStreak) longestStreak = run;
  }

  return { currentStreak, longestStreak, readToday, activeDateSet };
}

export function calculateDailyProgress(
  sessions: ReadingSession[],
  goals: ReadingGoals,
  todayKey: string = getDateKey()
): {
  minutesToday: number;
  pagesToday: number;
  targetMinutes: number;
  percent: number;
  goalMet: boolean;
} {
  const todaysSessions = sessions.filter((s) => s.date === todayKey);
  const secondsToday = todaysSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const minutesToday = Math.round(secondsToday / 60);
  const pagesToday = todaysSessions.reduce((acc, s) => acc + Math.max(0, s.pagesRead), 0);
  const targetMinutes = Math.max(1, goals.dailyMinutes);
  const goalMet = minutesToday >= targetMinutes;
  const percent = goalMet ? 100 : Math.min(99, Math.round((minutesToday / targetMinutes) * 100));

  return {
    minutesToday,
    pagesToday,
    targetMinutes,
    percent,
    goalMet,
  };
}

export function calculateMonthlyProgress(
  sessions: ReadingSession[],
  goals: ReadingGoals,
  todayKey: string = getDateKey()
): {
  hoursThisMonth: number;
  targetHours: number;
  percent: number;
} {
  const monthPrefix = todayKey.slice(0, 7); // YYYY-MM
  const monthSeconds = sessions
    .filter((s) => s.date.startsWith(monthPrefix))
    .reduce((acc, s) => acc + s.durationSeconds, 0);
  const hoursThisMonth = Math.round((monthSeconds / 3600) * 10) / 10;
  const targetHours = Math.max(1, goals.monthlyHours);
  const percent =
    hoursThisMonth >= targetHours
      ? 100
      : Math.min(99, Math.round((hoursThisMonth / targetHours) * 100));

  return { hoursThisMonth, targetHours, percent };
}

export function calculateYearlyBooksProgress(
  books: Book[],
  goals: ReadingGoals,
  todayKey: string = getDateKey()
): {
  booksFinishedThisYear: number;
  targetBooks: number;
  percent: number;
} {
  const yearPrefix = todayKey.slice(0, 4);
  const booksFinishedThisYear = books.filter(
    (b) => b.shelf === 'finished' && (!b.finishedAt || b.finishedAt.startsWith(yearPrefix))
  ).length;
  const targetBooks = Math.max(1, goals.yearlyBooks);
  const percent =
    booksFinishedThisYear >= targetBooks
      ? 100
      : Math.min(99, Math.round((booksFinishedThisYear / targetBooks) * 100));

  return { booksFinishedThisYear, targetBooks, percent };
}

export interface DailyActivityPoint {
  dateKey: string;
  label: string;
  minutes: number;
  pages: number;
}

export function getDailyActivitySeries(
  sessions: ReadingSession[],
  days: number,
  todayKey: string = getDateKey()
): DailyActivityPoint[] {
  const byDate = new Map<string, { seconds: number; pages: number }>();
  for (const s of sessions) {
    const existing = byDate.get(s.date) ?? { seconds: 0, pages: 0 };
    existing.seconds += s.durationSeconds;
    existing.pages += Math.max(0, s.pagesRead);
    byDate.set(s.date, existing);
  }

  const points: DailyActivityPoint[] = [];
  for (let offset = -(days - 1); offset <= 0; offset++) {
    const key = addDaysToDateKey(todayKey, offset);
    const entry = byDate.get(key);
    const [y, m, d] = key.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const label =
      days <= 7
        ? dt.toLocaleDateString('en-US', { weekday: 'short' })
        : `${dt.getMonth() + 1}/${dt.getDate()}`;
    points.push({
      dateKey: key,
      label,
      minutes: entry ? Math.round(entry.seconds / 60) : 0,
      pages: entry ? entry.pages : 0,
    });
  }
  return points;
}

export function getGenreBreakdown(
  books: Book[],
  sessions: ReadingSession[]
): Array<{ genre: string; minutes: number; bookCount: number; percent: number }> {
  const bookMap = new Map(books.map((b) => [b.id, b]));
  const genreMinutes = new Map<string, number>();
  const genreBooks = new Map<string, number>();

  for (const b of books) {
    const g = b.genre.trim() || 'General';
    genreBooks.set(g, (genreBooks.get(g) ?? 0) + 1);
  }

  let totalMinutes = 0;
  for (const s of sessions) {
    const b = bookMap.get(s.bookId);
    const g = b?.genre.trim() || 'General';
    const mins = s.durationSeconds / 60;
    genreMinutes.set(g, (genreMinutes.get(g) ?? 0) + mins);
    totalMinutes += mins;
  }

  const genres = Array.from(new Set([...genreBooks.keys(), ...genreMinutes.keys()]));
  return genres
    .map((genre) => {
      const minutes = Math.round(genreMinutes.get(genre) ?? 0);
      const bookCount = genreBooks.get(genre) ?? 0;
      const percent = totalMinutes > 0 ? Math.round(((genreMinutes.get(genre) ?? 0) / totalMinutes) * 100) : 0;
      return { genre, minutes, bookCount, percent };
    })
    .sort((a, b) => b.minutes - a.minutes || b.bookCount - a.bookCount);
}

export function calculateReadathonProgress(
  readathon: Readathon,
  sessions: ReadingSession[]
): {
  currentValue: number;
  targetValue: number;
  percent: number;
  completed: boolean;
} {
  const relevant = sessions.filter(
    (s) => s.date >= readathon.startDate && s.date <= readathon.endDate
  );
  const currentValue =
    readathon.targetType === 'minutes'
      ? Math.round(relevant.reduce((acc, s) => acc + s.durationSeconds, 0) / 60)
      : relevant.reduce((acc, s) => acc + Math.max(0, s.pagesRead), 0);
  const targetValue = Math.max(1, readathon.targetValue);
  const completed = currentValue >= targetValue;
  const percent = completed
    ? 100
    : Math.min(99, Math.round((currentValue / targetValue) * 100));

  return {
    currentValue,
    targetValue,
    percent,
    completed,
  };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progressLabel: string;
}

export function computeAchievements(
  state: Pick<BooklyState, 'books' | 'sessions' | 'notes'>,
  todayKey: string = getDateKey()
): Achievement[] {
  const totalPages = state.sessions.reduce((acc, s) => acc + Math.max(0, s.pagesRead), 0);
  const totalMinutes = Math.round(
    state.sessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60
  );
  const finishedBooks = state.books.filter((b) => b.shelf === 'finished').length;
  const quotesCount = state.notes.filter((n) => n.type === 'quote').length;
  const { longestStreak } = calculateStreak(state.sessions, todayKey);
  const avgSpeed = calculateGlobalAverageSpeed(state.sessions);

  return [
    {
      id: 'first-session',
      title: 'First Chapter',
      description: 'Complete your first timed reading session.',
      unlocked: state.sessions.length >= 1,
      progressLabel: `${Math.min(state.sessions.length, 1)} / 1 session`,
    },
    {
      id: 'week-streak',
      title: '7-Day Rhythm',
      description: 'Read consistently for 7 consecutive days.',
      unlocked: longestStreak >= 7,
      progressLabel: `${Math.min(longestStreak, 7)} / 7 days`,
    },
    {
      id: 'page-turner',
      title: 'Page Turner',
      description: 'Log 500 pages across all reading sessions.',
      unlocked: totalPages >= 500,
      progressLabel: `${Math.min(totalPages, 500)} / 500 pages`,
    },
    {
      id: 'deep-reader',
      title: '10 Hours of Focus',
      description: 'Accumulate 10 hours of focused reading time.',
      unlocked: totalMinutes >= 600,
      progressLabel: `${Math.min(Math.round((totalMinutes / 60) * 10) / 10, 10)} / 10 hrs`,
    },
    {
      id: 'quote-curator',
      title: 'Passage Collector',
      description: 'Save 5 memorable quotes in your notebook.',
      unlocked: quotesCount >= 5,
      progressLabel: `${Math.min(quotesCount, 5)} / 5 quotes`,
    },
    {
      id: 'finisher',
      title: 'Cover to Cover',
      description: 'Finish 3 books in your library.',
      unlocked: finishedBooks >= 3,
      progressLabel: `${Math.min(finishedBooks, 3)} / 3 books`,
    },
    {
      id: 'steady-pace',
      title: 'Steady Pace',
      description: 'Maintain an average speed above 35 pages/hour.',
      unlocked: avgSpeed >= 35,
      progressLabel: `${avgSpeed} / 35 pg/hr`,
    },
  ];
}

export function getBlooMessage(
  state: Pick<BooklyState, 'books' | 'sessions' | 'goals'>,
  todayKey: string = getDateKey()
): { headline: string; detail: string } {
  const daily = calculateDailyProgress(state.sessions, state.goals, todayKey);
  const streak = calculateStreak(state.sessions, todayKey);
  const activeBook = state.books.find((b) => b.shelf === 'reading');

  if (daily.goalMet) {
    return {
      headline: `Daily goal reached — ${streak.currentStreak} day streak active`,
      detail: activeBook
        ? `You logged ${daily.minutesToday}m today. Keep going on "${activeBook.title}" whenever you want to unwind.`
        : `You logged ${daily.minutesToday}m today. Your consistency is building real momentum.`,
    };
  }

  const remaining = Math.max(1, daily.targetMinutes - daily.minutesToday);
  if (activeBook) {
    const estMins = estimateTimeToFinishMinutes(activeBook, state.sessions);
    const estCopy =
      estMins !== null && estMins > 0
        ? ` About ${formatMinutesReadable(estMins)} left to finish "${activeBook.title}".`
        : '';
    return {
      headline: `${remaining} minutes left for today's goal`,
      detail:
        streak.currentStreak > 0
          ? `A quick session protects your ${streak.currentStreak}-day streak.${estCopy}`
          : `Start a focused session to kick off a new reading streak.${estCopy}`,
    };
  }

  return {
    headline: 'Pick your next book to start reading',
    detail: `Your daily target is ${daily.targetMinutes} minutes. Add a book to Currently Reading to begin tracking.`,
  };
}
