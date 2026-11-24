export type ShelfStatus = 'reading' | 'finished' | 'want' | 'unfinished';

export type SessionMood = 'focused' | 'inspired' | 'relaxed' | 'emotional' | 'curious';

export type NoteType = 'quote' | 'thought' | 'vocab';

export type AmbientSoundId = 'rain' | 'fireplace' | 'cafe' | 'library' | 'brown-noise';

export type NavTab = 'library' | 'timer' | 'quotes' | 'goals' | 'stats';

export interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  shelf: ShelfStatus;
  genre: string;
  coverImage?: string;
  coverColor: string;
  isbn?: string;
  rating: number; // 0 to 5
  review?: string;
  collectionIds: string[];
  addedAt: string; // ISO date
  startedAt?: string;
  finishedAt?: string;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  date: string; // YYYY-MM-DD local date key
  startedAt: string; // ISO timestamp
  durationSeconds: number;
  startPage: number;
  endPage: number;
  pagesRead: number;
  mood?: SessionMood;
  note?: string;
}

export interface NoteEntry {
  id: string;
  bookId: string;
  type: NoteType;
  content: string;
  term?: string; // used for vocab entries
  page?: number;
  createdAt: string; // ISO timestamp
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
}

export interface ReadingGoals {
  dailyMinutes: number;
  monthlyHours: number;
  yearlyBooks: number;
}

export interface Readathon {
  id: string;
  name: string;
  targetType: 'minutes' | 'pages';
  targetValue: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface BooklyState {
  books: Book[];
  sessions: ReadingSession[];
  notes: NoteEntry[];
  collections: Collection[];
  goals: ReadingGoals;
  readathons: Readathon[];
  theme: 'light' | 'dark';
}
