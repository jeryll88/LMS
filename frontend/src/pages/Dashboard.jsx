import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import { Link } from 'react-router-dom';
import BookCoverThumb from '../components/BookCoverThumb';
import Swal from 'sweetalert2';

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase() || 'user';
  const isAdmin = role === 'admin';
  const isStudent = !isAdmin && role !== 'librarian';

  const [metrics, setMetrics] = useState(null);
  const [students, setStudents] = useState([]);
  const [librarians, setLibrarians] = useState([]);
  const [courses, setCourses] = useState([]);
  const [borrowings, setBorrowings] = useState([]);
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const requests = [
      api.get('/api/dashboard/metrics'),
      api.get('/api/borrowings'),
    ];

    if (isAdmin || role === 'librarian') {
      requests.push(api.get('/api/users?role=User'));
      requests.push(api.get('/api/users?role=Librarian'));
      requests.push(api.get('/api/courses'));
    } else {
      requests.push(api.get('/api/books?limit=6'));
    }

    Promise.all(requests)
      .then(([metricsRes, borrowRes, usersRes, libRes, coursesRes]) => {
        setMetrics(metricsRes.data.metrics);
        setBorrowings(borrowRes.data.borrowings?.slice(0, 5) || []);
        if (isAdmin || role === 'librarian') {
          if (usersRes) setStudents(usersRes.data.users?.slice(0, 5) || []);
          if (libRes) setLibrarians(libRes.data.users?.slice(0, 5) || []);
          if (coursesRes) setCourses(coursesRes.data.courses || []);
        } else {
          if (usersRes) setFeaturedBooks(usersRes.data.books || []);
        }
      })
      .catch((err) => console.error('Dashboard load error:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleReserve = async (bookId, title) => {
    try {
      await api.post('/api/reservations', { book_id: bookId });
      Swal.fire({
        icon: 'success',
        title: 'Reservation Placed',
        text: `Reservation placed for "${title}"!`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({
        icon: 'warning',
        title: 'Reservation Failed',
        text: err.response?.data?.message || 'Reservation failed'
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ========================================================= */}
        {/* STUDENT PORTAL VIEW (Matching the uploaded Student Image) */}
        {/* ========================================================= */}
        {isStudent ? (
          <>
            {/* Blue Banner - Student Portal */}
            <div className="bg-gradient-to-r from-[#2563eb] via-[#1d4ed8] to-[#1e40af] text-white rounded-2xl p-6 sm:p-7 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-semibold text-white uppercase tracking-wider mb-2">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
                  </svg>
                  <span>STUDENT PORTAL</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Welcome back, {user?.full_name || 'Student'}!
                </h1>
                <p className="text-xs sm:text-sm text-blue-100/90 mt-1">
                  Search and browse books, track your borrowing records, and reserve books easily.
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <Link
                    to="/books"
                    className="px-4 py-2 bg-white text-blue-700 hover:bg-slate-100 rounded-lg text-xs font-semibold shadow-sm transition flex items-center space-x-1.5"
                  >
                    <span>Browse All Books</span>
                  </Link>
                  <Link
                    to="/borrowings"
                    className="px-4 py-2 bg-white/15 hover:bg-white/25 border border-white/20 text-white rounded-lg text-xs font-semibold transition"
                  >
                    My Borrowing History
                  </Link>
                </div>
              </div>
            </div>

            {/* 4 Stat Cards matching Screenshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Active Borrowing */}
              <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-start space-x-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-semibold text-slate-500">Active Borrowing</span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                      Limit: 5 Books
                    </span>
                  </div>
                  <p className="text-2xl font-black text-slate-800 mt-1">
                    {metrics?.currently_borrowed || 0} <span className="text-xs font-medium text-slate-400">/ 5</span>
                  </p>
                  <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                    {5 - (metrics?.currently_borrowed || 0)} available slots
                  </p>
                </div>
              </div>

              {/* Card 2: Overdue Books */}
              <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-start space-x-4">
                <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500">Overdue Books</span>
                  <p className="text-2xl font-black text-slate-800 mt-1">
                    {metrics?.overdue_books || 0}
                  </p>
                </div>
              </div>

              {/* Card 3: Active Reservations */}
              <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-start space-x-4">
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500">Active Reservations</span>
                  <p className="text-2xl font-black text-slate-800 mt-1">
                    {metrics?.active_reservations || 0}
                  </p>
                </div>
              </div>

              {/* Card 4: Books Returned / Read */}
              <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-start space-x-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500">Books Returned / Read</span>
                  <p className="text-2xl font-black text-slate-800 mt-1">
                    {metrics?.total_borrowing_history || 2}
                  </p>
                </div>
              </div>
            </div>

            {/* Featured & Available Books Grid */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-1.5">
                    <span className="text-amber-500">★</span>
                    <span>Featured & Available Books</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Search and reserve copies directly from the library collection.
                  </p>
                </div>
                <Link to="/books" className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
                  Browse Full Catalog &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredBooks.map((b) => (
                  <div key={b.book_id} className="p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <BookCoverThumb isbn={b.isbn} title={b.title} className="w-12 h-16 shadow-xs overflow-hidden shrink-0" />
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {b.available_copies} Available
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{b.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{b.author}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{b.category_name || 'General'}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <Link to="/books" className="text-xs text-slate-500 hover:text-slate-800 font-medium">
                        Details
                      </Link>
                      <button
                        onClick={() => handleReserve(b.book_id, b.title)}
                        className="px-3 py-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded text-xs font-semibold shadow-xs transition"
                      >
                        Reserve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* ========================================================= */
          /* ADMINISTRATOR & LIBRARIAN DASHBOARD VIEW                  */
          /* ========================================================= */
          <>
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

            {/* 6 Metric Stat Cards with Professional SVG Icons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {/* Card 1: Total Individuals / Users */}
              <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL INDIVIDUALS</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{metrics?.total_users || 0}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">All accounts</p>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-current" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
              </div>

              {/* Card 2: Students */}
              <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">STUDENTS</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{metrics?.total_students || 0}</p>
                  <p className="text-[10px] text-indigo-500 font-medium mt-0.5">Enrolled</p>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
                  </svg>
                </div>
              </div>

              {/* Card 3: Librarians */}
              <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">LIBRARIANS</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{metrics?.total_librarians || 0}</p>
                  <p className="text-[10px] text-purple-500 font-medium mt-0.5">Staff & Admin</p>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {/* Card 4: Book Titles */}
              <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">BOOK TITLES</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{metrics?.total_book_titles || metrics?.total_books || 0}</p>
                  <p className="text-[10px] text-amber-600 font-medium mt-0.5">{metrics?.total_copies || 0} copies</p>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-current" viewBox="0 0 20 20">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                </div>
              </div>

              {/* Card 5: Active Borrowings */}
              <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">BORROWINGS</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{metrics?.borrowed_copies || metrics?.active_borrowings || 0}</p>
                  <p className="text-[10px] text-rose-500 font-medium mt-0.5">{metrics?.overdue_books || metrics?.overdue_transactions || 0} overdue</p>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              {/* Card 6: Courses */}
              <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">COURSES</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{courses?.length || 0}</p>
                  <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Degree programs</p>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-current" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Two Columns: Student Management & Librarian Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <Link to="/borrowings" className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
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
          </>
        )}
      </div>
    </Layout>
  );
}
