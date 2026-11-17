import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';

export default function Borrowings() {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase() || 'user';
  const isStaff = role === 'admin' || role === 'librarian';

  const [borrowings, setBorrowings] = useState([]);
  const [users, setUsers] = useState([]);
  const [availableCopies, setAvailableCopies] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // New Borrowing Modal
  const [showModal, setShowModal] = useState(false);
  const [newLoan, setNewLoan] = useState({
    user_id: '',
    copy_id: '',
    borrow_days: 14
  });

  const loadData = () => {
    setLoading(true);
    let url = `/api/borrowings?search=${encodeURIComponent(search)}`;
    if (statusFilter) url += `&status=${statusFilter}`;

    const requests = [api.get(url)];
    if (isStaff) {
      requests.push(api.get('/api/users'));
      requests.push(api.get('/api/copies?status=Available'));
    }

    Promise.all(requests)
      .then(([borrowRes, usersRes, copiesRes]) => {
        setBorrowings(borrowRes.data.borrowings || []);
        if (usersRes) setUsers(usersRes.data.users || []);
        if (copiesRes) {
          setAvailableCopies(copiesRes.data.copies || []);
          if (copiesRes.data.copies?.length > 0 && !newLoan.copy_id) {
            setNewLoan(prev => ({ ...prev, copy_id: copiesRes.data.copies[0].copy_id }));
          }
        }
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load borrowing records'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleReturn = async (borrowId) => {
    if (!window.confirm('Process return for this book copy?')) return;
    try {
      const res = await api.post(`/api/borrowings/${borrowId}/return`);
      setMessage(res.data.message || 'Book returned successfully');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Return processing failed');
    }
  };

  const handleRenew = async (borrowId) => {
    try {
      const res = await api.post(`/api/borrowings/${borrowId}/renew`);
      setMessage(res.data.message || 'Loan renewed successfully');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Renewal failed');
    }
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/borrowings', newLoan);
      setMessage(res.data.message || 'Borrowing registered');
      setShowModal(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to issue book');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {isStaff ? 'Borrowing & Returning Transactions' : 'My Borrowed Books'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isStaff ? 'Issue books, process returns, calculate due dates, and monitor overdues' : 'Track due dates and renew your loans'}
            </p>
          </div>
          {isStaff && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition flex items-center space-x-2"
            >
              <span>➕</span>
              <span>Issue Book Loan</span>
            </button>
          )}
        </div>

        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex justify-between items-center">
            <span>✅ {message}</span>
            <button onClick={() => setMessage('')} className="font-bold">✕</button>
          </div>
        )}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex justify-between items-center">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="font-bold">✕</button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2 w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Title, Barcode, Borrower Name..."
              className="flex-1 px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button type="submit" className="px-5 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl">
              Search
            </button>
          </form>

          <div className="w-full md:w-56">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm"
            >
              <option value="">All Statuses</option>
              <option value="Borrowed">Active (Borrowed)</option>
              <option value="Returned">Returned</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Loan ID</th>
                  <th className="px-6 py-3">Book Title</th>
                  <th className="px-6 py-3">Barcode</th>
                  {isStaff && <th className="px-6 py-3">Borrower</th>}
                  <th className="px-6 py-3">Borrow Date</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-slate-400">Loading loan records...</td>
                  </tr>
                ) : borrowings.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-slate-400">No borrowing records found.</td>
                  </tr>
                ) : (
                  borrowings.map((b) => {
                    const isOverdue = b.status === 'Borrowed' && new Date(b.due_date) < new Date();
                    return (
                      <tr key={b.borrow_id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-3 font-mono font-bold text-slate-500">#{b.borrow_id}</td>
                        <td className="px-6 py-3 font-semibold text-slate-900">{b.book_title}</td>
                        <td className="px-6 py-3 font-mono text-xs text-indigo-600 font-bold">{b.barcode}</td>
                        {isStaff && (
                          <td className="px-6 py-3">
                            <p className="font-semibold text-slate-800 leading-tight">{b.borrower_name}</p>
                            <p className="text-xs text-slate-400">{b.student_number || b.borrower_email}</p>
                          </td>
                        )}
                        <td className="px-6 py-3 text-xs">{new Date(b.borrow_date).toLocaleDateString()}</td>
                        <td className="px-6 py-3 text-xs">
                          <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                            {new Date(b.due_date).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                              b.status === 'Returned'
                                ? 'bg-slate-100 text-slate-600'
                                : isOverdue
                                ? 'bg-rose-100 text-rose-800 animate-pulse'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isOverdue ? 'OVERDUE' : b.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {b.status === 'Borrowed' && (
                              <>
                                <button
                                  onClick={() => handleRenew(b.borrow_id)}
                                  className="text-xs text-indigo-600 hover:text-indigo-900 font-semibold px-2 py-1 bg-indigo-50 rounded"
                                >
                                  Renew (+14d)
                                </button>
                                {isStaff && (
                                  <button
                                    onClick={() => handleReturn(b.borrow_id)}
                                    className="text-xs text-emerald-600 hover:text-emerald-900 font-semibold px-2 py-1 bg-emerald-50 rounded"
                                  >
                                    Return
                                  </button>
                                )}
                              </>
                            )}
                            {b.status === 'Returned' && (
                              <span className="text-xs text-slate-400 font-mono">
                                Returned {b.return_date ? new Date(b.return_date).toLocaleDateString() : ''}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Issue Loan Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-4 pb-3 border-b">
                <h3 className="font-bold text-slate-800 text-lg">Issue Book Copy to Borrower</h3>
                <button onClick={() => setShowModal(false)} className="font-bold">✕</button>
              </div>

              <form onSubmit={handleCreateLoan} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Select Borrower</label>
                  <select
                    required
                    value={newLoan.user_id}
                    onChange={(e) => setNewLoan({ ...newLoan, user_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  >
                    <option value="">-- Choose User / Student --</option>
                    {users.map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.full_name} ({u.role}) - {u.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Select Available Physical Copy</label>
                  <select
                    required
                    value={newLoan.copy_id}
                    onChange={(e) => setNewLoan({ ...newLoan, copy_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  >
                    {availableCopies.length === 0 ? (
                      <option value="">No available copies</option>
                    ) : (
                      availableCopies.map((c) => (
                        <option key={c.copy_id} value={c.copy_id}>
                          {c.barcode} - {c.book_title}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Loan Period (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={newLoan.borrow_days}
                    onChange={(e) => setNewLoan({ ...newLoan, borrow_days: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow"
                  >
                    Complete Transaction
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
