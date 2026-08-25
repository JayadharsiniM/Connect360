import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import StatusBadge from '../../components/StatusBadge';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const res = await adminService.getDashboard();
      setData(res.data);
    } catch (err) {
      setError('Failed to load dashboard data.');
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
        <div className="animate-pulse flex flex-col gap-stack-lg">
          <div className="h-8 bg-surface-container-high rounded-lg w-1/4" />
          <div className="h-5 bg-surface-container-high rounded-lg w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-stack-md">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-surface-container-high rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-surface-container-high rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-12 text-center shadow-level-1">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">error</span>
          <h3 className="font-manrope text-headline-sm text-on-surface mb-2">Error Loading Dashboard</h3>
          <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
          <button onClick={loadDashboard} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const users = stats.users || {};
  const bookings = stats.bookings || {};
  const revenue = stats.revenue || {};
  const totalUsers = (users.customer || 0) + (users.worker || 0) + (users.admin || 0);

  return (
    <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24 md:pb-stack-xl">
      {/* Header */}
      <section className="flex flex-col gap-stack-sm">
        <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">Admin Dashboard</h1>
        <p className="font-hanken text-body-md text-on-surface-variant">Platform overview and management</p>
      </section>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-stack-md">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-level-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[22px]">group</span>
            </div>
            <div>
              <p className="font-manrope text-headline-sm text-on-surface">{totalUsers}</p>
              <p className="font-hanken text-label-sm text-on-surface-variant">Total Users</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-level-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-success-container flex items-center justify-center">
              <span className="material-symbols-outlined text-success text-[22px]">payments</span>
            </div>
            <div>
              <p className="font-manrope text-headline-sm text-on-surface">₹{revenue.total_revenue || 0}</p>
              <p className="font-hanken text-label-sm text-on-surface-variant">Total Revenue</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-level-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-[22px]">event_available</span>
            </div>
            <div>
              <p className="font-manrope text-headline-sm text-on-surface">{revenue.completed_bookings || 0}</p>
              <p className="font-hanken text-label-sm text-on-surface-variant">Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-level-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-warning-container flex items-center justify-center">
              <span className="material-symbols-outlined text-warning text-[22px]">verified_user</span>
            </div>
            <div>
              <p className="font-manrope text-headline-sm text-on-surface">{stats.pending_verifications || 0}</p>
              <p className="font-hanken text-label-sm text-on-surface-variant">Pending Verify</p>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
        {/* User Breakdown */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1">
          <h2 className="font-manrope text-headline-sm text-on-surface mb-4">Users by Role</h2>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">person</span>
                <span className="font-hanken text-body-sm text-on-surface">Customers</span>
              </div>
              <span className="font-manrope text-label-md text-on-surface">{users.customer || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">engineering</span>
                <span className="font-hanken text-body-sm text-on-surface">Workers</span>
              </div>
              <span className="font-manrope text-label-md text-on-surface">{users.worker || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">admin_panel_settings</span>
                <span className="font-hanken text-body-sm text-on-surface">Admins</span>
              </div>
              <span className="font-manrope text-label-md text-on-surface">{users.admin || 0}</span>
            </div>
          </div>
        </div>

        {/* Booking Stats */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1">
          <h2 className="font-manrope text-headline-sm text-on-surface mb-4">Bookings by Status</h2>
          <div className="flex flex-col gap-3">
            {Object.entries(bookings).length > 0 ? (
              Object.entries(bookings).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center p-3 rounded-lg bg-surface-container-low">
                  <StatusBadge status={status} />
                  <span className="font-manrope text-label-md text-on-surface">{count}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <span className="material-symbols-outlined text-on-surface-variant text-[32px] mb-2">event_busy</span>
                <p className="font-hanken text-body-sm text-on-surface-variant">No bookings yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1">
          <h2 className="font-manrope text-headline-sm text-on-surface mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-2">
            <Link
              to="/admin/services"
              className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-primary text-[20px]">category</span>
              <span className="font-hanken text-body-sm text-on-surface">Manage Services</span>
              <span className="material-symbols-outlined text-on-surface-variant text-[16px] ml-auto">chevron_right</span>
            </Link>
            <Link
              to="/admin/verifications"
              className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-primary text-[20px]">verified_user</span>
              <span className="font-hanken text-body-sm text-on-surface">Review Verifications</span>
              {stats.pending_verifications > 0 && (
                <span className="ml-auto bg-error-container text-on-error-container px-2 py-0.5 rounded-full font-hanken text-label-sm">
                  {stats.pending_verifications}
                </span>
              )}
              {!stats.pending_verifications && (
                <span className="material-symbols-outlined text-on-surface-variant text-[16px] ml-auto">chevron_right</span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Top Workers */}
      {data?.top_workers && data.top_workers.length > 0 && (
        <section className="flex flex-col gap-stack-md">
          <h2 className="font-manrope text-headline-sm text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-warning" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            Top Rated Workers
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-stack-md">
            {data.top_workers.map((worker, i) => (
              <div
                key={i}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-level-1 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-primary text-[24px]">person</span>
                </div>
                <p className="font-manrope text-label-md text-on-surface truncate">{worker.full_name}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[14px] text-warning" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-hanken text-label-sm text-on-surface">{worker.rating_avg}</span>
                </div>
                <p className="font-hanken text-body-sm text-on-surface-variant mt-0.5">
                  {worker.rating_count} reviews · {worker.experience_years} yrs
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Bookings */}
      {data?.recent_bookings && data.recent_bookings.length > 0 && (
        <section className="flex flex-col gap-stack-md">
          <h2 className="font-manrope text-headline-sm text-on-surface">Recent Bookings</h2>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-level-1 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="px-4 py-3 text-left font-hanken text-label-sm text-on-surface-variant uppercase">Service</th>
                    <th className="px-4 py-3 text-left font-hanken text-label-sm text-on-surface-variant uppercase">Customer</th>
                    <th className="px-4 py-3 text-left font-hanken text-label-sm text-on-surface-variant uppercase hidden md:table-cell">Worker</th>
                    <th className="px-4 py-3 text-left font-hanken text-label-sm text-on-surface-variant uppercase hidden md:table-cell">Date</th>
                    <th className="px-4 py-3 text-left font-hanken text-label-sm text-on-surface-variant uppercase">Amount</th>
                    <th className="px-4 py-3 text-left font-hanken text-label-sm text-on-surface-variant uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {data.recent_bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-4 py-3 font-hanken text-body-sm text-on-surface">{booking.service_name}</td>
                      <td className="px-4 py-3 font-hanken text-body-sm text-on-surface-variant">{booking.customer_name}</td>
                      <td className="px-4 py-3 font-hanken text-body-sm text-on-surface-variant hidden md:table-cell">{booking.worker_name}</td>
                      <td className="px-4 py-3 font-hanken text-body-sm text-on-surface-variant hidden md:table-cell">{booking.scheduled_date}</td>
                      <td className="px-4 py-3 font-hanken text-label-md text-primary">₹{booking.total_amount || '-'}</td>
                      <td className="px-4 py-3"><StatusBadge status={booking.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
