import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = () => {
    setLoading(true);
    api.get('/api/notifications')
      .then(res => setNotifications(res.data.notifications || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">In-System Notifications</h1>
            <p className="text-xs text-slate-500 mt-0.5">Borrowing alerts, due date notices, and reservation updates</p>
          </div>
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition"
          >
            Mark All as Read
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No notifications at this time.</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-xl border flex justify-between items-start transition ${
                  n.is_read === 0 ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-100'
                }`}
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-base">
                      {n.type?.includes('BORROW') ? '📚' : n.type?.includes('RETURN') ? '✅' : '🔔'}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{n.title}</h4>
                    {n.is_read === 0 && (
                      <span className="text-xs bg-indigo-600 text-white font-bold px-2 py-0.2 rounded-full">New</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {n.is_read === 0 && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-900"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
