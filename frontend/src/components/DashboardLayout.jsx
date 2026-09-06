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

/**
 * DashboardLayout adds the desktop-only fixed sidebar + top bar + footer around
 * authenticated pages. The chrome (sidebar/topbar/footer) is `hidden lg:*` so it
 * only appears from the `lg` breakpoint up. The page content is rendered ONCE and
 * simply shifts right (lg:ml-64) on desktop, so mobile/tablet layout — including
 * the existing top Navbar and BottomNav — is completely untouched, and page data
 * is fetched only once.
 */
export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = user?.role || 'customer';
  const links = sidebarLinks[role] || [];
  const cta = sidebarCta[role];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="lg:bg-surface">
      {/* ===== Desktop-only fixed sidebar ===== */}
      <nav className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-primary border-r border-outline-slate flex-col py-stack-lg z-50">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-surface-container-lowest/10 border border-surface-container/20 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-on-primary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              hub
            </span>
          </div>
          <div>
            <h1 className="font-manrope text-headline-sm font-bold text-surface-container-lowest leading-tight">Connect360</h1>
            <p className="font-hanken text-label-sm text-on-primary-container capitalize">{role} Hub</p>
          </div>
        </div>

        <ul className="flex flex-col gap-2 flex-grow px-4">
          {links.map((link) => {
            const active = location.pathname === link.to;
            return (
              <li key={link.to}>
                <Link
                  to={link.to}
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
              className="w-full bg-surface-container-lowest text-primary font-hanken text-label-md font-bold py-3 rounded-lg hover:bg-surface-container transition-colors flex justify-center items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              {cta.label}
            </Link>
          </div>
        )}
      </nav>

      {/* ===== Content column (shifts right on desktop) ===== */}
      <div className="lg:ml-64 lg:flex lg:flex-col lg:min-h-screen">
        {/* Desktop-only top bar */}
        <header className="hidden lg:flex h-14 w-full sticky top-0 z-40 border-b border-outline-slate bg-surface-container-lowest items-center justify-between px-margin-desktop">
          <div className="flex-1 flex items-center">
            <div className="relative w-96 max-w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                search
              </span>
              <input
                className="w-full h-9 pl-10 pr-4 rounded-lg bg-surface-container-low border border-outline-slate font-hanken text-body-sm focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
                placeholder="Search..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-5">
            <button className="text-on-surface-variant hover:text-secondary transition-colors relative" title="Notifications">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full" />
            </button>
            <button
              onClick={handleLogout}
              className="text-on-surface-variant hover:text-secondary transition-colors"
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
          <div className="lg:max-w-container lg:mx-auto">{children}</div>
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
