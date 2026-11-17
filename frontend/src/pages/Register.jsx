import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    student_number: '',
    gender: 'Female',
    year_level: '1',
    course_id: '',
    role: 'User'
  });

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load courses for student selection
    api.get('/api/courses')
      .then(res => {
        setCourses(res.data.courses || []);
        if (res.data.courses?.length > 0) {
          setFormData(prev => ({ ...prev, course_id: res.data.courses[0].id }));
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(formData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-100 my-8">
        <div className="text-center mb-6">
          <span className="text-3xl">📝</span>
          <h2 className="text-2xl font-black text-slate-900 mt-2">Student Registration</h2>
          <p className="text-xs text-slate-500">Create your library member account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Full Name</label>
              <input
                type="text"
                name="full_name"
                required
                value={formData.full_name}
                onChange={handleChange}
                placeholder="e.g. Maria Clara"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Student Number</label>
              <input
                type="text"
                name="student_number"
                required
                value={formData.student_number}
                onChange={handleChange}
                placeholder="e.g. STU-2026-0042"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Email</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="student@school.edu"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Optional username"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Year Level</label>
              <select
                name="year_level"
                value={formData.year_level}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              >
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Course</label>
              <select
                name="course_id"
                value={formData.course_id}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.course_code}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition duration-200"
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
