import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Don't show navbar on landing page
  if (location.pathname === '/') return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setMenuOpen(false);
  };

  const navLinks = {
    customer: [
      { to: '/customer/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { to: '/customer/workers', label: 'Find Workers', icon: 'search' },
      { to: '/customer/bookings', label: 'My Bookings', icon: 'calendar_today' },
      { to: '/customer/profile', label: 'Profile', icon: 'person' },
    ],
    worker: [
      { to: '/worker/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { to: '/worker/bookings', label: 'Bookings', icon: 'calendar_today' },
      { to: '/worker/availability', label: 'Availability', icon: 'schedule' },
      { to: '/worker/verification', label: 'Verification', icon: 'verified' },
      { to: '/worker/profile', label: 'Profile', icon: 'person' },
    ],
    admin: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: 'analytics' },
      { to: '/admin/services', label: 'Services', icon: 'category' },
      { to: '/admin/verifications', label: 'Verifications', icon: 'fact_check' },
    ],
  };

  const links = isAuthenticated ? navLinks[user?.role] || [] : [];

  return (
    <>
      <header className="fixed top-0 w-full z-50 h-16 bg-surface-container-lowest border-b border-outline-variant shadow-level-1 flex justify-between items-center px-margin-mobile md:px-margin-desktop">
        <Link to={isAuthenticated ? `/${user?.role}/dashboard` : '/'} className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              hub
            </span>
          </div>
          <span className="font-manrope text-headline-sm text-primary hidden sm:block">Connect360</span>
        </Link>

        {/* Desktop Nav */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-body-sm font-hanken transition-colors ${
                  location.pathname === link.to
                    ? 'bg-surface-container-high text-primary font-medium'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 0" }}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <div className="hidden md:flex items-center gap-3">
                <div className="text-right">
                  <p className="font-hanken text-body-sm text-on-surface font-medium leading-tight">{user?.name}</p>
                  <p className="font-hanken text-label-sm text-on-surface-variant capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
                  title="Logout"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                </button>
              </div>
              {/* Mobile menu button */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-95"
              >
                <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="font-hanken text-label-md text-secondary hover:underline px-3 py-2">
                Log In
              </Link>
              <Link to="/register" className="btn-primary !py-2 !px-4 !text-body-sm">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && isAuthenticated && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-16 right-0 w-72 bg-surface-container-lowest border-l border-outline-variant shadow-level-3 h-[calc(100vh-64px)] flex flex-col">
            <div className="p-4 border-b border-outline-variant">
              <p className="font-hanken text-body-md text-on-surface font-medium">{user?.name}</p>
              <p className="font-hanken text-body-sm text-on-surface-variant capitalize">{user?.role}</p>
            </div>
            <nav className="flex-1 p-2 flex flex-col gap-1">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-body-md font-hanken transition-colors ${
                    location.pathname === link.to
                      ? 'bg-surface-container-high text-primary font-medium'
                      : 'text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-outline-variant">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-error font-hanken text-body-md hover:bg-error-container/30 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
