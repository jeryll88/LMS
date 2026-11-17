import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import Swal from 'sweetalert2';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [type, setType] = useState('Academic');
  const [desc, setDesc] = useState('');
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
      Swal.fire({
        icon: 'success',
        title: 'Category Added!',
        text: res.data.message || 'Category created successfully.',
        timer: 1600,
        showConfirmButton: false,
      });
      setName('');
      setDesc('');
      loadCategories();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Add Failed',
        text: err.response?.data?.message || 'Failed to add category.',
      });
    }
  };

  const handleDelete = (id, catName) => {
    Swal.fire({
      title: 'Delete Category?',
      text: `Are you sure you want to delete category "${catName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await api.delete(`/api/categories/${id}`);
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: res.data.message || 'Category deleted successfully.',
            timer: 1500,
            showConfirmButton: false,
          });
          loadCategories();
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Delete Failed',
            text: err.response?.data?.message || 'Delete failed. Books may still be associated with this category.',
          });
        }
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h1 className="text-lg sm:text-xl font-bold text-slate-800">Book Categories & Classifications</h1>
          <p className="text-xs text-slate-500 mt-0.5">Organize books by academic and general genres</p>
        </div>

        {message && (
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-sm border border-emerald-200 flex justify-between items-center">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="font-bold ml-2">✕</button>
          </div>
        )}
        {error && (
          <div className="p-4 bg-rose-50 text-rose-800 rounded-xl text-sm border border-rose-200 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-bold ml-2">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-fit">
            <h3 className="font-bold text-slate-800 mb-3 text-sm sm:text-base">Add Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-600 mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Artificial Intelligence"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase text-slate-600 mb-1">Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  <option value="Academic">Academic</option>
                  <option value="Non-Academic">Non-Academic</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold uppercase text-slate-600 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow transition"
              >
                Save Category
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Categories ({categories.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 min-w-[500px]">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">Category Name</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="4" className="text-center py-6 text-slate-400">Loading categories...</td></tr>
                  ) : categories.map(c => (
                    <tr key={c.category_id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3 font-semibold text-slate-900 text-xs sm:text-sm">{c.category_name}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                          c.category_type === 'Academic' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {c.category_type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">{c.description || '-'}</td>
                      <td className="px-5 py-3 text-right">
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
