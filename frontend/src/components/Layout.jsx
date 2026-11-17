import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Layout({ children, onSearch }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const role = user?.role?.toLowerCase() || 'user';
  const isAdmin = role === 'admin';
  const isLibrarian = role === 'librarian';
  const [globalSearch, setGlobalSearch] = useState('');

  const handleGlobalSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(globalSearch);
    } else {
      navigate(`/books?search=${encodeURIComponent(globalSearch)}`);
    }
  };

  const navSections = [
    {
      title: 'MAIN MENU',
      items: [
        { to: '/', label: 'Dashboard' },
        { to: '/books', label: 'Books' },
        { to: '/copies', label: 'Book Copies', staffOnly: true },
        { to: '/borrowings', label: 'Borrowing Records' },
        { to: '/reservations', label: 'Reservations' },
      ],
    },
    {
      title: 'PEOPLE',
      staffOnly: true,
      items: [
        { to: '/users?role=User', label: 'Students' },
        { to: '/users?role=Librarian', label: 'Librarian Management', adminOnly: true },
      ],
    },
    {
      title: 'SETTINGS',
      staffOnly: true,
      items: [
        { to: '/courses', label: 'Courses' },
        { to: '/categories', label: 'Categories' },
        { to: '/reports', label: 'Reports' },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        { to: '/profile', label: 'My Profile' },
        { to: '/notifications', label: 'Notifications' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#f3f5f9] flex font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-60 bg-[#0e1726] text-slate-300 flex flex-col justify-between shrink-0 shadow-lg select-none">
        <div>
          {/* Logo Brand Header */}
          <div className="flex items-center space-x-3 px-5 py-4 border-b border-slate-800/80">
            <div className="w-8 h-8 bg-[#2563eb] rounded-lg flex items-center justify-center text-white shadow font-black text-sm">
              LMS
            </div>
            <div>
              <h1 className="font-bold text-sm text-white tracking-wide leading-tight">Library System</h1>
              <p className="text-[11px] text-slate-400 font-medium">School DB</p>
            </div>
          </div>

          {/* Nav Categories */}
          <nav className="p-3 space-y-5 text-xs overflow-y-auto max-h-[calc(100vh-140px)]">
            {navSections.map((sec, idx) => {
              if (sec.staffOnly && !isAdmin && !isLibrarian) return null;

              const visibleItems = sec.items.filter((item) => {
                if (item.adminOnly && !isAdmin) return false;
                if (item.staffOnly && !isAdmin && !isLibrarian) return false;
                return true;
              });

              if (visibleItems.length === 0) return null;

              return (
                <div key={idx}>
                  <p className="px-3 pb-1.5 text-[10px] font-bold text-slate-500 tracking-wider">
                    {sec.title}
                  </p>
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const isActive = location.pathname === item.to.split('?')[0];
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`block px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-[#2563eb] text-white font-semibold shadow-sm'
                              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* User Mini Card at Bottom */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0a111c] flex items-center justify-between">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-[#2563eb] text-white font-bold flex items-center justify-center text-xs shrink-0">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="truncate text-left leading-tight">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'System User'}</p>
              <span className="text-[10px] text-emerald-400 font-medium capitalize flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                {user?.role || 'Active'}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="text-xs text-slate-400 hover:text-rose-400 px-2 py-1 transition font-medium"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Right Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          {/* Search Input */}
          <form onSubmit={handleGlobalSearchSubmit} className="relative w-72 sm:w-96">
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search anything..."
              className="w-full px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
            />
          </form>

          {/* Right User Bar */}
          <div className="flex items-center space-x-5">
            <Link to="/notifications" className="text-xs font-medium text-slate-500 hover:text-slate-800">
              Notifications
            </Link>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-[#2563eb] text-white font-bold flex items-center justify-center text-xs shadow-sm">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="text-left text-xs leading-tight hidden sm:block">
                <p className="font-semibold text-slate-800">{user?.full_name || 'System Administrator'}</p>
                <p className="text-[11px] text-slate-400 font-mono">
                  {user?.role} {user?.username ? `(@${user.username})` : ''}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold border border-rose-200 px-3 py-1 rounded-lg hover:bg-rose-50 transition"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Dynamic Body Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
