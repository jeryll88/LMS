import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';

// Fallback courses in case of temporary network latency
const FALLBACK_COURSES = [
  { id: 1, course_code: 'BSIT', course_name: 'Bachelor of Science in Information Technology' },
  { id: 2, course_code: 'BSM', course_name: 'Bachelor of Science in Mathematics' },
  { id: 3, course_code: 'BPED', course_name: 'Bachelor of Physical Education' },
  { id: 4, course_code: 'BECED', course_name: 'Bachelor of Early Childhood Education' },
  { id: 5, course_code: 'BSA', course_name: 'Bachelor of Science in Accountancy' },
  { id: 6, course_code: 'BSED', course_name: 'Bachelor of Secondary Education' },
  { id: 7, course_code: 'BSBIO', course_name: 'Bachelor of Science in Biology' },
  { id: 8, course_code: 'BSF', course_name: 'Bachelor of Science in Forestry' },
  { id: 9, course_code: 'BTLED', course_name: 'Bachelor of Technology and Livelihood Education' },
  { id: 10, course_code: 'BAT', course_name: 'Bachelor of Agricultural Technology' },
];

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
    course_id: '1',
    role: 'User',
  });

  const [courses, setCourses] = useState(FALLBACK_COURSES);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load courses for student selection
    api
      .get('/api/courses')
      .then((res) => {
        const loadedCourses = res.data.courses || [];
        if (loadedCourses.length > 0) {
          setCourses(loadedCourses);
          setFormData((prev) => ({
            ...prev,
            course_id: prev.course_id || String(loadedCourses[0].id),
          }));
        }
      })
      .catch((err) => {
        console.warn('Using fallback courses list:', err.message);
      })
      .finally(() => setCoursesLoading(false));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await register(formData);
      await Swal.fire({
        icon: 'success',
        title: 'Registration Successful!',
        text: `Welcome to the Library System, ${formData.full_name}! Redirecting to your dashboard...`,
        timer: 1800,
        showConfirmButton: false,
        timerProgressBar: true,
      });
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please check your information.';
      setError(msg);
      Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: msg,
        confirmButtonColor: '#2563eb',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Top Navbar matching Login */}
      <header className="bg-[#1b3152] text-white px-6 py-3.5 flex items-center justify-between shadow-md z-10 shrink-0">
        <Link to="/login" className="flex items-center space-x-3 hover:opacity-90 transition">
          <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z" />
            </svg>
          </div>
          <span className="font-semibold text-base tracking-wide">Library Management System</span>
        </Link>
        <div className="flex items-center space-x-6 text-xs text-slate-300 font-medium">
          <span className="cursor-pointer hover:text-white">Learn</span>
          <span className="text-slate-500">•</span>
          <span className="cursor-pointer hover:text-white">Read</span>
          <span className="text-slate-500">•</span>
          <span className="cursor-pointer hover:text-white">Grow</span>
        </div>
      </header>

      {/* Main Split Body matching Login */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Library Image Hero */}
        <div
          className="relative lg:w-1/2 min-h-[340px] lg:min-h-auto flex items-center justify-center p-8 bg-cover bg-center text-white"
          style={{
            backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.75)), url('https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1600&q=80')`,
          }}
        >
          <div className="max-w-md text-center flex flex-col items-center">
            {/* Outline Logo */}
            <div className="w-16 h-16 mb-4 flex items-center justify-center">
              <svg className="w-14 h-14 text-white/90 stroke-current stroke-1 fill-none" viewBox="0 0 24 24">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
              Library Management System
            </h1>
            <p className="text-sm font-semibold text-blue-200 mb-3">
              Your library, our priority.
            </p>
            <p className="text-xs text-slate-200 max-w-sm leading-relaxed mb-6">
              Easily manage books, students, and borrowing records for a more organized and efficient library system.
            </p>

            {/* Translucent Badges */}
            <div className="w-full max-w-xs space-y-2 text-xs font-semibold">
              <div className="bg-white/15 backdrop-blur-md border border-white/20 py-2 rounded-lg text-white">
                Knowledge
              </div>
              <div className="bg-white/15 backdrop-blur-md border border-white/20 py-2 rounded-lg text-white">
                Builds
              </div>
              <div className="bg-white/15 backdrop-blur-md border border-white/20 py-2 rounded-lg text-white">
                A Brighter Future
              </div>
            </div>
          </div>
        </div>

        {/* Right Register Card Side */}
        <div className="lg:w-1/2 bg-[#f4f7fa] flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-[500px] bg-white rounded-2xl shadow-xl border border-slate-100 p-7 sm:p-9 my-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Student Registration</h2>
              <p className="text-xs text-slate-500 mt-1">
                Create your student library account to borrow and reserve books.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Full Name & Student Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    FULL NAME *
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="e.g. Maria Clara"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    STUDENT NUMBER *
                  </label>
                  <input
                    type="text"
                    name="student_number"
                    required
                    value={formData.student_number}
                    onChange={handleChange}
                    placeholder="e.g. 2026-1001"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono transition"
                  />
                </div>
              </div>

              {/* Email & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    EMAIL ADDRESS *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="student@school.edu"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    USERNAME (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="e.g. mariaclara"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  PASSWORD * (MIN 6 CHARACTERS)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a secure password"
                    className="w-full px-3.5 pr-10 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Course Selection */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    ACADEMIC COURSE / PROGRAM *
                  </label>
                  {coursesLoading && (
                    <span className="text-[10px] text-blue-500 font-medium animate-pulse">Loading courses...</span>
                  )}
                </div>
                <select
                  name="course_id"
                  required
                  value={formData.course_id}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code} — {c.course_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gender & Year Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    GENDER
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other / Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    YEAR LEVEL
                  </label>
                  <select
                    name="year_level"
                    value={formData.year_level}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold rounded-lg text-sm shadow-md transition duration-150 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>👤+</span>
                <span>{loading ? 'Creating Account...' : 'Register as Student'}</span>
              </button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-slate-400 font-medium">OR</span>
              </div>
            </div>

            <Link
              to="/login"
              className="w-full py-2.5 border border-slate-300 hover:border-slate-400 text-slate-700 font-medium rounded-lg text-xs flex items-center justify-center space-x-2 transition"
            >
              <span>Already registered? Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}