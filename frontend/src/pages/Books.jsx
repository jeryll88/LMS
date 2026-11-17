import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import BookCoverThumb from '../components/BookCoverThumb';

export default function Books() {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase() || 'user';
  const isStaff = role === 'admin' || role === 'librarian';

  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [scannerToast, setScannerToast] = useState(null);
  const [isScannerConnected, setIsScannerConnected] = useState(false);

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [modalError, setModalError] = useState('');
  const [currentBook, setCurrentBook] = useState({
    title: '',
    isbn: '',
    author: '',
    category_id: '',
    publisher: '',
    publication_year: new Date().getFullYear(),
    description: '',
    initial_copies: 1,
  });

  // View Details Modal (Read in CRUD)
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  const categoriesRef = useRef([]);
  categoriesRef.current = categories;

  const loadData = () => {
    setLoading(true);
    let url = `/api/books?search=${encodeURIComponent(search)}`;
    if (categoryFilter) url += `&category_id=${categoryFilter}`;

    Promise.all([api.get(url), api.get('/api/categories')])
      .then(([booksRes, catRes]) => {
        let list = booksRes.data.books || [];
        if (availableOnly) {
          list = list.filter((b) => b.available_copies > 0);
        }
        // Ensure recently added books ALWAYS appear at the very top (sorted by book_id DESC)
        list.sort((a, b) => (b.book_id || b.id || 0) - (a.book_id || a.id || 0));
        setBooks(list);
        setCategories(catRes.data.categories || []);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load books'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter, availableOnly]);

  // Audio feedback helper for scanner
  const playScannerBeep = (success = true) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(success ? 900 : 350, ctx.currentTime);
      if (success) {
        osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.1);
      }
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio context might be restricted before interaction; ignore safely
    }
  };

  // Lookup helper using Open Library + Google Books fallback
  const fetchMetadataForISBN = async (rawIsbn) => {
    const cleanIsbn = (rawIsbn || '').replace(/[- ]/g, '').trim();
    if (!cleanIsbn) return null;

    // 1. Try Open Library
    try {
      const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`);
      const olData = await olRes.json();
      const bookData = olData[`ISBN:${cleanIsbn}`];
      if (bookData && bookData.title) {
        return {
          title: bookData.title || '',
          author: bookData.authors ? bookData.authors.map((a) => a.name).join(', ') : '',
          publisher: bookData.publishers ? bookData.publishers.map((p) => p.name).join(', ') : '',
          publication_year: bookData.publish_date ? parseInt(bookData.publish_date.match(/\d{4}/)?.[0] || new Date().getFullYear()) : new Date().getFullYear(),
          description: typeof bookData.notes === 'string' ? bookData.notes : (bookData.subtitle || ''),
          isbn: cleanIsbn,
        };
      }
    } catch (e) {
      console.warn('Open Library lookup error:', e);
    }

    // 2. Try Google Books API fallback
    try {
      const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
      const gbData = await gbRes.json();
      if (gbData.items && gbData.items.length > 0) {
        const info = gbData.items[0].volumeInfo;
        return {
          title: info.title || '',
          author: info.authors ? info.authors.join(', ') : '',
          publisher: info.publisher || '',
          publication_year: info.publishedDate ? parseInt(info.publishedDate.substring(0, 4)) : new Date().getFullYear(),
          description: info.description || '',
          isbn: cleanIsbn,
        };
      }
    } catch (e) {
      console.warn('Google Books lookup error:', e);
    }

    return { isbn: cleanIsbn };
  };

  // Triggered whenever a barcode scanner scans a barcode directly into "Add Book"
  const handleBarcodeScanned = async (barcode) => {
    const cleanBarcode = barcode.replace(/[\r\n]/g, '').trim();
    if (!cleanBarcode || cleanBarcode.length < 5) return;

    playScannerBeep(true);
    setIsScannerConnected(true);
    setScannerToast({
      status: 'loading',
      code: cleanBarcode,
      text: `Barcode Scanned: ${cleanBarcode} — Opening "Add Book" and fetching details...`
    });

    // Directly open Add Book modal
    setModalMode('add');
    setShowModal(true);
    setLookupLoading(true);

    const initialCats = categoriesRef.current;
    setCurrentBook({
      title: '',
      isbn: cleanBarcode,
      author: '',
      category_id: initialCats[0]?.category_id || '',
      publisher: '',
      publication_year: new Date().getFullYear(),
      description: '',
      initial_copies: 1,
    });

    // Lookup metadata
    const metadata = await fetchMetadataForISBN(cleanBarcode);
    setLookupLoading(false);

    if (metadata && metadata.title) {
      setCurrentBook((prev) => ({
        ...prev,
        title: metadata.title,
        author: metadata.author || prev.author,
        publisher: metadata.publisher || prev.publisher,
        publication_year: metadata.publication_year || prev.publication_year,
        description: metadata.description || prev.description,
      }));
      setScannerToast({
        status: 'success',
        code: cleanBarcode,
        text: `Found: "${metadata.title}" by ${metadata.author || 'Unknown'}`
      });
    } else {
      setScannerToast({
        status: 'info',
        code: cleanBarcode,
        text: `Scanned code ${cleanBarcode} placed into ISBN. Enter title & save.`
      });
    }

    setTimeout(() => {
      setScannerToast(null);
    }, 6000);
  };

  // Listen for USB device connection / disconnection
  useEffect(() => {
    const onDeviceConnect = () => {
      setIsScannerConnected(true);
    };
    const onDeviceDisconnect = () => {
      setIsScannerConnected(false);
    };

    if (navigator.usb) {
      navigator.usb.addEventListener('connect', onDeviceConnect);
      navigator.usb.addEventListener('disconnect', onDeviceDisconnect);
    }

    return () => {
      if (navigator.usb) {
        navigator.usb.removeEventListener('connect', onDeviceConnect);
        navigator.usb.removeEventListener('disconnect', onDeviceDisconnect);
      }
    };
  }, []);

  // Handheld Barcode Scanner Hardware Listener (HID / Keyboard emulation)
  useEffect(() => {
    let charBuffer = '';
    let lastTime = 0;
    let flushTimeout = null;

    const handleKeyDown = (e) => {
      const now = Date.now();
      const timeDiff = now - lastTime;
      lastTime = now;

      // Hardware scanners typically type characters in < 60ms intervals.
      // If typing speed is human (interval > 120ms), clear any pending scanner buffer.
      if (timeDiff > 120 && charBuffer.length > 0) {
        charBuffer = '';
      }

      if (e.key === 'Enter') {
        // Most barcode scanners terminate with an Enter key
        if (charBuffer.length >= 6) {
          e.preventDefault();
          e.stopPropagation();
          const scanned = charBuffer.trim();
          charBuffer = '';
          handleBarcodeScanned(scanned);
        } else {
          charBuffer = '';
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        charBuffer += e.key;

        // Auto-flush buffer if no more keys arrive within 250ms
        clearTimeout(flushTimeout);
        flushTimeout = setTimeout(() => {
          if (charBuffer.length >= 8) {
            const scanned = charBuffer.trim();
            charBuffer = '';
            handleBarcodeScanned(scanned);
          } else {
            charBuffer = '';
          }
        }, 250);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      clearTimeout(flushTimeout);
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  const exportCSV = () => {
    if (books.length === 0) return;
    const header = ['Book ID', 'Title', 'Author', 'Category', 'ISBN', 'Available Copies', 'Total Copies'];
    const rows = books.map((b) => [
      `B0${b.book_id}`,
      `"${(b.title || '').replace(/"/g, '""')}"`,
      `"${(b.author || '').replace(/"/g, '""')}"`,
      `"${(b.category_name || '').replace(/"/g, '""')}"`,
      b.isbn || '',
      b.available_copies ?? 0,
      b.total_copies ?? 0,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `books_catalog_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CREATE (in CRUD)
  const handleOpenAdd = () => {
    setModalError('');
    setModalMode('add');
    setCurrentBook({
      title: '',
      isbn: '',
      author: '',
      category_id: categories[0]?.category_id || '',
      publisher: '',
      publication_year: new Date().getFullYear(),
      description: '',
      initial_copies: 1,
    });
    setShowModal(true);
  };

  // READ / VIEW DETAILS (in CRUD)
  const handleViewDetails = async (book) => {
    setSelectedBook(book);
    setShowDetailsModal(true);
    try {
      const res = await api.get(`/api/books/${book.book_id}`);
      if (res.data.book) {
        setSelectedBook(res.data.book);
      }
    } catch (err) {
      console.warn('Failed to load full book details:', err);
    }
  };

  // UPDATE (in CRUD)
  const handleOpenEdit = (b) => {
    setModalError('');
    setModalMode('edit');
    setCurrentBook({
      ...b,
      initial_copies: b.total_copies || 1,
    });
    setShowModal(true);
  };

  // DELETE (in CRUD)
  const handleDeleteBook = async (bookId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will delete all physical copies and reservation records. Note: Books with active borrowings cannot be deleted.`)) {
      return;
    }
    try {
      const res = await api.delete(`/api/books/${bookId}`);
      setMessage(res.data.message || 'Book deleted successfully');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete book');
    }
  };

  const handleManualLookup = async () => {
    const rawIsbn = (currentBook.isbn || '').replace(/[- ]/g, '').trim();
    if (!rawIsbn) {
      alert('Please enter or scan an ISBN first.');
      return;
    }
    setLookupLoading(true);
    const meta = await fetchMetadataForISBN(rawIsbn);
    setLookupLoading(false);
    if (meta && meta.title) {
      setCurrentBook((prev) => ({
        ...prev,
        title: meta.title,
        author: meta.author || prev.author,
        publisher: meta.publisher || prev.publisher,
        publication_year: meta.publication_year || prev.publication_year,
        description: meta.description || prev.description,
      }));
    } else {
      alert('No book metadata found for this ISBN. You can fill in the fields manually.');
    }
  };

  const handleSaveBook = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      if (modalMode === 'add') {
        const res = await api.post('/api/books', currentBook);
        setMessage(res.data.message || 'Book added successfully');
        // Prepend the new book to the top of the list immediately
        if (res.data.book) {
          setBooks((prev) => [res.data.book, ...prev.filter((b) => b.book_id !== res.data.book.book_id)]);
        }
      } else {
        const res = await api.put(`/api/books/${currentBook.book_id}`, currentBook);
        setMessage(res.data.message || 'Book updated successfully');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save book');
    }
  };

  const handleReserve = async (bookId, title) => {
    try {
      const res = await api.post('/api/reservations', { book_id: bookId });
      setMessage(res.data.message || `Reservation request submitted for "${title}"`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Reservation failed');
    }
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto">
        {/* Scanner Floating Toast */}
        {scannerToast && (
          <div className="fixed top-4 right-4 z-50 max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 animate-bounce sm:animate-none flex items-start space-x-3">
            <div className="p-2 bg-blue-600 rounded-xl shrink-0">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M2 4h2v16H2V4zm4 0h1v16H6V4zm3 0h2v16H9V4zm4 0h1v16h-1V4zm3 0h2v16h-2V4zm4 0h2v16h-2V4z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Barcode Scanner</span>
                {scannerToast.status === 'loading' && (
                  <span className="text-[10px] bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full animate-pulse">Reading...</span>
                )}
                {scannerToast.status === 'success' && (
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-bold">Auto-filled</span>
                )}
              </div>
              <p className="text-xs text-slate-200 mt-1">{scannerToast.text}</p>
            </div>
            <button onClick={() => setScannerToast(null)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
          </div>
        )}

        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white sm:bg-transparent p-4 sm:p-0 rounded-2xl sm:rounded-none border sm:border-none border-slate-200/80 shadow-sm sm:shadow-none">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Book Management</h1>
              {isStaff && isScannerConnected && (
                <div
                  title="Scanner Connected: Hardware scanner detected."
                  className="hidden md:inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-semibold"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Scanner Connected</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Total: {books.length} books in catalog • Sorted by newest first</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            >
              <option value="">All Categories & Types</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name} ({c.category_type})
                </option>
              ))}
            </select>

            <label className="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer font-medium bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="whitespace-nowrap">Available Only</span>
            </label>

            <button
              onClick={exportCSV}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition whitespace-nowrap"
            >
              Export CSV
            </button>

            {isStaff && (
              <button
                onClick={handleOpenAdd}
                className="px-3.5 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-lg shadow-sm transition whitespace-nowrap flex items-center space-x-1.5"
              >
                <span>+ Add Book</span>
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex justify-between items-center">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="font-bold ml-2">✕</button>
          </div>
        )}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-bold ml-2">✕</button>
          </div>
        )}

        {/* Secondary Search & Export Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
          <form onSubmit={handleSearch} className="relative w-full sm:max-w-sm">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, author, or ISBN..."
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
            />
          </form>

          <button
            onClick={exportCSV}
            className="text-xs text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg bg-slate-50 font-medium self-end sm:self-auto"
          >
            Export CSV
          </button>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100 bg-slate-50/50">
                  <th className="py-3 px-4 sm:px-5 font-bold">BOOK ID</th>
                  <th className="py-3 px-3 font-bold">TITLE</th>
                  <th className="py-3 px-4 font-bold">AUTHOR</th>
                  <th className="py-3 px-4 font-bold">CATEGORY</th>
                  <th className="py-3 px-4 font-bold">ISBN</th>
                  <th className="py-3 px-4 font-bold">AVAILABILITY</th>
                  <th className="py-3 px-4 font-bold">COPIES (TOTAL/AVAIL)</th>
                  <th className="py-3 px-4 font-bold text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-10 text-center text-slate-400">Loading catalog books...</td>
                  </tr>
                ) : books.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-10 text-center text-slate-400">No books found.</td>
                  </tr>
                ) : (
                  books.map((b) => (
                    <tr key={b.book_id} className="hover:bg-slate-50/80 transition">
                      {/* Book ID */}
                      <td className="py-3 px-4 sm:px-5 font-mono text-slate-600 font-semibold whitespace-nowrap">
                        B0{b.book_id < 10 ? `0${b.book_id}` : b.book_id}
                      </td>

                      {/* Title with Real Book Cover Image Thumbnail */}
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-3">
                          <BookCoverThumb isbn={b.isbn} title={b.title} className="w-9 h-12 shrink-0 cursor-pointer" onClick={() => handleViewDetails(b)} />
                          <button
                            onClick={() => handleViewDetails(b)}
                            className="font-semibold text-slate-900 text-left hover:text-blue-600 line-clamp-1 max-w-[200px] sm:max-w-[240px]"
                            title="Click to view details"
                          >
                            {b.title}
                          </button>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{b.author}</td>

                      {/* Category with Dual-Tone Badge */}
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800 text-[11px] leading-tight">{b.category_name}</p>
                        <span
                          className={`inline-block mt-0.5 px-2 py-0.2 rounded text-[9px] font-bold tracking-wider uppercase border ${
                            b.category_type === 'Academic'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {b.category_type || 'NON-ACADEMIC'}
                        </span>
                      </td>

                      {/* ISBN */}
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">{b.isbn}</td>

                      {/* Availability Pill */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            b.available_copies > 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {b.available_copies > 0 ? 'Available' : 'Unavailable'}
                        </span>
                      </td>

                      {/* Copies (Total/Avail) */}
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {b.total_copies} / {b.available_copies}
                      </td>

                      {/* Full CRUD Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isStaff ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleViewDetails(b)}
                              className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded transition"
                              title="View full details"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleOpenEdit(b)}
                              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded transition"
                              title="Edit book"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteBook(b.book_id, b.title)}
                              className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 bg-rose-50 hover:bg-rose-100 rounded transition"
                              title="Delete book"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleViewDetails(b)}
                              className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded transition"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => handleReserve(b.book_id, b.title)}
                              className="px-2.5 py-1 bg-blue-600 text-white rounded text-[11px] font-semibold hover:bg-blue-700 transition"
                            >
                              Reserve
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================= */}
        {/* VIEW DETAILS MODAL (Read in CRUD)                          */}
        {/* ========================================================= */}
        {showDetailsModal && selectedBook && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[92vh] overflow-y-auto space-y-4">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div className="flex items-start space-x-3">
                  <BookCoverThumb isbn={selectedBook.isbn} title={selectedBook.title} className="w-16 h-22 shrink-0 shadow-md rounded-lg" />
                  <div>
                    <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-wider">
                      Book ID: B0{selectedBook.book_id}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base leading-snug">{selectedBook.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">By {selectedBook.author}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {selectedBook.category_name || 'General'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        selectedBook.available_copies > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {selectedBook.available_copies > 0 ? `${selectedBook.available_copies} Available` : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="font-bold text-slate-400 hover:text-slate-700 p-1"
                >
                  ✕
                </button>
              </div>

              {/* Book Details Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-semibold">ISBN</span>
                  <span className="font-mono text-slate-800 font-bold">{selectedBook.isbn || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Publication Year</span>
                  <span className="text-slate-800 font-bold">{selectedBook.publication_year || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Publisher</span>
                  <span className="text-slate-800 font-bold">{selectedBook.publisher || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Shelf Inventory</span>
                  <span className="text-slate-800 font-bold">{selectedBook.total_copies} total ({selectedBook.available_copies} available)</span>
                </div>
              </div>

              {/* Description */}
              {selectedBook.description && (
                <div>
                  <h4 className="font-bold text-slate-700 text-xs mb-1">Synopsis / Overview</h4>
                  <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                    {selectedBook.description}
                  </p>
                </div>
              )}

              {/* Physical Copies Barcodes */}
              {selectedBook.copies && selectedBook.copies.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-700 text-xs mb-1.5">Registered Physical Copies ({selectedBook.copies.length})</h4>
                  <div className="max-h-32 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                    {selectedBook.copies.map((c) => (
                      <div key={c.copy_id || c.id} className="p-2 flex justify-between items-center text-xs">
                        <span className="font-mono font-bold text-slate-700">{c.barcode}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          c.status === 'Available' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition"
                >
                  Close
                </button>
                {isStaff ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleOpenEdit(selectedBook);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
                  >
                    Edit Book
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleReserve(selectedBook.book_id, selectedBook.title);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
                  >
                    Reserve This Book
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ADD / EDIT MODAL (Create & Update in CRUD)                */}
        {/* ========================================================= */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-slate-900 text-base">
                    {modalMode === 'add' ? 'Add New Book' : 'Edit Book Information'}
                  </h3>
                  {lookupLoading && (
                    <span className="text-[11px] text-blue-600 font-semibold animate-pulse flex items-center space-x-1">
                      <span>• Loading metadata...</span>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="font-bold text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* In-Modal Alert for Duplicate ISBN or Validation Errors */}
              {modalError && (
                <div className="mb-3.5 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 fill-rose-600 shrink-0" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">{modalError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalError('')}
                    className="font-bold text-rose-500 hover:text-rose-800 ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveBook} className="space-y-3.5 text-xs">
                {/* Title */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Book title"
                    value={currentBook.title}
                    onChange={(e) => setCurrentBook({ ...currentBook, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Author & ISBN Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Author <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Author name"
                      value={currentBook.author}
                      onChange={(e) => setCurrentBook({ ...currentBook, author: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-semibold text-slate-700">
                        ISBN <span className="text-rose-500">*</span>
                      </label>
                      {isScannerConnected && (
                        <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Scanner connected
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        placeholder="Scan or enter ISBN..."
                        value={currentBook.isbn}
                        onChange={(e) => {
                          setCurrentBook({ ...currentBook, isbn: e.target.value });
                          if (modalError) setModalError('');
                        }}
                        className={`flex-1 px-3 py-2 bg-slate-50 border rounded-lg text-slate-800 focus:outline-none font-mono ${
                          modalError.toLowerCase().includes('isbn')
                            ? 'border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/30'
                            : 'border-slate-200 focus:bg-white focus:ring-1 focus:ring-blue-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleManualLookup}
                        disabled={lookupLoading}
                        className="px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-semibold border border-blue-200 text-xs shrink-0 transition"
                      >
                        {lookupLoading ? '...' : 'Lookup'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Publisher & Publication Year Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Publisher</label>
                    <input
                      type="text"
                      placeholder="Publisher"
                      value={currentBook.publisher || ''}
                      onChange={(e) => setCurrentBook({ ...currentBook, publisher: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Publication Year</label>
                    <input
                      type="number"
                      placeholder="2026"
                      value={currentBook.publication_year || ''}
                      onChange={(e) => setCurrentBook({ ...currentBook, publication_year: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Category & Initial Copies Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={currentBook.category_id || ''}
                      onChange={(e) => setCurrentBook({ ...currentBook, category_id: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- No Category --</option>
                      {categories.map((c) => (
                        <option key={c.category_id} value={c.category_id}>
                          {c.category_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {modalMode === 'add' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Initial Copies</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={currentBook.initial_copies || 1}
                        onChange={(e) => setCurrentBook({ ...currentBook, initial_copies: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows="3"
                    placeholder="Brief description..."
                    value={currentBook.description || ''}
                    onChange={(e) => setCurrentBook({ ...currentBook, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                  ></textarea>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-semibold shadow-sm transition text-center"
                  >
                    {modalMode === 'add' ? '+ Add Book' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
