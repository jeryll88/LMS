import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import Swal from 'sweetalert2';

export default function Reservations() {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase() || 'user';
  const isStaff = role === 'admin' || role === 'librarian';

  const [reservations, setReservations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Approval Modal State
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedResv, setSelectedResv] = useState(null);
  const [dueDate, setDueDate] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Helper to get formatted date string for inputs (YYYY-MM-DD)
  const getFutureDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const loadData = () => {
    setLoading(true);
    let url = '/api/reservations';
    if (statusFilter) url += `?status=${statusFilter}`;

    api.get(url)
      .then(res => setReservations(res.data.reservations || []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load reservations'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleOpenApproveModal = (resv) => {
    setSelectedResv(resv);
    setDueDate(getFutureDate(7)); // default 7 days loan
    setShowApproveModal(true);
  };

  const handleConfirmApproval = async (e) => {
    if (e) e.preventDefault();
    if (!selectedResv || !dueDate) return;

    setSubmittingApproval(true);
    try {
      const res = await api.put(`/api/reservations/${selectedResv.reservation_id}`, {
        status: 'Approved',
        due_date: dueDate,
      });
      Swal.fire({
        icon: 'success',
        title: 'Reservation Approved!',
        text: res.data.message || `Return due date set to ${new Date(dueDate).toLocaleDateString()}. One physical copy is now checked out to the student.`,
        timer: 2000,
        showConfirmButton: false,
      });
      setShowApproveModal(false);
      setSelectedResv(null);
      loadData();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Approval Failed',
        text: err.response?.data?.message || 'Failed to approve reservation.',
      });
    } finally {
      setSubmittingApproval(false);
    }
  };

  const handleUpdateStatus = async (resvId, newStatus) => {
    try {
      const res = await api.put(`/api/reservations/${resvId}`, { status: newStatus });
      Swal.fire({
        icon: 'success',
        title: 'Status Updated',
        text: res.data.message || `Reservation status updated to ${newStatus}.`,
        timer: 1600,
        showConfirmButton: false,
      });
      loadData();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.response?.data?.message || 'Update failed.',
      });
    }
  };

  const handleCancel = (resvId) => {
    Swal.fire({
      title: 'Cancel Reservation?',
      text: 'Are you sure you want to cancel this reservation? If a physical copy was allocated, it will be restored to the shelves.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, cancel it',
      cancelButtonText: 'No, keep it',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await api.delete(`/api/reservations/${resvId}`);
          Swal.fire({
            icon: 'success',
            title: 'Cancelled',
            text: res.data.message || 'Reservation cancelled and shelf copy restored.',
            timer: 1600,
            showConfirmButton: false,
          });
          loadData();
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Cancellation Failed',
            text: err.response?.data?.message || 'Cancellation failed.',
          });
        }
      }
    });
  };

  const statusBadge = (status) => {
    const map = {
      Approved: 'bg-emerald-100 text-emerald-800',
      Pending: 'bg-amber-100 text-amber-800',
      Fulfilled: 'bg-indigo-100 text-indigo-800',
      Cancelled: 'bg-slate-100 text-slate-500',
    };
    return `text-xs px-2.5 py-1 rounded-full font-bold ${map[status] || 'bg-slate-100 text-slate-500'}`;
  };

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">
              {isStaff ? 'Book Reservation Queue' : 'My Book Reservations'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isStaff
                ? 'Approve reservations, set return deadlines, monitor waitlists, and enforce overdue fees'
                : 'Track the status and return due dates of your reserved library titles'}
            </p>
          </div>
          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved (Ready)</option>
              <option value="Fulfilled">Fulfilled</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Alerts */}
        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex justify-between items-center">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 fill-emerald-600 shrink-0" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {message}
            </span>
            <button onClick={() => setMessage('')} className="font-bold ml-2">✕</button>
          </div>
        )}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-bold ml-2">✕</button>
          </div>
        )}

        {/* Approved Reservation Notice for Students */}
        {!isStaff && reservations.some(r => r.status === 'Approved') && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between text-xs shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                ✓
              </div>
              <div>
                <p className="font-bold text-sm text-emerald-950">You have a book reservation approved and ready for pickup!</p>
                <p className="text-emerald-800 mt-0.5">Please visit the library counter to claim your book copy. Note your assigned return due date to prevent overdue penalty fees (₱10.00/day).</p>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 min-w-[780px]">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Book Title</th>
                  {isStaff && <th className="px-5 py-3">Student / User</th>}
                  <th className="px-5 py-3">Placed Date</th>
                  <th className="px-5 py-3">Return Due Date</th>
                  <th className="px-5 py-3">Shelf Copies</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="8" className="text-center py-10 text-slate-400">Loading reservations...</td></tr>
                ) : reservations.length === 0 ? (
                  <tr><td colSpan="8" className="text-center py-10 text-slate-400">No reservations in queue.</td></tr>
                ) : (
                  reservations.map((r) => {
                    const isOverdue = r.due_date && new Date(r.due_date) < new Date() && r.status === 'Approved';
                    return (
                      <tr key={r.reservation_id} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-3 font-mono font-bold text-slate-500">#{r.reservation_id}</td>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-900">{r.book_title}</p>
                          <p className="text-xs text-slate-400 font-mono">{r.isbn}</p>
                        </td>
                        {isStaff && (
                          <td className="px-5 py-3">
                            <p className="font-semibold text-slate-800 leading-tight">{r.requester_name}</p>
                            <p className="text-xs text-slate-400 font-mono">{r.student_number || r.requester_email}</p>
                          </td>
                        )}
                        <td className="px-5 py-3 text-xs text-slate-500">
                          {new Date(r.reservation_date).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3">
                          {r.due_date ? (
                            <div className="flex flex-col">
                              <span className={`text-xs font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                                {new Date(r.due_date).toLocaleDateString()}
                              </span>
                              {isOverdue && (
                                <span className="inline-flex items-center text-[10px] text-rose-600 font-bold">
                                  ⚠️ Overdue (₱10/day fee)
                                </span>
                              )}
                              {!isOverdue && r.status === 'Approved' && (
                                <span className="text-[10px] text-emerald-600 font-medium">
                                  Return deadline
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              {r.status === 'Pending' ? 'Pending Approval' : '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${r.available_copies > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {r.available_copies} on shelf
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={statusBadge(r.status)}>{r.status}</span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-2 flex-wrap">
                            {isStaff && r.status === 'Pending' && (
                              <button
                                onClick={() => handleOpenApproveModal(r)}
                                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition flex items-center gap-1"
                              >
                                <span>Approve</span>
                              </button>
                            )}
                            {isStaff && r.status === 'Approved' && (
                              <button
                                onClick={() => handleUpdateStatus(r.reservation_id, 'Fulfilled')}
                                className="text-xs text-indigo-600 hover:text-indigo-900 font-semibold px-2 py-1 bg-indigo-50 rounded"
                              >
                                Fulfill
                              </button>
                            )}
                            {r.status !== 'Cancelled' && r.status !== 'Fulfilled' && (
                              <button
                                onClick={() => handleCancel(r.reservation_id)}
                                className="text-xs text-rose-600 hover:text-rose-900 font-semibold px-2 py-1 bg-rose-50 rounded"
                              >
                                Cancel
                              </button>
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
            ) : reservations.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">No reservations in queue.</div>
            ) : (
              reservations.map((r) => {
                const isOverdue = r.due_date && new Date(r.due_date) < new Date() && r.status === 'Approved';
                return (
                  <div key={r.reservation_id} className="p-4 space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{r.book_title}</p>
                        <p className="text-xs text-slate-400 font-mono">{r.isbn}</p>
                      </div>
                      <span className={statusBadge(r.status)}>{r.status}</span>
                    </div>

                    {isStaff && (
                      <p className="text-xs text-slate-600">
                        <span className="font-semibold">Requested by:</span> {r.requester_name} ({r.student_number || r.requester_email})
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl">
                      <div>
                        <span className="block text-[11px] text-slate-400">Placed Date</span>
                        <span className="font-medium text-slate-700">{new Date(r.reservation_date).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-400">Return Due Date</span>
                        {r.due_date ? (
                          <span className={`font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                            {new Date(r.due_date).toLocaleDateString()}
                            {isOverdue && <span className="block text-[10px] text-rose-500 font-bold">⚠️ Overdue fee applies</span>}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Pending Approval</span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${r.available_copies > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {r.available_copies} copies on shelf
                      </span>
                      <div className="flex gap-2 flex-wrap">
                        {isStaff && r.status === 'Pending' && (
                          <button
                            onClick={() => handleOpenApproveModal(r)}
                            className="text-xs text-emerald-700 font-bold px-3 py-1.5 bg-emerald-100 rounded-lg"
                          >
                            Approve
                          </button>
                        )}
                        {isStaff && r.status === 'Approved' && (
                          <button
                            onClick={() => handleUpdateStatus(r.reservation_id, 'Fulfilled')}
                            className="text-xs text-indigo-600 font-semibold px-3 py-1.5 bg-indigo-50 rounded-lg"
                          >
                            Fulfill
                          </button>
                        )}
                        {r.status !== 'Cancelled' && r.status !== 'Fulfilled' && (
                          <button
                            onClick={() => handleCancel(r.reservation_id)}
                            className="text-xs text-rose-600 font-semibold px-3 py-1.5 bg-rose-50 rounded-lg"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* LIBRARIAN APPROVAL & DUE DATE MODAL                       */}
        {/* ========================================================= */}
        {showApproveModal && selectedResv && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 my-auto">
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                    ✓
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Approve Book Reservation</h3>
                    <p className="text-[11px] text-slate-500">Assign return deadline & policy for this borrowing loan</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="font-bold text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Book & Student Info Summary Card */}
              <div className="my-4 p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Book Title</span>
                    <p className="text-xs font-bold text-slate-800">{selectedResv.book_title}</p>
                    <p className="text-[11px] text-slate-400 font-mono">ISBN: {selectedResv.isbn}</p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold shrink-0">
                    {selectedResv.available_copies} on shelf
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Student / Borrower</span>
                    <p className="font-semibold text-slate-800">{selectedResv.requester_name}</p>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{selectedResv.student_number || selectedResv.requester_email}</span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleConfirmApproval} className="space-y-4">
                {/* Return Due Date Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Return Due Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />

                  {/* Preset Shortcut Buttons */}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setDueDate(getFutureDate(3))}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition ${
                        dueDate === getFutureDate(3)
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      3 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setDueDate(getFutureDate(7))}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition ${
                        dueDate === getFutureDate(7)
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      7 Days (1 Week)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDueDate(getFutureDate(14))}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition ${
                        dueDate === getFutureDate(14)
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      14 Days (2 Weeks)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDueDate(getFutureDate(30))}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition ${
                        dueDate === getFutureDate(30)
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      30 Days (1 Month)
                    </button>
                  </div>
                </div>

                {/* Overdue Penalty Notice Box */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-800">
                    <svg className="w-4 h-4 fill-amber-600 shrink-0" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>Overdue Penalty & Fine Policy</span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 leading-relaxed">
                    The student must return this book on or before <strong className="underline">{dueDate ? new Date(dueDate).toLocaleDateString() : 'the selected date'}</strong>.
                    Late returns past this due date will incur an overdue fine of <span className="font-bold text-rose-600">₱10.00 per day</span> until the book is returned to the library.
                  </p>
                </div>

                {/* Modal Action Buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowApproveModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingApproval}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5"
                  >
                    <span>{submittingApproval ? 'Approving...' : 'Approve & Set Due Date'}</span>
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
