import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Role-accurate navigation (keeps all existing routes reachable).
const sidebarLinks = {
  customer: [
    { to: '/customer/dashboard', label: 'Overview', icon: 'dashboard' },
    { to: '/customer/workers', label: 'Find Workers', icon: 'search' },
    { to: '/customer/bookings', label: 'My Bookings', icon: 'calendar_month' },
    { to: '/customer/profile', label: 'Profile', icon: 'person' },
  ],
  worker: [
    { to: '/worker/dashboard', label: 'Overview', icon: 'dashboard' },
    { to: '/worker/bookings', label: 'Bookings', icon: 'calendar_month' },
    { to: '/worker/availability', label: 'Availability', icon: 'schedule' },
    { to: '/worker/verification', label: 'Verification', icon: 'verified' },
    { to: '/worker/profile', label: 'Profile', icon: 'person' },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Overview', icon: 'analytics' },
    { to: '/admin/revenue', label: 'Revenue', icon: 'payments' },
    { to: '/admin/users', label: 'Users', icon: 'group' },
    { to: '/admin/services', label: 'Services', icon: 'category' },
    { to: '/admin/verification-queue', label: 'Verification Queue', icon: 'fact_check' },
    { to: '/admin/verifications', label: 'Review Console', icon: 'rule' },
  ],
};

// Primary CTA per role, shown at the bottom of the sidebar.
const sidebarCta = {
  customer: { to: '/customer/workers', label: 'Find a Pro' },
  worker: { to: '/worker/availability', label: 'Manage Availability' },
  admin: { to: '/admin/services', label: 'New Service' },
};

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = user?.role || 'customer';
  const links = sidebarLinks[role] || [];
  const cta = sidebarCta[role];

  // Close sidebar on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setSidebarOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="lg:bg-surface min-h-screen relative">
      {/* Backdrop overlay when sidebar is open */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* ===== Toggleable Off-Canvas Sidebar (Desktop & Mobile) ===== */}
      <nav
        className={`fixed left-0 top-0 h-screen w-72 bg-primary border-r border-outline-slate flex flex-col py-stack-lg z-50 shadow-2xl transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navigation Drawer"
      >
        <div className="px-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-surface-container-lowest/10 border border-surface-container/20 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-on-primary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                hub
              </span>
            </div>
            <div>
              <h1 className="font-manrope text-headline-sm font-bold text-surface-container-lowest leading-tight">Connect360</h1>
              <p className="font-hanken text-label-sm text-on-primary-container capitalize">{role} Hub</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-on-primary-container hover:text-white hover:bg-surface-container-highest/20 transition-colors cursor-pointer"
            title="Close navigation"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <ul className="flex flex-col gap-2 flex-grow px-4 overflow-y-auto no-scrollbar">
          {links.map((link) => {
            const active = location.pathname === link.to;
            return (
              <li key={link.to}>
                <Link
                  to={link.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg font-hanken text-label-md transition-colors ${
                    active
                      ? 'text-secondary-fixed border-l-4 border-secondary bg-surface-container-highest/10 font-bold'
                      : 'text-on-primary-container font-medium hover:bg-surface-container-highest/10 ml-1'
                  }`}
                >
                  <span
                    className="material-symbols-outlined mr-3 text-[20px]"
                    style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {link.icon}
                  </span>
                  <span>{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {cta && (
          <div className="px-6 mt-auto">
            <Link
              to={cta.to}
              onClick={() => setSidebarOpen(false)}
              className="w-full bg-surface-container-lowest text-primary font-hanken text-label-md font-bold py-3 rounded-lg hover:bg-surface-container transition-colors flex justify-center items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              {cta.label}
            </Link>
          </div>
        )}
      </nav>

      {/* ===== Content column (Takes full width now, no permanent fixed margin) ===== */}
      <div className="flex flex-col min-h-screen w-full">
        {/* Desktop top bar with 3-line hamburger menu toggle */}
        <header className="hidden lg:flex h-14 w-full sticky top-0 z-30 border-b border-outline-slate bg-surface-container-lowest items-center justify-between px-margin-desktop shadow-xs">
          {/* Left: 3-line hamburger menu toggle + Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="p-2 rounded-xl text-on-surface hover:bg-surface-container-low transition-colors flex items-center justify-center cursor-pointer"
              title={sidebarOpen ? 'Close Menu' : 'Open Navigation Menu'}
              aria-label="Toggle Navigation"
            >
              <span className="material-symbols-outlined text-[24px]">
                {sidebarOpen ? 'menu_open' : 'menu'}
              </span>
            </button>
            <Link to={`/${role}/dashboard`} className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  hub
                </span>
              </div>
              <span className="font-manrope text-base font-extrabold text-primary tracking-tight">Connect360</span>
            </Link>
          </div>

          {/* Right: Notifications, Logout, Profile */}
          <div className="flex items-center gap-5">
            <button className="text-on-surface-variant hover:text-secondary transition-colors relative cursor-pointer" title="Notifications">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full" />
            </button>
            <button
              onClick={handleLogout}
              className="text-on-surface-variant hover:text-secondary transition-colors cursor-pointer"
              title="Log out"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
            <div className="h-8 w-px bg-outline-slate" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-hanken text-body-sm text-on-surface font-medium leading-tight">{user?.fullName || user?.name || 'Account'}</p>
                <p className="font-hanken text-label-sm text-on-surface-variant capitalize">{role}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-surface-container-high border border-outline-slate flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">person</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content — rendered once. Desktop wraps it in a padded canvas. */}
        <div className="lg:flex-1 lg:p-margin-desktop">
          <div className="lg:max-w-7xl lg:mx-auto">{children}</div>
        </div>

        {/* Desktop-only footer */}
        <footer className="hidden lg:block border-t border-outline-slate bg-surface-container w-full py-stack-lg">
          <div className="flex flex-row justify-between items-center px-margin-desktop max-w-container mx-auto gap-4">
            <div className="font-manrope text-label-md font-black text-primary">Connect360</div>
            <nav className="flex gap-gutter items-center">
              <a className="font-hanken text-body-sm text-on-surface-variant hover:text-primary transition-all" href="#">Terms</a>
              <a className="font-hanken text-body-sm text-on-surface-variant hover:text-primary transition-all" href="#">Privacy</a>
              <a className="font-hanken text-body-sm text-on-surface-variant hover:text-primary transition-all" href="#">Support</a>
              <a className="font-hanken text-body-sm text-on-surface-variant hover:text-primary transition-all" href="#">Contact</a>
            </nav>
            <div className="font-hanken text-body-sm text-on-surface-variant">&copy; 2025 Connect360. All rights reserved.</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
