import type { BooklyState } from '../types/bookly';

export const STORAGE_KEY = 'boi_library_v1';

export const COVER_PRESETS = [
  {
    id: 'quiet-hour',
    label: 'Geometric Paper',
    url: './src/assets/images/cover_quiet_hour_1795504476526.jpg',
    color: '#1D4ED8',
  },
  {
    id: 'orbital-drift',
    label: 'Lunar Horizon',
    url: './src/assets/images/cover_orbital_drift_1795504475562.jpg',
    color: '#1E293B',
  },
  {
    id: 'northern-woods',
    label: 'Botanical Ink',
    url: './src/assets/images/cover_northern_woods_1795504475740.jpg',
    color: '#2F6F4E',
  },
  {
    id: 'nordic-forms',
    label: 'Sunlit Timber',
    url: './src/assets/images/cover_nordic_forms_1795504475739.jpg',
    color: '#8C6D46',
  },
  {
    id: 'sea-of-glass',
    label: 'Twilight Swell',
    url: './src/assets/images/cover_sea_of_glass_1795504475069.jpg',
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

export function createEmptyState(): BooklyState {
  return {
    theme: 'light',
    collections: [],
    goals: {
      dailyMinutes: 30,
      monthlyHours: 15,
      yearlyBooks: 12,
    },
    readathons: [],
    books: [],
    sessions: [],
    notes: [],
  };
}

export function loadBooklyState(): BooklyState {
  if (typeof window === 'undefined') return createEmptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyState();
    const parsed = JSON.parse(raw) as Partial<BooklyState>;
    if (!Array.isArray(parsed.books) || !Array.isArray(parsed.sessions)) {
      return createEmptyState();
    }
    const defaults = createEmptyState();
    return {
      books: parsed.books,
      sessions: parsed.sessions,
      notes: Array.isArray(parsed.notes) ? parsed.notes : defaults.notes,
      collections: Array.isArray(parsed.collections) ? parsed.collections : defaults.collections,
      goals: parsed.goals ?? defaults.goals,
      readathons: Array.isArray(parsed.readathons) ? parsed.readathons : defaults.readathons,
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
    };
  } catch {
    return createEmptyState();
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
