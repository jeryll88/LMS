import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';

export default function Reservations() {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase() || 'user';
  const isStaff = role === 'admin' || role === 'librarian';

  const [reservations, setReservations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  const handleUpdateStatus = async (resvId, newStatus) => {
    try {
      const res = await api.put(`/api/reservations/${resvId}`, { status: newStatus });
      setMessage(res.data.message || 'Status updated');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  const handleCancel = async (resvId) => {
    if (!window.confirm('Cancel this reservation?')) return;
    try {
      const res = await api.delete(`/api/reservations/${resvId}`);
      setMessage(res.data.message || 'Reservation cancelled');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Cancellation failed');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {isStaff ? 'Book Reservation Queue' : 'My Book Reservations'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isStaff ? 'Approve, monitor waitlists, and notify students upon book return' : 'Track the status of your reserved library titles'}
            </p>
          </div>

          <div className="w-full sm:w-56">
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

        {/* Reservations Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Reservation ID</th>
                  <th className="px-6 py-3">Book Title</th>
                  <th className="px-6 py-3">ISBN</th>
                  {isStaff && <th className="px-6 py-3">Student / User</th>}
                  <th className="px-6 py-3">Placed Date</th>
                  <th className="px-6 py-3">Shelf Availability</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-slate-400">Loading reservations...</td>
                  </tr>
                ) : reservations.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-slate-400">No reservations in queue.</td>
                  </tr>
                ) : (
                  reservations.map((r) => (
                    <tr key={r.reservation_id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-3 font-mono font-bold text-slate-500">#{r.reservation_id}</td>
                      <td className="px-6 py-3 font-semibold text-slate-900">{r.book_title}</td>
                      <td className="px-6 py-3 font-mono text-xs text-slate-400">{r.isbn}</td>
                      {isStaff && (
                        <td className="px-6 py-3">
                          <p className="font-semibold text-slate-800 leading-tight">{r.requester_name}</p>
                          <p className="text-xs text-slate-400">{r.student_number || r.requester_email}</p>
                        </td>
                      )}
                      <td className="px-6 py-3 text-xs">{new Date(r.reservation_date).toLocaleDateString()}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-semibold ${
                            r.available_copies > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {r.available_copies} copy on shelf
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                            r.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'Pending'
                              ? 'bg-amber-100 text-amber-800'
                              : r.status === 'Fulfilled'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {isStaff && r.status === 'Pending' && (
                            <button
                              onClick={() => handleUpdateStatus(r.reservation_id, 'Approved')}
                              className="text-xs text-emerald-600 hover:text-emerald-900 font-semibold px-2 py-1 bg-emerald-50 rounded"
                            >
                              Approve
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
