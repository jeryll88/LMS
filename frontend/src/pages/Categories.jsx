import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('Academic');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadCategories = () => {
    setLoading(true);
    api.get('/api/categories')
      .then(res => setCategories(res.data.categories || []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load categories'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/categories', { category_name: name, category_type: type, description: desc });
      setMessage(res.data.message || 'Category created');
      setName('');
      setDesc('');
      loadCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create category');
    }
  };

  const handleDelete = async (id, catName) => {
    if (!window.confirm(`Delete category "${catName}"?`)) return;
    try {
      const res = await api.delete(`/api/categories/${id}`);
      setMessage(res.data.message || 'Category deleted');
      loadCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">Book Categories & Classifications</h1>
          <p className="text-xs text-slate-500 mt-0.5">Organize books by academic and general genres</p>
        </div>

        {message && <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-sm border border-emerald-200">✅ {message}</div>}
        {error && <div className="p-4 bg-rose-50 text-rose-800 rounded-xl text-sm border border-rose-200">⚠️ {error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
            <h3 className="font-bold text-slate-800 mb-4">Add Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Artificial Intelligence"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  <option value="Academic">Academic</option>
                  <option value="Non-Academic">Non-Academic</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow"
              >
                Save Category
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="font-bold text-slate-800">Categories ({categories.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400 border-b">
                  <tr>
                    <th className="px-6 py-3">Category Name</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr><td colSpan="4" className="text-center py-6 text-slate-400">Loading categories...</td></tr>
                  ) : categories.map(c => (
                    <tr key={c.category_id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-semibold text-slate-900">{c.category_name}</td>
                      <td className="px-6 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                          c.category_type === 'Academic' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {c.category_type}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-500">{c.description || '-'}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleDelete(c.category_id, c.category_name)}
                          className="text-xs text-rose-600 hover:text-rose-900 font-semibold px-2 py-1 bg-rose-50 rounded"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
