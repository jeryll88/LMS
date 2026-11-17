import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [currentUser, setCurrentUser] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    role: 'User',
    student_number: '',
    gender: 'Female',
    year_level: '1',
    course_id: '',
    employee_id: '',
    is_active: 1
  });

  const loadData = () => {
    setLoading(true);
    let url = `/api/users?search=${encodeURIComponent(search)}`;
    if (roleFilter) url += `&role=${roleFilter}`;

    Promise.all([
      api.get(url),
      api.get('/api/courses')
    ])
      .then(([usersRes, coursesRes]) => {
        setUsers(usersRes.data.users || []);
        setCourses(coursesRes.data.courses || []);
        if (coursesRes.data.courses?.length > 0 && !currentUser.course_id) {
          setCurrentUser(prev => ({ ...prev, course_id: coursesRes.data.courses[0].id }));
        }
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load user accounts'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [roleFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    setCurrentUser({
      full_name: '',
      email: '',
      username: '',
      password: '',
      role: 'User',
      student_number: '',
      gender: 'Female',
      year_level: '1',
      course_id: courses[0]?.id || '',
      employee_id: '',
      is_active: 1
    });
    setShowModal(true);
  };

  const handleOpenEdit = (u) => {
    setModalMode('edit');
    setCurrentUser({
      user_id: u.user_id,
      full_name: u.full_name,
      email: u.email,
      username: u.username,
      password: '',
      role: u.role,
      student_number: u.student_number || '',
      gender: u.gender || 'Female',
      year_level: u.year_level || '1',
      course_id: u.course_id || courses[0]?.id || '',
      employee_id: u.employee_id || '',
      is_active: u.is_active
    });
    setShowModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        const res = await api.post('/api/users', currentUser);
        setMessage(res.data.message || 'User created successfully');
      } else {
        const res = await api.put(`/api/users/${currentUser.user_id}`, currentUser);
        setMessage(res.data.message || 'User updated successfully');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleToggleDeactivate = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus === 1 ? 'deactivate' : 'activate'} this user account?`)) return;
    try {
      if (currentStatus === 1) {
        await api.delete(`/api/users/${userId}`);
        setMessage('User account deactivated');
      } else {
        await api.put(`/api/users/${userId}`, { is_active: 1 });
        setMessage('User account activated');
      }
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">User & Account Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">Admin control panel for student, librarian, and administrator accounts</p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Create Account</span>
          </button>
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

        {/* Search & Filter */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2 w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Name, Email, Username, Student #..."
              className="flex-1 px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button type="submit" className="px-5 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl">
              Search
            </button>
          </form>

          <div className="w-full md:w-56">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm"
            >
              <option value="">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Librarian">Librarian</option>
              <option value="User">Student (User)</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Full Name / Username</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Academic Details</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-400">Loading accounts...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-400">No user accounts found.</td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.user_id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-3 font-mono font-bold text-slate-500">#{u.user_id}</td>
                      <td className="px-6 py-3">
                        <p className="font-semibold text-slate-900 leading-tight">{u.full_name}</p>
                        <p className="text-xs text-slate-400">@{u.username}</p>
                      </td>
                      <td className="px-6 py-3 text-xs font-mono">{u.email}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                            u.role === 'Admin'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'Librarian'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs">
                        {u.student_number ? (
                          <>
                            <span className="font-mono font-semibold text-indigo-600">{u.student_number}</span>
                            <span className="text-slate-400 block">{u.course_code ? `${u.course_code} - Yr ${u.year_level}` : ''}</span>
                          </>
                        ) : u.employee_id ? (
                          <span className="font-mono text-slate-500">Emp ID: {u.employee_id}</span>
                        ) : (
                          <span className="text-slate-400">Staff Admin</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold ${
                            u.is_active === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {u.is_active === 1 ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="text-xs text-indigo-600 hover:text-indigo-900 font-semibold px-2 py-1 bg-indigo-50 rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleDeactivate(u.user_id, u.is_active)}
                            className={`text-xs font-semibold px-2 py-1 rounded ${
                              u.is_active === 1
                                ? 'text-rose-600 hover:text-rose-900 bg-rose-50'
                                : 'text-emerald-600 hover:text-emerald-900 bg-emerald-50'
                            }`}
                          >
                            {u.is_active === 1 ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8">
              <div className="flex justify-between items-center mb-4 pb-3 border-b">
                <h3 className="font-bold text-slate-800 text-lg">
                  {modalMode === 'add' ? 'Create User Account' : 'Edit User Profile'}
                </h3>
                <button onClick={() => setShowModal(false)} className="font-bold">✕</button>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={currentUser.full_name}
                      onChange={(e) => setCurrentUser({ ...currentUser, full_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Username</label>
                    <input
                      type="text"
                      value={currentUser.username}
                      onChange={(e) => setCurrentUser({ ...currentUser, username: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={currentUser.email}
                      onChange={(e) => setCurrentUser({ ...currentUser, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Role</label>
                    <select
                      value={currentUser.role}
                      onChange={(e) => setCurrentUser({ ...currentUser, role: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-sm"
                    >
                      <option value="User">Student (User)</option>
                      <option value="Librarian">Librarian</option>
                      <option value="Admin">Administrator</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    {modalMode === 'add' ? 'Password' : 'Password (Leave blank to keep unchanged)'}
                  </label>
                  <input
                    type="password"
                    required={modalMode === 'add'}
                    value={currentUser.password}
                    onChange={(e) => setCurrentUser({ ...currentUser, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>

                {currentUser.role === 'User' && (
                  <div className="p-3 bg-slate-50 rounded-xl space-y-3 border">
                    <p className="text-xs font-bold text-slate-700">Student Profile Information</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Student Number</label>
                        <input
                          type="text"
                          value={currentUser.student_number}
                          onChange={(e) => setCurrentUser({ ...currentUser, student_number: e.target.value })}
                          className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Course</label>
                        <select
                          value={currentUser.course_id}
                          onChange={(e) => setCurrentUser({ ...currentUser, course_id: e.target.value })}
                          className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                        >
                          {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.course_code}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

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
                    Save User
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
