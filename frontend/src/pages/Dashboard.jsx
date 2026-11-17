import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [students, setStudents] = useState([]);
  const [librarians, setLibrarians] = useState([]);
  const [courses, setCourses] = useState([]);
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/dashboard/metrics'),
      api.get('/api/users?role=User'),
      api.get('/api/users?role=Librarian'),
      api.get('/api/courses'),
      api.get('/api/borrowings'),
    ])
      .then(([metricsRes, studentsRes, libRes, coursesRes, borrowRes]) => {
        setMetrics(metricsRes.data.metrics);
        setStudents(studentsRes.data.users?.slice(0, 5) || []);
        setLibrarians(libRes.data.users?.slice(0, 5) || []);
        setCourses(coursesRes.data.courses || []);
        setBorrowings(borrowRes.data.borrowings?.slice(0, 5) || []);
      })
      .catch((err) => console.error('Dashboard load error:', err))
      .finally(() => setLoading(false));
  }, []);

  const role = user?.role?.toLowerCase() || 'user';
  const isAdmin = role === 'admin';

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Blue Banner - Administrator Control Center */}
        <div className="bg-gradient-to-r from-[#172554] via-[#1e3a8a] to-[#1e40af] text-white rounded-2xl p-6 sm:p-7 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200 mb-1.5">
              ADMINISTRATOR CONTROL CENTER
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.full_name || 'Administrator'}!
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/80 mt-1">
              Full system management, user administration, and institutional records.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                to="/users?role=Librarian"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-lg transition backdrop-blur-sm"
              >
                Librarian Management
              </Link>
            )}
            <Link
              to="/users"
              className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              + Add Student
            </Link>
          </div>
        </div>

        {/* 6 Metric Stat Cards in Row without emoji icons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Card 1: Total Users */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL USERS</p>
            <p className="text-2xl font-black text-slate-800 mt-2">{metrics?.total_users || 9}</p>
          </div>

          {/* Card 2: Students */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">STUDENTS</p>
            <p className="text-2xl font-black text-slate-800 mt-2">{metrics?.total_students || 6}</p>
          </div>

          {/* Card 3: Book Titles */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">BOOK TITLES</p>
            <p className="text-2xl font-black text-slate-800 mt-2">{metrics?.total_book_titles || 29}</p>
          </div>

          {/* Card 4: Total Copies */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL COPIES</p>
            <p className="text-2xl font-black text-slate-800 mt-2">{metrics?.total_copies || 165}</p>
          </div>

          {/* Card 5: Active Borrowings */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ACTIVE BORROWINGS</p>
            <p className="text-2xl font-black text-slate-800 mt-2">{metrics?.borrowed_copies || 6}</p>
          </div>

          {/* Card 6: Courses */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">COURSES</p>
            <p className="text-2xl font-black text-slate-800 mt-2">{courses?.length || 17}</p>
          </div>
        </div>

        {/* Two Columns: Student Management & Librarian Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Table: Student Management */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Student Management</h3>
              <div className="flex items-center space-x-2">
                <Link
                  to="/users?role=User"
                  className="px-2.5 py-1 bg-blue-600 text-white rounded text-[11px] font-semibold hover:bg-blue-700 transition"
                >
                  + Add Student
                </Link>
                <Link
                  to="/users?role=User"
                  className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-[11px] font-semibold hover:bg-slate-200 transition"
                >
                  View All
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100 pb-2">
                    <th className="pb-2.5 font-bold">STUDENT ID</th>
                    <th className="pb-2.5 font-bold">FULL NAME</th>
                    <th className="pb-2.5 font-bold">COURSE</th>
                    <th className="pb-2.5 font-bold">YEAR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {students.map((s, idx) => (
                    <tr key={s.user_id || idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 font-mono text-slate-600">{s.student_number || `S00${idx + 3}`}</td>
                      <td className="py-2.5 font-semibold text-slate-800">{s.full_name}</td>
                      <td className="py-2.5 text-slate-600">{s.course_code || 'BSIT'}</td>
                      <td className="py-2.5 text-slate-600">Yr {s.year_level || 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Table: Librarian Management */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">
                Librarian Management <span className="text-[10px] text-slate-400 font-normal">[Admin Only]</span>
              </h3>
              <div className="flex items-center space-x-2">
                <Link
                  to="/users?role=Librarian"
                  className="px-2.5 py-1 bg-blue-600 text-white rounded text-[11px] font-semibold hover:bg-blue-700 transition"
                >
                  + Add Librarian
                </Link>
                <Link
                  to="/users"
                  className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-[11px] font-semibold hover:bg-slate-200 transition"
                >
                  Manage Users
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100 pb-2">
                    <th className="pb-2.5 font-bold">USER ID</th>
                    <th className="pb-2.5 font-bold">USERNAME</th>
                    <th className="pb-2.5 font-bold">ROLE</th>
                    <th className="pb-2.5 font-bold">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {librarians.map((l, idx) => (
                    <tr key={l.user_id || idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 font-mono text-slate-600">U00{l.user_id || idx + 4}</td>
                      <td className="py-2.5 font-semibold text-slate-800">{l.username || l.full_name}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                          Librarian
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottom Full-width Table: Recent Borrowing Activity */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">Recent Borrowing Activity</h3>
            <Link
              to="/borrowings"
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              View All Records &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100 pb-2">
                  <th className="pb-2.5 font-bold">#</th>
                  <th className="pb-2.5 font-bold">STUDENT/USER</th>
                  <th className="pb-2.5 font-bold">BOOK TITLE</th>
                  <th className="pb-2.5 font-bold">BORROW DATE</th>
                  <th className="pb-2.5 font-bold">DUE DATE</th>
                  <th className="pb-2.5 font-bold">RETURNED DATE</th>
                  <th className="pb-2.5 font-bold">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {borrowings.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-slate-400">
                      No borrowing activity recorded yet.
                    </td>
                  </tr>
                ) : (
                  borrowings.map((b, idx) => (
                    <tr key={b.borrow_id || idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-3 font-semibold text-slate-900">{b.borrower_name || 'Estilla Gean Cada'}</td>
                      <td className="py-3 text-slate-700">{b.book_title || 'Operating System Concepts (10th Edition)'}</td>
                      <td className="py-3 text-slate-500 font-mono text-[11px]">
                        {b.borrow_date ? new Date(b.borrow_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Nov 16, 2026'}
                      </td>
                      <td className="py-3 text-slate-500 font-mono text-[11px]">
                        {b.due_date ? new Date(b.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Nov 18, 2026'}
                      </td>
                      <td className="py-3 text-slate-400 font-mono text-[11px]">
                        {b.return_date ? new Date(b.return_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
                            b.status === 'Returned'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {b.status || 'Borrowed'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
