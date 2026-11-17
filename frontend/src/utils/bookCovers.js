// Open Library / Google Books real cover resolver with clean fallback
export function getBookCoverUrl(isbn, title) {
  if (!isbn && !title) return null;

  // Clean numeric ISBN (strip hyphens and spaces)
  const cleanIsbn = isbn ? isbn.toString().replace(/[^0-9X]/gi, '') : '';

  // Open Library provides direct static cover imagery by clean ISBN:
  // e.g. https://covers.openlibrary.org/b/isbn/9780132350884-M.jpg
  if (cleanIsbn && (cleanIsbn.length === 10 || cleanIsbn.length === 13)) {
    return `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg?default=false`;
  }

  return null;
}

// Deterministic pastel cover color if image is loading or fails
export function getFallbackCoverGradient(title) {
  const gradients = [
    'from-blue-600 to-indigo-800',
    'from-amber-600 to-orange-700',
    'from-emerald-600 to-teal-800',
    'from-purple-600 to-violet-800',
    'from-rose-600 to-red-800',
    'from-slate-700 to-slate-900',
  ];
  if (!title) return gradients[0];
  const charCode = title.charCodeAt(0) || 0;
  return gradients[charCode % gradients.length];
}
