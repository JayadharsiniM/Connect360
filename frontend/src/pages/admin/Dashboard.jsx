import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { Users, Calendar, DollarSign, Shield, Layers, Star, TrendingUp } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const res = await adminService.getDashboard();
      setData(res.data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const users = stats.users || {};
  const bookings = stats.bookings || {};
  const revenue = stats.revenue || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Platform overview and management</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {(users.customer || 0) + (users.worker || 0) + (users.admin || 0)}
              </p>
              <p className="text-xs text-gray-500">Total Users</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">₹{revenue.total_revenue || 0}</p>
              <p className="text-xs text-gray-500">Total Revenue</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{revenue.completed_bookings || 0}</p>
              <p className="text-xs text-gray-500">Completed Bookings</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending_verifications || 0}</p>
              <p className="text-xs text-gray-500">Pending Verifications</p>
            </div>
          </div>
        </div>
      </div>

      {/* User Breakdown + Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User breakdown */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Users by Role</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Customers</span>
              <span className="font-semibold text-gray-900">{users.customer || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Workers</span>
              <span className="font-semibold text-gray-900">{users.worker || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Admins</span>
              <span className="font-semibold text-gray-900">{users.admin || 0}</span>
            </div>
          </div>
        </div>

        {/* Booking stats */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Bookings by Status</h2>
          <div className="space-y-3">
            {Object.entries(bookings).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <StatusBadge status={status} />
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
            ))}
            {Object.keys(bookings).length === 0 && (
              <p className="text-sm text-gray-500">No bookings yet</p>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link to="/admin/services" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Layers className="w-5 h-5 text-primary-600" />
              <span className="text-sm font-medium text-gray-700">Manage Services</span>
            </Link>
            <Link to="/admin/verifications" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Shield className="w-5 h-5 text-primary-600" />
              <span className="text-sm font-medium text-gray-700">Review Verifications</span>
              {stats.pending_verifications > 0 && (
                <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  {stats.pending_verifications}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Top Workers */}
      {data?.top_workers && data.top_workers.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" /> Top Rated Workers
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {data.top_workers.map((worker, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="font-medium text-gray-900 text-sm">{worker.full_name}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Star size={14} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-medium">{worker.rating_avg}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{worker.rating_count} reviews • {worker.experience_years} yrs</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Bookings */}
      {data?.recent_bookings && data.recent_bookings.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Recent Bookings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.recent_bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{booking.service_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{booking.customer_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{booking.worker_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{booking.scheduled_date}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">₹{booking.total_amount || '-'}</td>
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
