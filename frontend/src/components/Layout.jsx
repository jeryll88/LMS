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
  const isStudent = !isAdmin && !isLibrarian;

  const [globalSearch, setGlobalSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleGlobalSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(globalSearch);
    } else {
      navigate(`/books?search=${encodeURIComponent(globalSearch)}`);
    }
  };

  // SVG Icons
  const Icons = {
    home: (
      <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 20 20">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    ),
    book: (
      <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 20 20">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
      </svg>
    ),
    tag: (
      <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    ),
    history: (
      <svg className="w-4 h-4 shrink-0 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bookmark: (
      <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 20 20">
        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
      </svg>
    ),
    users: (
      <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 20 20">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
      </svg>
    ),
    user: (
      <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    ),
    graduation: (
      <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
        <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
      </svg>
    ),
    folder: (
      <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>
    ),
    chart: (
      <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 20 20">
        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
      </svg>
    ),
    bell: (
      <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 20 20">
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
      </svg>
    ),
  };

  const navSections = isStudent
    ? [
        {
          title: 'STUDENT PORTAL',
          items: [
            { to: '/', label: 'Student Portal', icon: Icons.home },
            { to: '/books', label: 'Browse Books', icon: Icons.book },
            { to: '/borrowings', label: 'My Borrowings', icon: Icons.history },
            { to: '/reservations', label: 'My Reservations', icon: Icons.bookmark },
            { to: '/profile', label: 'My Profile', icon: Icons.user },
          ],
        },
      ]
    : [
        {
          title: 'MAIN MENU',
          items: [
            { to: '/', label: 'Dashboard', icon: Icons.home },
            { to: '/books', label: 'Books', icon: Icons.book },
            { to: '/copies', label: 'Book Copies', icon: Icons.tag, staffOnly: true },
            { to: '/borrowings', label: 'Borrowing Records', icon: Icons.history },
            { to: '/reservations', label: 'Reservations', icon: Icons.bookmark },
          ],
        },
        {
          title: 'PEOPLE',
          staffOnly: true,
          items: [
            { to: '/users?role=User', label: 'Students', icon: Icons.users },
            { to: '/users?role=Librarian', label: 'Librarians', icon: Icons.user, adminOnly: true },
          ],
        },
        {
          title: 'SETTINGS',
          staffOnly: true,
          items: [
            { to: '/courses', label: 'Courses', icon: Icons.graduation },
            { to: '/categories', label: 'Categories', icon: Icons.folder },
            { to: '/reports', label: 'Reports', icon: Icons.chart },
          ],
        },
        {
          title: 'ACCOUNT',
          items: [
            { to: '/profile', label: 'My Profile', icon: Icons.user },
            { to: '/notifications', label: 'Notifications', icon: Icons.bell },
          ],
        },
      ];

  const renderNavLinks = () => (
    <nav className="p-3 space-y-5 text-xs overflow-y-auto">
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
                const currentFull = location.pathname + location.search;
                const isActive = item.to.includes('?')
                  ? currentFull === item.to
                  : location.pathname === item.to && !location.search;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#2563eb] text-white font-semibold shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f3f5f9] flex flex-col md:flex-row font-sans text-slate-800">
      {/* Mobile Top Header (Phone/Tablet view) */}
      <div className="md:hidden bg-[#0e1726] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 z-30 sticky top-0 shadow-md">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 bg-[#2563eb] rounded-lg flex items-center justify-center text-white shadow">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9z" />
            </svg>
          </div>
          <span className="font-bold text-sm tracking-wide">Library System</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white focus:outline-none"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Slide-over Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Mobile Slide-over Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-[#0e1726] text-slate-300 z-50 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 bg-[#2563eb] rounded-lg flex items-center justify-center text-white font-bold text-xs">
                LMS
              </div>
              <span className="font-bold text-sm text-white">Library System</span>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
          {renderNavLinks()}
        </div>

        <div className="p-3 border-t border-slate-800 bg-[#0a111c] flex items-center justify-between">
          <div className="flex items-center space-x-2 truncate">
            <div className="w-7 h-7 rounded-full bg-[#2563eb] text-white font-bold flex items-center justify-center text-xs shrink-0">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
          </div>
          <button onClick={logout} className="text-xs text-rose-400 font-medium px-2 py-1">
            Logout
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar (hidden on phone, visible md and up) */}
      <aside className="hidden md:flex w-60 bg-[#0e1726] text-slate-300 flex-col justify-between shrink-0 shadow-lg select-none">
        <div>
          <div className="flex items-center space-x-3 px-5 py-4 border-b border-slate-800/80">
            <div className="w-8 h-8 bg-[#2563eb] rounded-lg flex items-center justify-center text-white shadow">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-sm text-white tracking-wide leading-tight">Library System</h1>
              <p className="text-[11px] text-slate-400 font-medium">School DB</p>
            </div>
          </div>
          {renderNavLinks()}
        </div>

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
            className="text-slate-400 hover:text-rose-400 p-1.5 transition text-xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 sm:h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shrink-0 shadow-2xs">
          <form onSubmit={handleGlobalSearchSubmit} className="relative w-48 sm:w-80 md:w-96">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search books, ISBN, author..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
            />
          </form>

          <div className="flex items-center space-x-3 sm:space-x-5">
            <Link to="/notifications" className="text-slate-400 hover:text-slate-600 relative p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </Link>

            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#2563eb] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="text-left text-xs leading-tight hidden lg:block">
                <p className="font-semibold text-slate-800">{user?.full_name || 'User'}</p>
                <p className="text-[11px] text-slate-400 font-mono">
                  {user?.role} {user?.username ? `(@${user.username})` : ''}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="text-xs text-rose-500 hover:text-rose-700 font-semibold border border-rose-200 px-2 sm:px-3 py-1 rounded-lg hover:bg-rose-50 transition"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Dynamic Body Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
