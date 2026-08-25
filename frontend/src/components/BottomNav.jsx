import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = {
  customer: [
    { to: '/customer/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/customer/workers', icon: 'search', label: 'Search' },
    { to: '/customer/bookings', icon: 'event_note', label: 'Bookings' },
    { to: '/customer/profile', icon: 'person', label: 'Profile' },
  ],
  worker: [
    { to: '/worker/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/worker/bookings', icon: 'event_note', label: 'Bookings' },
    { to: '/worker/availability', icon: 'schedule', label: 'Schedule' },
    { to: '/worker/profile', icon: 'person', label: 'Profile' },
  ],
  admin: [
    { to: '/admin/dashboard', icon: 'analytics', label: 'Dashboard' },
    { to: '/admin/services', icon: 'category', label: 'Services' },
    { to: '/admin/verifications', icon: 'fact_check', label: 'Verify' },
  ],
};

export default function BottomNav() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return null;

  const items = navItems[user?.role] || [];

  return (
    <nav className="md:hidden fixed bottom-0 w-full z-50 rounded-t-xl bg-surface-container border-t border-outline-variant shadow-level-3 h-16 flex justify-around items-center px-2">
      {items.map((item) => {
        const active = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-col items-center justify-center rounded-full px-4 py-1 active:scale-90 duration-200 transition-all ${
              active
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
            <span className="font-hanken text-label-sm">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
