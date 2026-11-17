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
                ? 'Approve, monitor waitlists, and notify students upon book return'
                : 'Track the status of your reserved library titles'}
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
              <svg className="w-4 h-4 fill-emerald-600 shrink-0" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
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

        {/* Desktop Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Book Title</th>
                  {isStaff && <th className="px-5 py-3">Student / User</th>}
                  <th className="px-5 py-3">Placed Date</th>
                  <th className="px-5 py-3">Shelf Copies</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-10 text-slate-400">Loading reservations...</td></tr>
                ) : reservations.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-10 text-slate-400">No reservations in queue.</td></tr>
                ) : (
                  reservations.map((r) => (
                    <tr key={r.reservation_id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3 font-mono font-bold text-slate-500">#{r.reservation_id}</td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-900">{r.book_title}</p>
                        <p className="text-xs text-slate-400 font-mono">{r.isbn}</p>
                      </td>
                      {isStaff && (
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-800 leading-tight">{r.requester_name}</p>
                          <p className="text-xs text-slate-400">{r.student_number || r.requester_email}</p>
                        </td>
                      )}
                      <td className="px-5 py-3 text-xs text-slate-500">{new Date(r.reservation_date).toLocaleDateString()}</td>
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
                            <button onClick={() => handleUpdateStatus(r.reservation_id, 'Approved')} className="text-xs text-emerald-600 hover:text-emerald-900 font-semibold px-2 py-1 bg-emerald-50 rounded">Approve</button>
                          )}
                          {isStaff && r.status === 'Approved' && (
                            <button onClick={() => handleUpdateStatus(r.reservation_id, 'Fulfilled')} className="text-xs text-indigo-600 hover:text-indigo-900 font-semibold px-2 py-1 bg-indigo-50 rounded">Fulfill</button>
                          )}
                          {r.status !== 'Cancelled' && r.status !== 'Fulfilled' && (
                            <button onClick={() => handleCancel(r.reservation_id)} className="text-xs text-rose-600 hover:text-rose-900 font-semibold px-2 py-1 bg-rose-50 rounded">Cancel</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
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
              reservations.map((r) => (
                <div key={r.reservation_id} className="p-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{r.book_title}</p>
                      <p className="text-xs text-slate-400 font-mono">{r.isbn}</p>
                    </div>
                    <span className={statusBadge(r.status)}>{r.status}</span>
                  </div>
                  {isStaff && (
                    <p className="text-xs text-slate-600"><span className="font-semibold">Requested by:</span> {r.requester_name}</p>
                  )}
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>Placed: {new Date(r.reservation_date).toLocaleDateString()}</span>
                    <span className={r.available_copies > 0 ? 'text-emerald-600' : 'text-slate-400'}>
                      {r.available_copies} on shelf
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {isStaff && r.status === 'Pending' && (
                      <button onClick={() => handleUpdateStatus(r.reservation_id, 'Approved')} className="text-xs text-emerald-600 font-semibold px-3 py-1.5 bg-emerald-50 rounded-lg">Approve</button>
                    )}
                    {isStaff && r.status === 'Approved' && (
                      <button onClick={() => handleUpdateStatus(r.reservation_id, 'Fulfilled')} className="text-xs text-indigo-600 font-semibold px-3 py-1.5 bg-indigo-50 rounded-lg">Fulfill</button>
                    )}
                    {r.status !== 'Cancelled' && r.status !== 'Fulfilled' && (
                      <button onClick={() => handleCancel(r.reservation_id)} className="text-xs text-rose-600 font-semibold px-3 py-1.5 bg-rose-50 rounded-lg">Cancel</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
