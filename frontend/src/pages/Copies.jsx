import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

export default function Copies() {
  const [copies, setCopies] = useState([]);
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Add Copy modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCopy, setNewCopy] = useState({
    book_id: '',
    barcode: '',
    status: 'Available'
  });

  const loadData = () => {
    setLoading(true);
    let url = `/api/copies?search=${encodeURIComponent(search)}`;
    if (statusFilter) url += `&status=${statusFilter}`;

    Promise.all([
      api.get(url),
      api.get('/api/books')
    ])
      .then(([copiesRes, booksRes]) => {
        setCopies(copiesRes.data.copies || []);
        setBooks(booksRes.data.books || []);
        if (booksRes.data.books?.length > 0 && !newCopy.book_id) {
          setNewCopy(prev => ({ ...prev, book_id: booksRes.data.books[0].book_id }));
        }
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load copies'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleStatusChange = async (copyId, newStatus) => {
    try {
      const res = await api.put(`/api/copies/${copyId}`, { status: newStatus });
      setMessage(res.data.message || 'Status updated');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update copy status');
    }
  };

  const handleAddCopy = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/copies', newCopy);
      setMessage(res.data.message || 'Copy added');
      setShowAddModal(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add copy');
    }
  };

  const handleDeleteCopy = async (copyId, barcode) => {
    if (!window.confirm(`Delete physical copy with barcode ${barcode}?`)) return;
    try {
      const res = await api.delete(`/api/copies/${copyId}`);
      setMessage(res.data.message || 'Copy deleted');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">Physical Book Copies Inventory</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage barcode tags, condition, and availability per physical item</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>Register New Copy</span>
          </button>
        </div>

        {/* Alerts */}
        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex justify-between items-center">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="font-bold ml-2">✕</button>
          </div>
        )}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-bold ml-2">✕</button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2 w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Barcode, Book Title, ISBN..."
              className="flex-1 px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button type="submit" className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition shrink-0">
              Search
            </button>
          </form>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-44 px-3 py-2 border rounded-xl text-sm"
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Borrowed">Borrowed</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Damaged">Damaged</option>
          </select>
        </div>

        {/* Desktop Table & Mobile Cards */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Barcode</th>
                  <th className="px-5 py-3">Book Title</th>
                  <th className="px-5 py-3">ISBN</th>
                  <th className="px-5 py-3">Condition / Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-10 text-slate-400">Loading copies...</td></tr>
                ) : copies.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-10 text-slate-400">No copies found.</td></tr>
                ) : (
                  copies.map((c) => (
                    <tr key={c.copy_id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3 font-mono font-bold text-slate-800">{c.barcode}</td>
                      <td className="px-5 py-3 font-semibold text-slate-900">{c.book_title}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">{c.isbn}</td>
                      <td className="px-5 py-3">
                        <select
                          value={c.status}
                          onChange={(e) => handleStatusChange(c.copy_id, e.target.value)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                            c.status === 'Available'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : c.status === 'Borrowed'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <option value="Available">Available</option>
                          <option value="Borrowed">Borrowed</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Damaged">Damaged</option>
                        </select>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleDeleteCopy(c.copy_id, c.barcode)}
                          className="text-xs text-rose-600 hover:text-rose-900 font-semibold px-2 py-1 bg-rose-50 rounded"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="text-center py-10 text-slate-400 text-sm">Loading copies...</div>
            ) : copies.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">No copies found.</div>
            ) : (
              copies.map((c) => (
                <div key={c.copy_id} className="p-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{c.book_title}</p>
                      <p className="text-xs font-mono font-bold text-slate-600">{c.barcode}</p>
                    </div>
                    <select
                      value={c.status}
                      onChange={(e) => handleStatusChange(c.copy_id, e.target.value)}
                      className="text-xs px-2.5 py-1 rounded-lg font-bold border bg-white"
                    >
                      <option value="Available">Available</option>
                      <option value="Borrowed">Borrowed</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Damaged">Damaged</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span className="font-mono">ISBN: {c.isbn}</span>
                    <button
                      onClick={() => handleDeleteCopy(c.copy_id, c.barcode)}
                      className="text-xs text-rose-600 font-semibold px-2 py-1 bg-rose-50 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add Copy Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-base sm:text-lg">Register Physical Copy</h3>
                <button type="button" onClick={() => setShowAddModal(false)} className="font-bold text-slate-400 hover:text-slate-700 p-1">✕</button>
              </div>

              <form onSubmit={handleAddCopy} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold uppercase text-slate-600 mb-1">Select Book</label>
                  <select
                    required
                    value={newCopy.book_id}
                    onChange={(e) => setNewCopy({ ...newCopy, book_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    {books.map((b) => (
                      <option key={b.book_id} value={b.book_id}>
                        {b.title} (ISBN: {b.isbn})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-600 mb-1">Barcode (Optional - auto-generated if blank)</label>
                  <input
                    type="text"
                    value={newCopy.barcode}
                    onChange={(e) => setNewCopy({ ...newCopy, barcode: e.target.value })}
                    placeholder="e.g. BC001-99"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-600 mb-1">Initial Status</label>
                  <select
                    value={newCopy.status}
                    onChange={(e) => setNewCopy({ ...newCopy, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="Available">Available</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Damaged">Damaged</option>
                  </select>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold shadow"
                  >
                    Register Copy
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
