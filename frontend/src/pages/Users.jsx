import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/client';

export default function Users() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryRole = searchParams.get('role') || '';

  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [roleFilter, setRoleFilter] = useState(queryRole);
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
    role: queryRole === 'Librarian' ? 'Librarian' : 'User',
    student_number: '',
    gender: 'Female',
    year_level: '1',
    course_id: '',
    employee_id: '',
    is_active: 1
  });

  // Sync roleFilter whenever URL parameter changes (e.g. clicking Students or Librarians in sidebar)
  useEffect(() => {
    const paramRole = searchParams.get('role') || '';
    setRoleFilter(paramRole);
  }, [searchParams]);

  const loadData = () => {
    setLoading(true);
    const activeRole = searchParams.get('role') !== null ? (searchParams.get('role') || '') : roleFilter;
    let url = `/api/users?search=${encodeURIComponent(search)}`;
    if (activeRole) url += `&role=${activeRole}`;

    Promise.all([
      api.get(url),
      api.get('/api/courses')
    ])
      .then(([usersRes, coursesRes]) => {
        let list = usersRes.data.users || [];
        if (activeRole) {
          list = list.filter(u => u.role?.toLowerCase() === activeRole.toLowerCase());
        }
        setUsers(list);
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
  }, [searchParams, roleFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleRoleFilterChange = (newRole) => {
    setRoleFilter(newRole);
    if (newRole) {
      setSearchParams({ role: newRole });
    } else {
      setSearchParams({});
    }
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    setCurrentUser({
      full_name: '',
      email: '',
      username: '',
      password: '',
      role: roleFilter === 'Librarian' ? 'Librarian' : 'User',
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
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">
              {roleFilter === 'User'
                ? 'Students Management'
                : roleFilter === 'Librarian'
                ? 'Librarians Management'
                : 'User & Account Management'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {roleFilter === 'User'
                ? 'Directory of enrolled students, student numbers, and course degrees'
                : roleFilter === 'Librarian'
                ? 'Directory of library staff personnel and administrator controls'
                : 'Admin control panel for student, librarian, and administrator accounts'}
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>{roleFilter === 'Librarian' ? 'Add Librarian' : roleFilter === 'User' ? 'Register Student' : 'Create Account'}</span>
          </button>
        </div>

        {/* Alerts */}
        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex justify-between items-center">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="font-bold ml-2">✕</button>
          </div>
        )}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-bold ml-2">✕</button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2 w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, student number..."
              className="flex-1 px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button type="submit" className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition shrink-0">
              Search
            </button>
          </form>
          <select
            value={roleFilter}
            onChange={(e) => handleRoleFilterChange(e.target.value)}
            className="w-full md:w-44 px-3 py-2 border rounded-xl text-sm"
          >
            <option value="">All Roles</option>
            <option value="User">Students (User)</option>
            <option value="Librarian">Librarians</option>
            <option value="Admin">Admins</option>
          </select>
        </div>

        {/* Table & Responsive Cards */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">{roleFilter === 'Librarian' ? 'Employee #' : 'Student / Employee #'}</th>
                  <th className="px-5 py-3">{roleFilter === 'Librarian' ? 'Position' : 'Course / Info'}</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-10 text-slate-400">Loading accounts...</td></tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-slate-400">
                      No {roleFilter === 'User' ? 'students' : roleFilter === 'Librarian' ? 'librarians' : 'users'} found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.user_id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">{u.full_name}</p>
                            <p className="text-xs text-slate-400 font-mono">@{u.username} • {u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          u.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                          u.role === 'Librarian' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-700">
                        {u.student_number || u.employee_id || '—'}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600">
                        {u.course_code ? `${u.course_code} (Yr ${u.year_level || 1})` : u.role === 'Librarian' ? 'Library Staff' : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                          u.is_active === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {u.is_active === 1 ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
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
                              u.is_active === 1 ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
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

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="text-center py-10 text-slate-400 text-sm">Loading accounts...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                No {roleFilter === 'User' ? 'students' : roleFilter === 'Librarian' ? 'librarians' : 'users'} found.
              </div>
            ) : (
              users.map((u) => (
                <div key={u.user_id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{u.full_name}</p>
                        <p className="text-xs text-slate-400 font-mono">@{u.username}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      u.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                      u.role === 'Librarian' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p>Email: {u.email}</p>
                    {u.student_number && <p>Student ID: <span className="font-mono">{u.student_number}</span></p>}
                    {u.course_code && <p>Course: {u.course_code} (Yr {u.year_level || 1})</p>}
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      u.is_active === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {u.is_active === 1 ? 'Active' : 'Deactivated'}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="text-xs text-indigo-600 font-semibold px-3 py-1.5 bg-indigo-50 rounded-lg"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleDeactivate(u.user_id, u.is_active)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                          u.is_active === 1 ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'
                        }`}
                      >
                        {u.is_active === 1 ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal for Add / Edit */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                  {modalMode === 'add'
                    ? (currentUser.role === 'Librarian' ? 'Add Librarian Account' : 'Register Student Account')
                    : 'Edit User Profile'}
                </h3>
                <button type="button" onClick={() => setShowModal(false)} className="font-bold text-slate-400 hover:text-slate-700 p-1">✕</button>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold uppercase text-slate-600 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={currentUser.full_name}
                      onChange={(e) => setCurrentUser({ ...currentUser, full_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase text-slate-600 mb-1">Username</label>
                    <input
                      type="text"
                      value={currentUser.username}
                      onChange={(e) => setCurrentUser({ ...currentUser, username: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold uppercase text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={currentUser.email}
                      onChange={(e) => setCurrentUser({ ...currentUser, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase text-slate-600 mb-1">Role</label>
                    <select
                      value={currentUser.role}
                      onChange={(e) => setCurrentUser({ ...currentUser, role: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl"
                    >
                      <option value="User">Student (User)</option>
                      <option value="Librarian">Librarian</option>
                      <option value="Admin">Administrator</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-600 mb-1">
                    {modalMode === 'add' ? 'Password' : 'Password (Leave blank to keep unchanged)'}
                  </label>
                  <input
                    type="password"
                    required={modalMode === 'add'}
                    value={currentUser.password}
                    onChange={(e) => setCurrentUser({ ...currentUser, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                {currentUser.role === 'User' && (
                  <div className="p-3 bg-slate-50 rounded-xl space-y-3 border border-slate-200">
                    <p className="font-bold text-slate-700">Student Profile Information</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-500 mb-1">Student Number</label>
                        <input
                          type="text"
                          value={currentUser.student_number}
                          onChange={(e) => setCurrentUser({ ...currentUser, student_number: e.target.value })}
                          className="w-full px-3 py-2 border rounded-xl bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1">Course</label>
                        <select
                          value={currentUser.course_id}
                          onChange={(e) => setCurrentUser({ ...currentUser, course_id: e.target.value })}
                          className="w-full px-3 py-2 border rounded-xl bg-white"
                        >
                          {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.course_code}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {currentUser.role === 'Librarian' && (
                  <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                    <p className="font-bold text-slate-700">Librarian Staff Information</p>
                    <div>
                      <label className="block text-slate-500 mb-1">Employee ID / Staff Number</label>
                      <input
                        type="text"
                        placeholder="e.g. EMP-101"
                        value={currentUser.employee_id}
                        onChange={(e) => setCurrentUser({ ...currentUser, employee_id: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-white"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold shadow"
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
