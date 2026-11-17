import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';

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

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [currentBook, setCurrentBook] = useState({
    title: '',
    isbn: '',
    author: '',
    category_id: '',
    publisher: '',
    publication_year: '',
    description: '',
    initial_copies: 1,
  });

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
        setBooks(list);
        setCategories(catRes.data.categories || []);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load books'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter, availableOnly]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  const exportCSV = () => {
    if (books.length === 0) return;
    const header = ['Book ID', 'Title', 'Author', 'Category', 'ISBN', 'Available Copies', 'Total Copies'];
    const rows = books.map((b) => [
      `B0${b.book_id}`,
      `"${b.title.replace(/"/g, '""')}"`,
      `"${b.author.replace(/"/g, '""')}"`,
      `"${b.category_name || ''}"`,
      b.isbn,
      b.available_copies,
      b.total_copies,
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

  const handleOpenAdd = () => {
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

  const handleSaveBook = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        const res = await api.post('/api/books', currentBook);
        setMessage(res.data.message || 'Book added successfully');
      } else {
        const res = await api.put(`/api/books/${currentBook.book_id}`, currentBook);
        setMessage(res.data.message || 'Book updated successfully');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save book');
    }
  };

  const handleReserve = async (bookId, title) => {
    try {
      const res = await api.post('/api/reservations', { book_id: bookId });
      setMessage(res.data.message || `Reservation confirmed for "${title}"`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Reservation failed');
    }
  };

  return (
    <Layout>
      <div className="space-y-5 max-w-7xl mx-auto">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Book Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">Total: {books.length} books in catalog</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Categories & Types</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name} ({c.category_type})
                </option>
              ))}
            </select>

            <label className="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Available Only</span>
            </label>

            <button
              onClick={exportCSV}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              Export CSV
            </button>

            {isStaff && (
              <button
                onClick={handleOpenAdd}
                className="px-3.5 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                + Add Book
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="font-bold">✕</button>
          </div>
        )}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-bold">✕</button>
          </div>
        )}

        {/* Secondary Search & Export Bar */}
        <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
          <form onSubmit={handleSearch} className="relative w-full max-w-sm">
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
            className="text-xs text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg bg-slate-50 font-medium"
          >
            Export CSV
          </button>
        </div>

        {/* Clean Data Table matching Screenshot */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100 bg-slate-50/50">
                  <th className="py-3 px-5 font-bold">BOOK ID</th>
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
                      <td className="py-3 px-5 font-mono text-slate-600 font-semibold whitespace-nowrap">
                        B0{b.book_id < 10 ? `0${b.book_id}` : b.book_id}
                      </td>

                      {/* Title with Book Cover Thumbnail */}
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-10 bg-slate-200 rounded shadow-xs overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-amber-500 to-orange-600">
                            {b.title.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-900 line-clamp-1 max-w-[220px]" title={b.title}>
                            {b.title}
                          </span>
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

                      {/* Action Icon */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isStaff ? (
                          <button
                            onClick={() => {
                              setCurrentBook(b);
                              setModalMode('edit');
                              setShowModal(true);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 bg-blue-50 rounded"
                          >
                            Edit
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReserve(b.book_id, b.title)}
                            className="px-2.5 py-1 bg-blue-600 text-white rounded text-[11px] font-semibold hover:bg-blue-700 transition"
                          >
                            Reserve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal for Add / Edit */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-4 pb-3 border-b">
                <h3 className="font-bold text-slate-900 text-base">
                  {modalMode === 'add' ? 'Add Book Record' : 'Edit Book Information'}
                </h3>
                <button onClick={() => setShowModal(false)} className="font-bold text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <form onSubmit={handleSaveBook} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold uppercase text-slate-600 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={currentBook.title}
                    onChange={(e) => setCurrentBook({ ...currentBook, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold uppercase text-slate-600 mb-1">Author</label>
                    <input
                      type="text"
                      required
                      value={currentBook.author}
                      onChange={(e) => setCurrentBook({ ...currentBook, author: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase text-slate-600 mb-1">ISBN</label>
                    <input
                      type="text"
                      required
                      value={currentBook.isbn}
                      onChange={(e) => setCurrentBook({ ...currentBook, isbn: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold uppercase text-slate-600 mb-1">Category</label>
                    <select
                      value={currentBook.category_id}
                      onChange={(e) => setCurrentBook({ ...currentBook, category_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {categories.map((c) => (
                        <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold uppercase text-slate-600 mb-1">Year</label>
                    <input
                      type="number"
                      value={currentBook.publication_year}
                      onChange={(e) => setCurrentBook({ ...currentBook, publication_year: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#2563eb] text-white rounded-lg font-semibold shadow"
                  >
                    Save Book
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
