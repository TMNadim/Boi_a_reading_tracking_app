import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysToDateKey,
  calculateBookProgress,
  calculateBookStats,
  calculateDailyProgress,
  calculateReadathonProgress,
  calculateSpeedPagesPerHour,
  calculateStreak,
  computeAchievements,
  estimateTimeToFinishMinutes,
  formatMinutesReadable,
  formatTimerClock,
  getDailyActivitySeries,
} from './readingStats';
import type { Book, Readathon, ReadingSession } from '../types/bookly';

const sampleBook: Book = {
  id: 'b1',
  title: 'The Quiet Hour',
  author: 'Clara Lindqvist',
  totalPages: 320,
  currentPage: 160,
  shelf: 'reading',
  genre: 'Non-Fiction',
  coverColor: '#1D4ED8',
  rating: 4,
  collectionIds: [],
  addedAt: '2026-10-01',
};

const sampleSessions: ReadingSession[] = [
  {
    id: 's1',
    bookId: 'b1',
    date: '2026-11-23',
    startedAt: '2026-11-23T08:00:00Z',
    durationSeconds: 1800, // 30m
    startPage: 140,
    endPage: 160,
    pagesRead: 20, // 40 pg/hr
  },
  {
    id: 's2',
    bookId: 'b1',
    date: '2026-11-22',
    startedAt: '2026-11-22T20:00:00Z',
    durationSeconds: 3600, // 60m
    startPage: 100,
    endPage: 140,
    pagesRead: 40, // 40 pg/hr
  },
  {
    id: 's3',
    bookId: 'b1',
    date: '2026-11-21',
    startedAt: '2026-11-21T20:00:00Z',
    durationSeconds: 1200, // 20m
    startPage: 85,
    endPage: 100,
    pagesRead: 15,
  },
  {
    id: 's4',
    bookId: 'b1',
    date: '2026-11-18',
    startedAt: '2026-11-18T19:00:00Z',
    durationSeconds: 1800,
    startPage: 65,
    endPage: 85,
    pagesRead: 20,
  },
];

test('formatTimerClock formats HH:MM:SS accurately', () => {
  assert.equal(formatTimerClock(0), '00:00:00');
  assert.equal(formatTimerClock(65), '00:01:05');
  assert.equal(formatTimerClock(3661), '01:01:01');
  assert.equal(formatTimerClock(-10), '00:00:00');
});

test('formatMinutesReadable formats minutes and hours cleanly', () => {
  assert.equal(formatMinutesReadable(45), '45m');
  assert.equal(formatMinutesReadable(60), '1h');
  assert.equal(formatMinutesReadable(135), '2h 15m');
});

test('calculateBookProgress clamps and computes percent and pages remaining', () => {
  assert.deepEqual(calculateBookProgress({ currentPage: 160, totalPages: 320 }), {
    percent: 50,
    pagesRemaining: 160,
  });
  assert.deepEqual(calculateBookProgress({ currentPage: 400, totalPages: 320 }), {
    percent: 100,
    pagesRemaining: 0,
  });
  assert.deepEqual(calculateBookProgress({ currentPage: 0, totalPages: 0 }), {
    percent: 0,
    pagesRemaining: 0,
  });
});

test('calculateSpeedPagesPerHour and estimateTimeToFinishMinutes compute expected values', () => {
  assert.equal(calculateSpeedPagesPerHour(20, 1800), 40);
  const stats = calculateBookStats('b1', sampleSessions);
  assert.equal(stats.sessionCount, 4);
  assert.equal(stats.totalPagesLogged, 95);
  // 95 pages in 8400 seconds (2.3333h) => 40.7 pg/hr
  assert.equal(stats.pagesPerHour, 40.7);

  // 160 pages remaining at 40.7 pg/hr => ~236 minutes
  const est = estimateTimeToFinishMinutes(sampleBook, sampleSessions);
  assert.equal(est, 236);
});

test('calculateStreak computes current and longest streaks accurately', () => {
  const streakToday = calculateStreak(sampleSessions, '2026-11-23');
  assert.equal(streakToday.readToday, true);
  assert.equal(streakToday.currentStreak, 3);
  assert.equal(streakToday.longestStreak, 3);

  // Next day before reading: streak still active from yesterday
  const streakNextDay = calculateStreak(sampleSessions, '2026-11-24');
  assert.equal(streakNextDay.readToday, false);
  assert.equal(streakNextDay.currentStreak, 3);

  // Two days later without reading: current streak resets to 0, longest remains 3
  const streakBroken = calculateStreak(sampleSessions, '2026-11-25');
  assert.equal(streakBroken.currentStreak, 0);
  assert.equal(streakBroken.longestStreak, 3);
});

test('calculateDailyProgress computes minutes, pages, and goalMet', () => {
  const progress = calculateDailyProgress(
    sampleSessions,
    { dailyMinutes: 30, monthlyHours: 15, yearlyBooks: 24 },
    '2026-11-23'
  );
  assert.equal(progress.minutesToday, 30);
  assert.equal(progress.pagesToday, 20);
  assert.equal(progress.percent, 100);
  assert.equal(progress.goalMet, true);
});

test('calculateReadathonProgress filters sessions by date range and caps incomplete progress at 99%', () => {
  const readathon: Readathon = {
    id: 'r1',
    name: 'Weekend Sprint',
    targetType: 'pages',
    targetValue: 100,
    startDate: '2026-11-21',
    endDate: '2026-11-23',
  };
  const progress = calculateReadathonProgress(readathon, sampleSessions);
  assert.equal(progress.currentValue, 75);
  assert.equal(progress.percent, 75);
  assert.equal(progress.completed, false);

  const almostDone: Readathon = {
    ...readathon,
    targetValue: 76, // 75/76 = 98.7% -> rounds to 99%, never 100%
  };
  const nearProgress = calculateReadathonProgress(almostDone, sampleSessions);
  assert.equal(nearProgress.percent, 99);
  assert.equal(nearProgress.completed, false);
});

test('getDailyActivitySeries returns exact number of consecutive days', () => {
  const series = getDailyActivitySeries(sampleSessions, 7, '2026-11-23');
  assert.equal(series.length, 7);
  assert.equal(series[0].dateKey, addDaysToDateKey('2026-11-23', -6));
  assert.equal(series[6].dateKey, '2026-11-23');
  assert.equal(series[6].minutes, 30);
});

test('computeAchievements unlocks expected milestones', () => {
  const achievements = computeAchievements(
    { books: [sampleBook], sessions: sampleSessions, notes: [] },
    '2026-11-23'
  );
  const firstChapter = achievements.find((a) => a.id === 'first-session');
  const steadyPace = achievements.find((a) => a.id === 'steady-pace');
  const weekStreak = achievements.find((a) => a.id === 'week-streak');
  assert.equal(firstChapter?.unlocked, true);
  assert.equal(steadyPace?.unlocked, true);
  assert.equal(weekStreak?.unlocked, false);
});
