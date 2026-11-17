import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import Copies from './pages/Copies';
import Borrowings from './pages/Borrowings';
import Reservations from './pages/Reservations';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Courses from './pages/Courses';
import Categories from './pages/Categories';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import { AuthProvider, useAuth } from './auth/AuthContext';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-medium text-sm">
        Authenticating library session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const userRole = user.role?.toLowerCase();
    const hasRole = allowedRoles.some((r) => r.toLowerCase() === userRole);
    if (!hasRole) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected General Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={['admin', 'librarian', 'user', 'student']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/books"
            element={
              <ProtectedRoute allowedRoles={['admin', 'librarian', 'user', 'student']}>
                <Books />
              </ProtectedRoute>
            }
          />
          <Route
            path="/borrowings"
            element={
              <ProtectedRoute allowedRoles={['admin', 'librarian', 'user', 'student']}>
                <Borrowings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reservations"
            element={
              <ProtectedRoute allowedRoles={['admin', 'librarian', 'user', 'student']}>
                <Reservations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={['admin', 'librarian', 'user', 'student']}>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['admin', 'librarian', 'user', 'student']}>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Staff Specific Routes */}
          <Route
            path="/copies"
            element={
              <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                <Copies />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                <Courses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                <Categories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                <Users />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
