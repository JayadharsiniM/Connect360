import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { servicesService } from '../../services/servicesService';
import { bookingsService } from '../../services/bookingsService';
import { Calendar, Search, ClipboardList, User, Star } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [servicesRes, bookingsRes] = await Promise.all([
        servicesService.list(),
        bookingsService.listMine(),
      ]);
      setServices(servicesRes.data.services || []);
      setRecentBookings((bookingsRes.data.bookings || []).slice(0, 5));
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.fullName || 'Customer'}
        </h1>
        <p className="text-gray-600 mt-1">Find and book trusted service professionals</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/customer/workers" className="card hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
              <Search className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Browse Workers</h3>
              <p className="text-sm text-gray-600">Find service professionals</p>
            </div>
          </div>
        </Link>

        <Link to="/customer/bookings" className="card hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <ClipboardList className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">My Bookings</h3>
              <p className="text-sm text-gray-600">{recentBookings.length} recent bookings</p>
            </div>
          </div>
        </Link>

        <Link to="/customer/profile" className="card hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">My Profile</h3>
              <p className="text-sm text-gray-600">Update your details</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Services Grid */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Available Services</h2>
          <Link to="/customer/workers" className="text-sm text-primary-600 hover:text-primary-700">
            View all workers →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {services.map((service) => (
            <Link
              key={service.id}
              to={`/customer/workers?service=${service.id}`}
              className="card text-center hover:shadow-md transition-shadow p-4"
            >
              <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-2">
                <Star className="w-5 h-5 text-primary-500" />
              </div>
              <h3 className="font-medium text-gray-900 text-sm">{service.name}</h3>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Bookings */}
      {recentBookings.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
            <Link to="/customer/bookings" className="text-sm text-primary-600 hover:text-primary-700">
              View all →
            </Link>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{booking.service_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{booking.worker_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{booking.scheduled_date}</td>
                    <td className="px-4 py-3"><StatusBadge status={booking.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
