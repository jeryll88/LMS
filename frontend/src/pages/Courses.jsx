import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadCourses = () => {
    setLoading(true);
    api.get('/api/courses')
      .then(res => setCourses(res.data.courses || []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load courses'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleAddCourse = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/courses', { course_code: courseCode, course_name: courseName });
      setMessage(res.data.message || 'Course added');
      setCourseCode('');
      setCourseName('');
      loadCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add course');
    }
  };

  const handleDeleteCourse = async (id, code) => {
    if (!window.confirm(`Delete course ${code}?`)) return;
    try {
      const res = await api.delete(`/api/courses/${id}`);
      setMessage(res.data.message || 'Course deleted');
      loadCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <Layout>
      <div className="space-y-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h1 className="text-lg sm:text-xl font-bold text-slate-800">Academic Courses & Degree Programs</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage academic tracks linked to student enrollments</p>
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
          {/* Add Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-fit">
            <h3 className="font-bold text-slate-800 mb-3 text-sm sm:text-base">Add Course Program</h3>
            <form onSubmit={handleAddCourse} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-600 mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BSCS, BSIT, BSA"
                  value={courseCode}
                  onChange={e => setCourseCode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase text-slate-600 mb-1">Full Program Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bachelor of Science in Information Technology"
                  value={courseName}
                  onChange={e => setCourseName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow transition"
              >
                Save Course
              </button>
            </form>
          </div>

          {/* Courses Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Existing Programs ({courses.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">Code</th>
                    <th className="px-5 py-3">Course Name</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="3" className="text-center py-8 text-slate-400">Loading courses...</td></tr>
                  ) : courses.length === 0 ? (
                    <tr><td colSpan="3" className="text-center py-8 text-slate-400">No courses defined.</td></tr>
                  ) : (
                    courses.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-3 font-mono font-bold text-slate-800 text-xs">{c.course_code}</td>
                        <td className="px-5 py-3 text-xs sm:text-sm font-semibold text-slate-900">{c.course_name}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleDeleteCourse(c.id, c.course_code)}
                            className="text-xs text-rose-600 hover:text-rose-900 font-semibold px-2 py-1 bg-rose-50 rounded"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
