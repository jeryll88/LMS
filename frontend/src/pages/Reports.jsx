import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReport = (tab) => {
    setLoading(true);
    setError('');
    let endpoint = '/api/reports/inventory';
    if (tab === 'borrowings') endpoint = '/api/reports/borrowings';
    if (tab === 'overdue') endpoint = '/api/reports/overdue';
    if (tab === 'popular') endpoint = '/api/reports/popular-books';

    api.get(endpoint)
      .then(res => {
        if (tab === 'inventory') setData(res.data.inventory || []);
        if (tab === 'borrowings') setData(res.data.borrowings || []);
        if (tab === 'overdue') setData(res.data.overdue || []);
        if (tab === 'popular') setData(res.data.popular_books || []);
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load report'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReport(activeTab);
  }, [activeTab]);

  const exportCSV = () => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(val => `"${val !== null ? val : ''}"`).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeTab}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Library Reports & Statistical Analytics</h1>
            <p className="text-xs text-slate-500 mt-0.5">Live operational exports from Neon PostgreSQL</p>
          </div>
          <button
            onClick={exportCSV}
            disabled={data.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md transition disabled:opacity-50 flex items-center space-x-2"
          >
            <span>📥</span>
            <span>Export Report (CSV)</span>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          {[
            { id: 'inventory', label: 'Inventory Breakdown', icon: '📦' },
            { id: 'borrowings', label: 'Borrowing History', icon: '🔄' },
            { id: 'overdue', label: 'Overdue Books', icon: '⚠️' },
            { id: 'popular', label: 'Most Borrowed Books', icon: '⭐' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-sm border border-rose-200">
            {error}
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12 text-slate-400">Compiling report data...</div>
            ) : data.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No records found for this report.</div>
            ) : (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400 border-b border-slate-100">
                  <tr>
                    {Object.keys(data[0]).map(k => (
                      <th key={k} className="px-6 py-3 font-semibold">{k.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-6 py-3">
                          {val !== null ? String(val) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
