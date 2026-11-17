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
    borrow_days: 14,
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
      setMessage(res.data.message || 'Loan renewed successfully (+7 days added to due date)');
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

  const statusBadge = (status) => {
    const map = {
      Borrowed: 'bg-blue-100 text-blue-800',
      Returned: 'bg-emerald-100 text-emerald-800',
      Overdue: 'bg-rose-100 text-rose-700',
    };
    return `text-xs px-2.5 py-1 rounded-full font-bold ${map[status] || 'bg-slate-100 text-slate-500'}`;
  };

  // Student summary metrics
  const activeLoans = borrowings.filter(b => b.status === 'Borrowed');
  const overdueLoans = borrowings.filter(b => b.is_overdue || (b.status === 'Borrowed' && new Date(b.due_date) < new Date()));
  const totalFines = borrowings.reduce((sum, b) => sum + (b.overdue_fine || 0), 0);

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">
              {isStaff ? 'Borrowing & Returning Transactions' : 'My Borrowed Books'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isStaff
                ? 'Issue books, process returns, calculate due dates, and monitor overdue penalty fees'
                : 'Track return due dates, avoid overdue penalty fees, and renew active book loans'}
            </p>
          </div>
          {isStaff && (
            <button
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span>Issue Book Loan</span>
            </button>
          )}
        </div>

        {/* Student Overview Cards (Active Loans, Overdue, Penalty Fees) */}
        {!isStaff && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Currently Borrowed</p>
                <p className="text-lg font-bold text-slate-900">{activeLoans.length} <span className="text-xs font-normal text-slate-400">books</span></p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${overdueLoans.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Overdue Books</p>
                <p className={`text-lg font-bold ${overdueLoans.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {overdueLoans.length} <span className="text-xs font-normal text-slate-400">past due</span>
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${totalFines > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                <span className="font-bold text-base">₱</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Overdue Penalty Fees</p>
                <p className={`text-lg font-bold ${totalFines > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                  ₱{totalFines.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex justify-between items-center">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 fill-emerald-600 shrink-0" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              {message}
            </span>
            <button onClick={() => setMessage('')} className="font-bold ml-2 shrink-0">✕</button>
          </div>
        )}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-bold ml-2 shrink-0">✕</button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2 w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by book title, borrower name, barcode..."
              className="flex-1 px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            <option value="Borrowed">Currently Borrowed</option>
            <option value="Returned">Returned</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>

        {/* Table — desktop; cards — mobile */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 min-w-[780px]">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Borrow ID</th>
                  <th className="px-5 py-3">Book / Copy</th>
                  {isStaff && <th className="px-5 py-3">Borrower</th>}
                  <th className="px-5 py-3">Borrowed Date</th>
                  <th className="px-5 py-3">Return Due Date</th>
                  <th className="px-5 py-3">Returned Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Overdue Fine</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="9" className="text-center py-10 text-slate-400">Loading borrowing records...</td></tr>
                ) : borrowings.length === 0 ? (
                  <tr><td colSpan="9" className="text-center py-10 text-slate-400">No borrowing records found.</td></tr>
                ) : (
                  borrowings.map((b) => {
                    const isOverdue = b.is_overdue || (b.status === 'Borrowed' && new Date(b.due_date) < new Date());
                    const fineAmount = b.overdue_fine || 0;
                    return (
                      <tr key={b.borrow_id} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-3 font-mono font-bold text-slate-500">#{b.borrow_id}</td>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-900 leading-tight">{b.book_title}</p>
                          <p className="text-xs text-slate-400 font-mono">{b.barcode}</p>
                        </td>
                        {isStaff && (
                          <td className="px-5 py-3">
                            <p className="font-semibold text-slate-800 leading-tight">{b.borrower_name}</p>
                            <p className="text-xs text-slate-400">{b.borrower_email}</p>
                          </td>
                        )}
                        <td className="px-5 py-3 text-xs text-slate-500">
                          {b.borrow_date ? new Date(b.borrow_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col">
                            <span className={`text-xs font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                              {b.due_date ? new Date(b.due_date).toLocaleDateString() : '—'}
                            </span>
                            {isOverdue && (
                              <span className="text-[10px] text-rose-500 font-bold">
                                ⚠️ Overdue ({b.days_overdue || 1}d)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs">
                          {b.return_date ? (
                            <span className="text-emerald-700 font-medium flex items-center gap-1">
                              <span>✓</span> {new Date(b.return_date).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-medium">
                              Not Returned Yet
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={statusBadge(isOverdue ? 'Overdue' : b.status)}>
                            {isOverdue ? 'Overdue' : b.status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {fineAmount > 0 ? (
                            <span className="text-xs font-bold text-rose-600 px-2 py-0.5 bg-rose-50 rounded border border-rose-200">
                              ₱{fineAmount.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">₱0.00</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-2 flex-wrap items-center">
                            {b.status === 'Borrowed' && (
                              <>
                                <button
                                  onClick={() => handleRenew(b.borrow_id)}
                                  className="text-xs text-blue-600 hover:text-blue-900 font-semibold px-2 py-1 bg-blue-50 rounded"
                                >
                                  Renew
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
                              <span className="text-xs text-slate-400 font-medium">Completed</span>
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

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="text-center py-10 text-slate-400 text-sm">Loading...</div>
            ) : borrowings.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">No borrowing records found.</div>
            ) : (
              borrowings.map((b) => {
                const isOverdue = b.is_overdue || (b.status === 'Borrowed' && new Date(b.due_date) < new Date());
                const fineAmount = b.overdue_fine || 0;
                return (
                  <div key={b.borrow_id} className="p-4 space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{b.book_title}</p>
                        <p className="text-xs text-slate-400 font-mono">{b.barcode}</p>
                      </div>
                      <span className={statusBadge(isOverdue ? 'Overdue' : b.status)}>
                        {isOverdue ? 'Overdue' : b.status}
                      </span>
                    </div>

                    {isStaff && (
                      <p className="text-xs text-slate-600"><span className="font-semibold">Borrower:</span> {b.borrower_name}</p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl">
                      <div>
                        <span className="block text-[11px] text-slate-400">Borrowed</span>
                        <span className="font-medium text-slate-700">{b.borrow_date ? new Date(b.borrow_date).toLocaleDateString() : '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-400">Due Date</span>
                        <span className={`font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                          {b.due_date ? new Date(b.due_date).toLocaleDateString() : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-400">Returned Date</span>
                        <span className="font-medium text-slate-700">
                          {b.return_date ? new Date(b.return_date).toLocaleDateString() : 'Still with Student'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-400">Overdue Penalty</span>
                        <span className={`font-bold ${fineAmount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                          ₱{fineAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {b.status === 'Borrowed' && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => handleRenew(b.borrow_id)} className="text-xs text-blue-600 font-semibold px-3 py-1.5 bg-blue-50 rounded-lg">Renew Loan (+7d)</button>
                        {isStaff && <button onClick={() => handleReturn(b.borrow_id)} className="text-xs text-emerald-600 font-semibold px-3 py-1.5 bg-emerald-50 rounded-lg">Return</button>}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Issue Loan Modal (Staff Only) */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-start sm:items-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 my-4">
              <div className="flex justify-between items-center mb-4 pb-3 border-b">
                <h3 className="font-bold text-slate-800 text-lg">Issue Book Copy to Borrower</h3>
                <button onClick={() => setShowModal(false)} className="font-bold text-slate-500 hover:text-slate-800">✕</button>
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

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold shadow">
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
