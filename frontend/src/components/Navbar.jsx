import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Home, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    const routes = {
      customer: '/customer/dashboard',
      worker: '/worker/dashboard',
      admin: '/admin/dashboard',
    };
    return routes[user.role] || '/';
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to={getDashboardLink()} className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C3</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Connect360</span>
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link to={getDashboardLink()} className="text-gray-600 hover:text-primary-600 flex items-center gap-1">
                  <Home size={18} />
                  <span>Dashboard</span>
                </Link>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                  <User size={16} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">{user.fullName || user.email}</span>
                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full capitalize">
                    {user.role}
                  </span>
                </div>
                <button onClick={handleLogout} className="text-gray-500 hover:text-red-600 p-2" title="Logout">
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm">Login</Link>
                <Link to="/register" className="btn-primary text-sm">Register</Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-gray-600">
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-2">
          {isAuthenticated ? (
            <>
              <div className="text-sm text-gray-600 pb-2 border-b">
                {user.fullName} ({user.role})
              </div>
              <Link to={getDashboardLink()} className="block py-2 text-gray-700" onClick={() => setMobileOpen(false)}>
                Dashboard
              </Link>
              <button onClick={handleLogout} className="block py-2 text-red-600 w-full text-left">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="block py-2 text-gray-700" onClick={() => setMobileOpen(false)}>Login</Link>
              <Link to="/register" className="block py-2 text-primary-600" onClick={() => setMobileOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
