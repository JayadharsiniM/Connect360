import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import OnlineToggle from './OnlineToggle';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const { t } = useTranslation();
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
      { to: '/customer/dashboard', label: t('nav.dashboard'), icon: 'dashboard' },
      { to: '/customer/workers', label: t('nav.findWorkers'), icon: 'search' },
      { to: '/customer/bookings', label: t('nav.myBookings'), icon: 'calendar_today' },
      { to: '/customer/profile', label: t('nav.profile'), icon: 'person' },
    ],
    worker: [
      { to: '/worker/dashboard', label: t('nav.dashboard'), icon: 'dashboard' },
      { to: '/worker/bookings', label: t('nav.bookings'), icon: 'calendar_today' },
      { to: '/worker/availability', label: t('nav.availability'), icon: 'schedule' },
      { to: '/worker/verification', label: t('nav.verification'), icon: 'verified' },
      { to: '/worker/profile', label: t('nav.profile'), icon: 'person' },
    ],
    admin: [
      { to: '/admin/dashboard', label: t('nav.dashboard'), icon: 'analytics' },
      { to: '/admin/services', label: t('nav.services'), icon: 'category' },
      { to: '/admin/verifications', label: t('nav.verifications'), icon: 'fact_check' },
    ],
  };

  const links = isAuthenticated ? navLinks[user?.role] || [] : [];

  return (
    <>
      <header className="lg:hidden fixed top-0 w-full z-50 h-16 bg-surface-container-lowest border-b border-outline-variant shadow-level-1 flex justify-between items-center px-margin-mobile md:px-margin-desktop">
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
          <LanguageSwitcher />
          {isAuthenticated && user?.role === 'worker' && <OnlineToggle compact />}
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
                {t('auth.login')}
              </Link>
              <Link to="/register" className="btn-primary !py-2 !px-4 !text-body-sm">
                {t('auth.signup')}
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
                {t('common.logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
