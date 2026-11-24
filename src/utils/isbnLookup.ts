export interface IsbnBookMetadata {
  isbn: string;
  title: string;
  author: string;
  totalPages?: number;
  genre?: string;
  coverImage?: string;
  source: 'Open Library' | 'Google Books';
}

export function normalizeIsbn(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^0-9X]/g, '')
    .trim();
}

export function isValidIsbn10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = isbn[i];
    const val = ch === 'X' ? 10 : Number.parseInt(ch, 10);
    sum += val * (10 - i);
  }
  return sum % 11 === 0;
}

export function isValidIsbn13(isbn: string): boolean {
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const val = Number.parseInt(isbn[i], 10);
    sum += i % 2 === 0 ? val : val * 3;
  }
  return sum % 10 === 0;
}

export function isValidIsbn(raw: string): boolean {
  const clean = normalizeIsbn(raw);
  if (clean.length === 10) return isValidIsbn10(clean);
  if (clean.length === 13) return isValidIsbn13(clean);
  return false;
}

function toHttpsUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace(/^http:\/\//i, 'https://');
}

export function parseOpenLibraryResponse(
  data: Record<string, unknown>,
  cleanIsbn: string
): IsbnBookMetadata | null {
  const entry = data[`ISBN:${cleanIsbn}`] as
    | {
        title?: string;
        authors?: Array<{ name?: string }>;
        number_of_pages?: number;
        subjects?: Array<{ name?: string }>;
        cover?: { large?: string; medium?: string; small?: string };
      }
    | undefined;

  if (!entry || !entry.title) return null;

  const authorNames = (entry.authors ?? [])
    .map((a) => a.name?.trim())
    .filter((name): name is string => Boolean(name));

  const firstSubject = entry.subjects?.[0]?.name?.trim();
  const coverUrl = toHttpsUrl(
    entry.cover?.large ?? entry.cover?.medium ?? entry.cover?.small
  );

  return {
    isbn: cleanIsbn,
    title: entry.title.trim(),
    author: authorNames.join(', '),
    totalPages:
      typeof entry.number_of_pages === 'number' && entry.number_of_pages > 0
        ? entry.number_of_pages
        : undefined,
    genre: firstSubject,
    coverImage: coverUrl,
    source: 'Open Library',
  };
}

export function parseGoogleBooksResponse(
  data: {
    items?: Array<{
      volumeInfo?: {
        title?: string;
        subtitle?: string;
        authors?: string[];
        pageCount?: number;
        categories?: string[];
        imageLinks?: {
          extraLarge?: string;
          large?: string;
          medium?: string;
          thumbnail?: string;
          smallThumbnail?: string;
        };
      };
    }>;
  },
  cleanIsbn: string
): IsbnBookMetadata | null {
  const info = data?.items?.[0]?.volumeInfo;
  if (!info || !info.title) return null;

  const rawCover =
    info.imageLinks?.large ??
    info.imageLinks?.medium ??
    info.imageLinks?.thumbnail ??
    info.imageLinks?.smallThumbnail;

  // Improve Google Books thumbnail clarity when possible
  const coverUrl = rawCover
    ? toHttpsUrl(rawCover.replace('&edge=curl', ''))
    : undefined;

  return {
    isbn: cleanIsbn,
    title: info.title.trim(),
    author: (info.authors ?? []).filter(Boolean).join(', '),
    totalPages:
      typeof info.pageCount === 'number' && info.pageCount > 0
        ? info.pageCount
        : undefined,
    genre: info.categories?.[0]?.trim(),
    coverImage: coverUrl,
    source: 'Google Books',
  };
}

export function mergeBookMetadata(
  primary: IsbnBookMetadata | null,
  fallback: IsbnBookMetadata | null
): IsbnBookMetadata | null {
  if (!primary && !fallback) return null;
  if (!primary) return fallback;
  if (!fallback) return primary;

  return {
    isbn: primary.isbn,
    title: primary.title || fallback.title,
    author: primary.author || fallback.author,
    totalPages: primary.totalPages ?? fallback.totalPages,
    genre: primary.genre ?? fallback.genre,
    coverImage: primary.coverImage ?? fallback.coverImage,
    source: primary.source,
  };
}

export async function lookupBookByIsbn(
  rawIsbn: string,
  signal?: AbortSignal
): Promise<IsbnBookMetadata> {
  const cleanIsbn = normalizeIsbn(rawIsbn);
  if (!isValidIsbn(cleanIsbn)) {
    throw new Error('Enter a valid 10- or 13-digit ISBN.');
  }

  let openLibResult: IsbnBookMetadata | null = null;
  let googleResult: IsbnBookMetadata | null = null;

  // Query Open Library Books API first
  try {
    const olRes = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(cleanIsbn)}&format=json&jscmd=data`,
      { signal }
    );
    if (olRes.ok) {
      const olJson = (await olRes.json()) as Record<string, unknown>;
      openLibResult = parseOpenLibraryResponse(olJson, cleanIsbn);
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
  }

  // Query Google Books API if Open Library missed the book or lacks cover/pages/author
  const needsEnrichment =
    !openLibResult ||
    !openLibResult.coverImage ||
    !openLibResult.totalPages ||
    !openLibResult.author;

  if (needsEnrichment) {
    try {
      const gbRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(cleanIsbn)}`,
        { signal }
      );
      if (gbRes.ok) {
        const gbJson = (await gbRes.json()) as Parameters<typeof parseGoogleBooksResponse>[0];
        googleResult = parseGoogleBooksResponse(gbJson, cleanIsbn);
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err;
    }
  }

  const merged = mergeBookMetadata(openLibResult, googleResult);
  if (!merged) {
    throw new Error(`No book found for ISBN ${cleanIsbn}. You can still fill the details manually.`);
  }

  // Fallback cover URL from Open Library Covers API if both responses omitted cover links
  if (!merged.coverImage) {
    merged.coverImage = `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(cleanIsbn)}-L.jpg?default=false`;
  }

  return merged;
}
