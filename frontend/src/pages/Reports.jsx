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

  const tabs = [
    {
      id: 'inventory',
      label: 'Inventory Breakdown',
      icon: (
        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      )
    },
    {
      id: 'borrowings',
      label: 'Borrowing History',
      icon: (
        <svg className="w-4 h-4 fill-none stroke-current stroke-2 shrink-0" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'overdue',
      label: 'Overdue Books',
      icon: (
        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      id: 'popular',
      label: 'Most Borrowed Books',
      icon: (
        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )
    }
  ];

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">Library Reports & Statistical Analytics</h1>
            <p className="text-xs text-slate-500 mt-0.5">Live operational exports from Neon PostgreSQL</p>
          </div>
          <button
            onClick={exportCSV}
            disabled={data.length === 0}
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span>Export Report (CSV)</span>
          </button>
        </div>

        {/* Tab Selection — Scrollable on mobile */}
        <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center space-x-2 whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
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
              <div className="text-center py-12 text-slate-400 text-sm">Compiling report data...</div>
            ) : data.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No records found for this report.</div>
            ) : (
              <table className="w-full text-left text-sm text-slate-600 min-w-[650px]">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400 border-b border-slate-100">
                  <tr>
                    {Object.keys(data[0]).map(k => (
                      <th key={k} className="px-5 py-3 font-semibold">{k.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-5 py-3 whitespace-nowrap">
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
