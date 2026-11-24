import type { BooklyState } from '../types/bookly';
import { addDaysToDateKey, getDateKey } from '../utils/readingStats';

export const STORAGE_KEY = 'bookly_reading_studio_v1';

export const COVER_PRESETS = [
  {
    id: 'quiet-hour',
    label: 'Geometric Paper',
    url: '/src/assets/images/cover_quiet_hour_1795504476526.jpg',
    color: '#1D4ED8',
  },
  {
    id: 'orbital-drift',
    label: 'Lunar Horizon',
    url: '/src/assets/images/cover_orbital_drift_1795504475562.jpg',
    color: '#1E293B',
  },
  {
    id: 'northern-woods',
    label: 'Botanical Ink',
    url: '/src/assets/images/cover_northern_woods_1795504475740.jpg',
    color: '#2F6F4E',
  },
  {
    id: 'nordic-forms',
    label: 'Sunlit Timber',
    url: '/src/assets/images/cover_nordic_forms_1795504475739.jpg',
    color: '#8C6D46',
  },
  {
    id: 'sea-of-glass',
    label: 'Twilight Swell',
    url: '/src/assets/images/cover_sea_of_glass_1795504475069.jpg',
    color: '#1E4E68',
  },
];

export const COVER_COLORS = [
  '#1D63ED',
  '#1E293B',
  '#2F6F4E',
  '#7C3AED',
  '#B45309',
  '#BE123C',
  '#0F766E',
];

export function createSeedState(todayKey: string = getDateKey()): BooklyState {
  const d = (offset: number) => addDaysToDateKey(todayKey, offset);

  return {
    theme: 'light',
    collections: [
      { id: 'col-focus', name: 'Deep Focus & Craft', description: 'Books on attention, architecture, and creative systems' },
      { id: 'col-fiction', name: 'Quiet Speculative', description: 'Atmospheric literary fiction and sci-fi' },
      { id: 'col-nature', name: 'Nature & Essays', description: 'Field observations and calm prose' },
    ],
    goals: {
      dailyMinutes: 30,
      monthlyHours: 16,
      yearlyBooks: 24,
    },
    readathons: [
      {
        id: 'readathon-1',
        name: 'Autumn 7-Day Reading Sprint',
        targetType: 'minutes',
        targetValue: 300,
        startDate: d(-5),
        endDate: d(2),
      },
      {
        id: 'readathon-2',
        name: 'November 500-Page Challenge',
        targetType: 'pages',
        targetValue: 500,
        startDate: d(-14),
        endDate: d(7),
      },
    ],
    books: [
      {
        id: 'book-1',
        title: 'The Quiet Hour',
        author: 'Henrik Solberg',
        totalPages: 312,
        currentPage: 214,
        shelf: 'reading',
        genre: 'Productivity',
        coverImage: COVER_PRESETS[0].url,
        coverColor: COVER_PRESETS[0].color,
        isbn: '978-0-385-54921-0',
        rating: 5,
        review: 'Remarkably practical framework for protecting deep, uninterrupted morning blocks.',
        collectionIds: ['col-focus'],
        addedAt: d(-18),
        startedAt: d(-12),
      },
      {
        id: 'book-2',
        title: 'Orbital Drift',
        author: 'Sora Takahashi',
        totalPages: 388,
        currentPage: 142,
        shelf: 'reading',
        genre: 'Sci-Fi',
        coverImage: COVER_PRESETS[1].url,
        coverColor: COVER_PRESETS[1].color,
        isbn: '978-0-593-42108-6',
        rating: 4,
        collectionIds: ['col-fiction'],
        addedAt: d(-10),
        startedAt: d(-6),
      },
      {
        id: 'book-3',
        title: 'Notes from the Northern Woods',
        author: 'Maren Lind',
        totalPages: 248,
        currentPage: 248,
        shelf: 'finished',
        genre: 'Essays',
        coverImage: COVER_PRESETS[2].url,
        coverColor: COVER_PRESETS[2].color,
        isbn: '978-1-250-81140-2',
        rating: 5,
        review: 'A luminous meditation on seasons, patience, and paying attention to ordinary landscapes.',
        collectionIds: ['col-nature'],
        addedAt: d(-35),
        startedAt: d(-28),
        finishedAt: d(-9),
      },
      {
        id: 'book-4',
        title: 'Nordic Forms & Daylight',
        author: 'Kasper Nystrom',
        totalPages: 296,
        currentPage: 296,
        shelf: 'finished',
        genre: 'Architecture',
        coverImage: COVER_PRESETS[3].url,
        coverColor: COVER_PRESETS[3].color,
        rating: 4,
        review: 'Gorgeous case studies on natural light, timber acoustics, and human-scale rooms.',
        collectionIds: ['col-focus'],
        addedAt: d(-52),
        startedAt: d(-48),
        finishedAt: d(-22),
      },
      {
        id: 'book-5',
        title: 'A Sea of Glass',
        author: 'Elena Vasconcelos',
        totalPages: 364,
        currentPage: 0,
        shelf: 'want',
        genre: 'Literary Fiction',
        coverImage: COVER_PRESETS[4].url,
        coverColor: COVER_PRESETS[4].color,
        rating: 0,
        collectionIds: ['col-fiction'],
        addedAt: d(-4),
      },
    ],
    sessions: [
      {
        id: 'sess-1',
        bookId: 'book-1',
        date: d(0),
        startedAt: `${d(0)}T07:45:00`,
        durationSeconds: 1320, // 22m today (8m left to hit 30m goal!)
        startPage: 198,
        endPage: 214,
        pagesRead: 16,
        mood: 'focused',
        note: 'Chapter 7 on deliberate reading environments.',
      },
      {
        id: 'sess-2',
        bookId: 'book-2',
        date: d(-1),
        startedAt: `${d(-1)}T21:15:00`,
        durationSeconds: 2400, // 40m
        startPage: 112,
        endPage: 142,
        pagesRead: 30,
        mood: 'curious',
        note: 'The transit station sequence is gripping.',
      },
      {
        id: 'sess-3',
        bookId: 'book-1',
        date: d(-2),
        startedAt: `${d(-2)}T08:10:00`,
        durationSeconds: 2100, // 35m
        startPage: 174,
        endPage: 198,
        pagesRead: 24,
        mood: 'inspired',
      },
      {
        id: 'sess-4',
        bookId: 'book-2',
        date: d(-3),
        startedAt: `${d(-3)}T22:00:00`,
        durationSeconds: 2700, // 45m
        startPage: 80,
        endPage: 112,
        pagesRead: 32,
        mood: 'relaxed',
      },
      {
        id: 'sess-5',
        bookId: 'book-1',
        date: d(-4),
        startedAt: `${d(-4)}T19:30:00`,
        durationSeconds: 1800, // 30m
        startPage: 152,
        endPage: 174,
        pagesRead: 22,
        mood: 'focused',
      },
      {
        id: 'sess-6',
        bookId: 'book-2',
        date: d(-5),
        startedAt: `${d(-5)}T20:40:00`,
        durationSeconds: 3000, // 50m
        startPage: 44,
        endPage: 80,
        pagesRead: 36,
        mood: 'curious',
      },
      {
        id: 'sess-7',
        bookId: 'book-2',
        date: d(-6),
        startedAt: `${d(-6)}T18:20:00`,
        durationSeconds: 3300, // 55m
        startPage: 0,
        endPage: 44,
        pagesRead: 44,
        mood: 'inspired',
      },
      {
        id: 'sess-8',
        bookId: 'book-3',
        date: d(-9),
        startedAt: `${d(-9)}T17:00:00`,
        durationSeconds: 3600, // 60m
        startPage: 204,
        endPage: 248,
        pagesRead: 44,
        mood: 'emotional',
        note: 'Finished the final essay under rain outside.',
      },
      {
        id: 'sess-9',
        bookId: 'book-1',
        date: d(-10),
        startedAt: `${d(-10)}T08:00:00`,
        durationSeconds: 2700, // 45m
        startPage: 120,
        endPage: 152,
        pagesRead: 32,
        mood: 'focused',
      },
      {
        id: 'sess-10',
        bookId: 'book-3',
        date: d(-12),
        startedAt: `${d(-12)}T16:15:00`,
        durationSeconds: 2400, // 40m
        startPage: 172,
        endPage: 204,
        pagesRead: 32,
        mood: 'relaxed',
      },
    ],
    notes: [
      {
        id: 'note-1',
        bookId: 'book-1',
        type: 'quote',
        content: 'Attention is not a scarce resource to be hoarded; it is a quiet room you choose to keep uncluttered.',
        page: 184,
        createdAt: `${d(-2)}T08:42:00`,
      },
      {
        id: 'note-2',
        bookId: 'book-3',
        type: 'quote',
        content: 'Walk slowly enough through the same stretch of pine and the forest stops repeating itself and starts conversing.',
        page: 219,
        createdAt: `${d(-9)}T17:45:00`,
      },
      {
        id: 'note-3',
        bookId: 'book-2',
        type: 'thought',
        content: 'Notice how Takahashi uses silence in the radio logs to build tension rather than action scenes.',
        page: 128,
        createdAt: `${d(-1)}T21:50:00`,
      },
      {
        id: 'note-4',
        bookId: 'book-3',
        type: 'vocab',
        term: 'Petrichor',
        content: 'The earthy, pleasant scent produced when rain falls on dry soil and forest floor.',
        page: 94,
        createdAt: `${d(-12)}T16:38:00`,
      },
      {
        id: 'note-5',
        bookId: 'book-4',
        type: 'quote',
        content: 'A good room does not announce its geometry; it lets daylight draw the calendar on the floor.',
        page: 162,
        createdAt: `${d(-22)}T14:15:00`,
      },
      {
        id: 'note-6',
        bookId: 'book-1',
        type: 'vocab',
        term: 'Sonder',
        content: 'The sudden realization that every passerby lives a life as vivid and intricate as one’s own.',
        page: 206,
        createdAt: `${d(0)}T08:02:00`,
      },
    ],
  };
}

export function loadBooklyState(): BooklyState {
  if (typeof window === 'undefined') return createSeedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as Partial<BooklyState>;
    if (!Array.isArray(parsed.books) || !Array.isArray(parsed.sessions)) {
      return createSeedState();
    }
    const seed = createSeedState();
    return {
      books: parsed.books,
      sessions: parsed.sessions,
      notes: Array.isArray(parsed.notes) ? parsed.notes : seed.notes,
      collections: Array.isArray(parsed.collections) ? parsed.collections : seed.collections,
      goals: parsed.goals ?? seed.goals,
      readathons: Array.isArray(parsed.readathons) ? parsed.readathons : seed.readathons,
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
    };
  } catch {
    return createSeedState();
  }
}

export function saveBooklyState(state: BooklyState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors cleanly
  }
}
