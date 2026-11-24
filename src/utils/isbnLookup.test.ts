import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidIsbn,
  mergeBookMetadata,
  normalizeIsbn,
  parseGoogleBooksResponse,
  parseOpenLibraryResponse,
} from './isbnLookup';

test('normalizeIsbn strips hyphens and spaces while preserving trailing X', () => {
  assert.equal(normalizeIsbn('978-0-14-312774-1'), '9780143127741');
  assert.equal(normalizeIsbn(' 0-8044-2957-x '), '080442957X');
});

test('isValidIsbn validates ISBN-10 and ISBN-13 check digits', () => {
  // Valid ISBN-13
  assert.equal(isValidIsbn('978-0-14-312774-1'), true);
  assert.equal(isValidIsbn('9780441172719'), true);
  // Valid ISBN-10 (numeric & X check digit)
  assert.equal(isValidIsbn('0441172717'), true);
  assert.equal(isValidIsbn('0-8044-2957-X'), true);
  // Invalid checksums and wrong lengths
  assert.equal(isValidIsbn('9780143127742'), false);
  assert.equal(isValidIsbn('1234567890123'), false);
  assert.equal(isValidIsbn('0441172718'), false);
  assert.equal(isValidIsbn('978014'), false);
});

test('parseOpenLibraryResponse extracts title, author, pages, genre, and HTTPS cover', () => {
  const payload = {
    'ISBN:9780143127741': {
      title: 'Deep Work',
      authors: [{ name: 'Cal Newport' }],
      number_of_pages: 304,
      subjects: [{ name: 'Productivity' }],
      cover: {
        large: 'http://covers.openlibrary.org/b/id/12345-L.jpg',
      },
    },
  };
  const parsed = parseOpenLibraryResponse(payload, '9780143127741');
  assert.deepEqual(parsed, {
    isbn: '9780143127741',
    title: 'Deep Work',
    author: 'Cal Newport',
    totalPages: 304,
    genre: 'Productivity',
    coverImage: 'https://covers.openlibrary.org/b/id/12345-L.jpg',
    source: 'Open Library',
  });
});

test('parseGoogleBooksResponse extracts volumeInfo and upgrades thumbnail URL to https', () => {
  const payload = {
    items: [
      {
        volumeInfo: {
          title: 'Dune',
          authors: ['Frank Herbert'],
          pageCount: 688,
          categories: ['Fiction'],
          imageLinks: {
            thumbnail: 'http://books.google.com/books/content?id=abc&printsec=frontcover&edge=curl',
          },
        },
      },
    ],
  };
  const parsed = parseGoogleBooksResponse(payload, '9780441172719');
  assert.deepEqual(parsed, {
    isbn: '9780441172719',
    title: 'Dune',
    author: 'Frank Herbert',
    totalPages: 688,
    genre: 'Fiction',
    coverImage: 'https://books.google.com/books/content?id=abc&printsec=frontcover',
    source: 'Google Books',
  });
});

test('mergeBookMetadata fills missing fields from fallback source', () => {
  const merged = mergeBookMetadata(
    {
      isbn: '9780441172719',
      title: 'Dune',
      author: 'Frank Herbert',
      source: 'Open Library',
    },
    {
      isbn: '9780441172719',
      title: 'Dune (Deluxe)',
      author: 'Frank Herbert',
      totalPages: 688,
      genre: 'Science Fiction',
      coverImage: 'https://example.com/dune.jpg',
      source: 'Google Books',
    }
  );
  assert.equal(merged?.title, 'Dune');
  assert.equal(merged?.totalPages, 688);
  assert.equal(merged?.genre, 'Science Fiction');
  assert.equal(merged?.coverImage, 'https://example.com/dune.jpg');
});
