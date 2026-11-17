import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import Swal from 'sweetalert2';

export default function Copies() {
  const [copies, setCopies] = useState([]);
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [loading, setLoading] = useState(true);

  // Add Copy modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCopy, setNewCopy] = useState({
    book_id: '',
    barcode: '',
    quantity: 1,
    status: 'Available',
  });
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Edit Copy modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCopy, setEditingCopy] = useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const loadData = () => {
    setLoading(true);
    let url = `/api/copies?search=${encodeURIComponent(search)}&sort=${sortOrder}`;
    if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;

    Promise.all([api.get(url), api.get('/api/books')])
      .then(([copiesRes, booksRes]) => {
        setCopies(copiesRes.data.copies || []);
        const loadedBooks = booksRes.data.books || [];
        setBooks(loadedBooks);
        if (loadedBooks.length > 0 && !newCopy.book_id) {
          setNewCopy((prev) => ({ ...prev, book_id: loadedBooks[0].book_id }));
        }
      })
      .catch((err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error Loading Copies',
          text: err.response?.data?.message || 'Failed to fetch book copies inventory.',
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  // Helper for Copy ID display (e.g., C001, C002, C010)
  const formatCopyId = (copy) => {
    if (copy.copy_code) return copy.copy_code;
    return 'C' + String(copy.copy_id || copy.id || 0).padStart(3, '0');
  };

  // Open Edit Modal
  const handleOpenEdit = (copy) => {
    setEditingCopy({
      copy_id: copy.copy_id,
      copy_code: formatCopyId(copy),
      book_title: copy.book_title,
      author: copy.author,
      barcode: copy.barcode,
      status: copy.status,
    });
    setShowEditModal(true);
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingCopy) return;

    setIsSubmittingEdit(true);
    try {
      await api.put(`/api/copies/${editingCopy.copy_id}`, {
        barcode: editingCopy.barcode,
        status: editingCopy.status,
      });

      setShowEditModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: `Copy ${editingCopy.copy_code} has been successfully updated.`,
        timer: 1600,
        showConfirmButton: false,
      });
      loadData();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.response?.data?.message || 'Could not update this copy.',
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Add Copy
  const handleAddCopy = async (e) => {
    e.preventDefault();
    if (!newCopy.book_id) {
      Swal.fire({ icon: 'warning', title: 'Missing Book', text: 'Please select a book.' });
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const res = await api.post('/api/copies', newCopy);
      setShowAddModal(false);
      setNewCopy({
        book_id: books[0]?.book_id || '',
        barcode: '',
        quantity: 1,
        status: 'Available',
      });

      Swal.fire({
        icon: 'success',
        title: 'Added!',
        text: res.data.message || 'Book copy registered successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
      loadData();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Failed to Add Copy',
        text: err.response?.data?.message || 'An error occurred while creating the copy.',
      });
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Delete Copy with SweetAlert2 confirmation
  const handleDeleteCopy = (copy) => {
    const copyCode = formatCopyId(copy);
    Swal.fire({
      title: 'Delete Book Copy?',
      text: `Are you sure you want to delete copy ${copyCode} (Barcode: ${copy.barcode})? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/api/copies/${copy.copy_id}`);
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: `Book copy ${copyCode} was deleted successfully.`,
            timer: 1500,
            showConfirmButton: false,
          });
          loadData();
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Cannot Delete',
            text: err.response?.data?.message || 'Failed to delete copy.',
          });
        }
      }
    });
  };

  // Status badge styling helper
  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'available') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Available
        </span>
      );
    }
    if (s === 'borrowed') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          Borrowed
        </span>
      );
    }
    if (s === 'maintenance') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          Maintenance
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        {status}
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-5">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Book Copies</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Total: <span className="font-semibold text-slate-700">{copies.length} copies</span>
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>+ Add Copy</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 w-full">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or barcode..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition shrink-0"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-40 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Borrowed">Borrowed</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Damaged">Damaged</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full md:w-36 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="asc">ID (C001 ↑)</option>
              <option value="desc">ID (Latest ↓)</option>
            </select>
          </div>
        </div>

        {/* Book Copies Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[760px]">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">COPY ID</th>
                  <th className="px-6 py-3.5">BOOK TITLE</th>
                  <th className="px-6 py-3.5">AUTHOR</th>
                  <th className="px-6 py-3.5">BARCODE</th>
                  <th className="px-6 py-3.5">STATUS</th>
                  <th className="px-6 py-3.5 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-400">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2"></div>
                      <p className="text-xs">Loading physical book copies...</p>
                    </td>
                  </tr>
                ) : copies.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-400">
                      <p className="text-sm font-semibold text-slate-600">No book copies found</p>
                      <p className="text-xs mt-1">Try adjusting your search or add a new copy.</p>
                    </td>
                  </tr>
                ) : (
                  copies.map((copy) => (
                    <tr key={copy.copy_id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Copy ID */}
                      <td className="px-6 py-4 font-semibold text-slate-800 tracking-tight">
                        {formatCopyId(copy)}
                      </td>

                      {/* Book Title */}
                      <td className="px-6 py-4 font-medium text-slate-900 max-w-xs truncate" title={copy.book_title}>
                        {copy.book_title}
                      </td>

                      {/* Author */}
                      <td className="px-6 py-4 text-slate-500">
                        {copy.author || 'Unknown'}
                      </td>

                      {/* Barcode */}
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {copy.barcode}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {renderStatusBadge(copy.status)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center space-x-1.5">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(copy)}
                            title="Edit Copy"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCopy(copy)}
                            title="Delete Copy"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="text-center py-10 text-slate-400 text-sm">Loading book copies...</div>
            ) : copies.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">No book copies found.</div>
            ) : (
              copies.map((copy) => (
                <div key={copy.copy_id} className="p-4 space-y-2.5">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{formatCopyId(copy)}</span>
                        {renderStatusBadge(copy.status)}
                      </div>
                      <p className="font-medium text-slate-800 text-sm mt-0.5">{copy.book_title}</p>
                      <p className="text-xs text-slate-500">{copy.author || 'Unknown'}</p>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(copy)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteCopy(copy)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    Barcode: <span className="text-slate-600 font-semibold">{copy.barcode}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal: Add Book Copy */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 my-auto">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-lg">Add Book Copy</h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold p-1 text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddCopy} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold uppercase text-slate-600 mb-1">Select Book *</label>
                  <select
                    required
                    value={newCopy.book_id}
                    onChange={(e) => setNewCopy({ ...newCopy, book_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {books.map((b) => (
                      <option key={b.book_id} value={b.book_id}>
                        {b.title} — {b.author || 'Author'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-600 mb-1">
                    Number of Copies to Add
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newCopy.quantity}
                    onChange={(e) => setNewCopy({ ...newCopy, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Adds sequential copy IDs (e.g. C001, C002...) for this title.
                  </p>
                </div>

                {newCopy.quantity === 1 && (
                  <div>
                    <label className="block font-semibold uppercase text-slate-600 mb-1">
                      Barcode (Optional)
                    </label>
                    <input
                      type="text"
                      value={newCopy.barcode}
                      onChange={(e) => setNewCopy({ ...newCopy, barcode: e.target.value })}
                      placeholder="Leave blank to auto-generate (e.g. BC-0001-01)"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold uppercase text-slate-600 mb-1">Initial Status</label>
                  <select
                    value={newCopy.status}
                    onChange={(e) => setNewCopy({ ...newCopy, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Available">Available</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Damaged">Damaged</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAdd}
                    className="px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow disabled:opacity-50"
                  >
                    {isSubmittingAdd ? 'Adding...' : 'Register Copies'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Book Copy */}
        {showEditModal && editingCopy && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 my-auto">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Edit Book Copy</h3>
                  <p className="text-xs text-blue-600 font-semibold">{editingCopy.copy_code}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold p-1 text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold uppercase text-slate-600 mb-1">Book Title</label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium text-sm">
                    {editingCopy.book_title}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{editingCopy.author}</p>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-600 mb-1">Barcode *</label>
                  <input
                    type="text"
                    required
                    value={editingCopy.barcode}
                    onChange={(e) => setEditingCopy({ ...editingCopy, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-600 mb-1">Status</label>
                  <select
                    value={editingCopy.status}
                    onChange={(e) => setEditingCopy({ ...editingCopy, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Available">Available</option>
                    <option value="Borrowed">Borrowed</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit}
                    className="px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow disabled:opacity-50"
                  >
                    {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
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