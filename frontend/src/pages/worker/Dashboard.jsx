import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { workersService } from '../../services/workersService';
import { bookingsService } from '../../services/bookingsService';
import { Calendar, User, Clock, CheckCircle, AlertCircle, Star, Shield } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [profileRes, bookingsRes] = await Promise.all([
        workersService.getProfile(),
        bookingsService.listWorkerBookings(),
      ]);
      setProfile(profileRes.data.profile);
      setBookings(bookingsRes.data.bookings || []);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-6">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>)}
      </div>
    </div>;
  }

  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const activeBookings = bookings.filter((b) => ['accepted', 'in_progress'].includes(b.status));
  const completedCount = bookings.filter((b) => b.status === 'completed').length;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {user?.fullName || 'Worker'}
          </h1>
          <p className="text-gray-600 mt-1">Manage your bookings and profile</p>
        </div>
        {profile && !profile.is_verified && (
          <Link to="/worker/verification" className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm hover:bg-yellow-100">
            <AlertCircle size={16} />
            Complete verification to receive bookings
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto">
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{pendingBookings.length}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="card text-center">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{activeBookings.length}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
        <div className="card text-center">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{completedCount}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        <div className="card text-center">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto">
            <Star className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{profile?.rating_avg || '0.0'}</p>
          <p className="text-xs text-gray-500">Rating ({profile?.rating_count || 0})</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link to="/worker/bookings" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary-600" />
          <span className="font-medium text-gray-900">My Bookings</span>
        </Link>
        <Link to="/worker/profile" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <User className="w-5 h-5 text-primary-600" />
          <span className="font-medium text-gray-900">Edit Profile</span>
        </Link>
        <Link to="/worker/availability" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <Clock className="w-5 h-5 text-primary-600" />
          <span className="font-medium text-gray-900">Set Availability</span>
        </Link>
        <Link to="/worker/verification" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary-600" />
          <span className="font-medium text-gray-900">Verification</span>
        </Link>
      </div>

      {/* Pending Bookings */}
      {pendingBookings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Action Required</h2>
          <div className="space-y-3">
            {pendingBookings.slice(0, 5).map((booking) => (
              <div key={booking.id} className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-l-4 border-yellow-400">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{booking.service_name}</h3>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {booking.customer_name} • {booking.scheduled_date} at {booking.scheduled_time}
                  </p>
                </div>
                <Link to="/worker/bookings" className="btn-primary text-sm">
                  Respond
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
