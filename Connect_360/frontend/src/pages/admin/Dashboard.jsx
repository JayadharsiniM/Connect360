import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import StatusBadge from '../../components/StatusBadge';
import DashboardLayout from '../../components/DashboardLayout';

export default function AdminDashboard() {
  const { t } = useTranslation();
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
      setError(t('admin.loadFailed'));
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="lg:hidden pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
          <div className="animate-pulse flex flex-col gap-stack-lg">
            <div className="h-8 bg-surface-container-high rounded-lg w-1/4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-stack-md">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-surface-container-high rounded-xl" />)}
            </div>
          </div>
        </div>
        <div className="hidden lg:block animate-pulse">
          <div className="h-9 bg-surface-container-high rounded-lg w-1/4 mb-6" />
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-surface-container-high rounded-xl" />)}
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 h-72 bg-surface-container-high rounded-xl" />
            <div className="h-72 bg-surface-container-high rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="pt-6 lg:pt-0 px-margin-mobile lg:px-0 max-w-container mx-auto">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-12 text-center shadow-level-1">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">error</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">{t('admin.errorLoadingDashboard')}</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
            <button onClick={loadDashboard} className="btn-primary mt-4">{t('common.retry')}</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const stats = data?.stats || {};
  const users = stats.users || {};
  const bookings = stats.bookings || {};
  const revenue = stats.revenue || {};
  const totalUsers = (users.customer || 0) + (users.worker || 0) + (users.admin || 0);
  const totalBookings = Object.values(bookings).reduce((sum, c) => sum + (c || 0), 0);

  return (
    <DashboardLayout>
      {/* ============================================================= */}
      {/* MOBILE / TABLET VIEW (unchanged, below lg)                     */}
      {/* ============================================================= */}
      <div className="lg:hidden pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24">
        <section className="flex flex-col gap-stack-sm">
          <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">{t('admin.dashboardTitle')}</h1>
          <p className="font-hanken text-body-md text-on-surface-variant">{t('admin.platformOverview')}</p>
        </section>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-stack-md">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-level-1">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[22px]">group</span>
              </div>
              <div>
                <p className="font-manrope text-headline-sm text-on-surface">{totalUsers}</p>
                <p className="font-hanken text-label-sm text-on-surface-variant">{t('admin.totalUsers')}</p>
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
                <p className="font-hanken text-label-sm text-on-surface-variant">{t('admin.totalRevenue')}</p>
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
                <p className="font-hanken text-label-sm text-on-surface-variant">{t('admin.completed')}</p>
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
                <p className="font-hanken text-label-sm text-on-surface-variant">{t('admin.pendingVerify')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1">
            <h2 className="font-manrope text-headline-sm text-on-surface mb-4">{t('admin.usersByRole')}</h2>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-surface-container-low">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">person</span>
                  <span className="font-hanken text-body-sm text-on-surface">{t('admin.customers')}</span>
                </div>
                <span className="font-manrope text-label-md text-on-surface">{users.customer || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-surface-container-low">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-secondary">engineering</span>
                  <span className="font-hanken text-body-sm text-on-surface">{t('admin.workers')}</span>
                </div>
                <span className="font-manrope text-label-md text-on-surface">{users.worker || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-surface-container-low">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">admin_panel_settings</span>
                  <span className="font-hanken text-body-sm text-on-surface">{t('admin.admins')}</span>
                </div>
                <span className="font-manrope text-label-md text-on-surface">{users.admin || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1">
            <h2 className="font-manrope text-headline-sm text-on-surface mb-4">{t('admin.bookingsByStatus')}</h2>
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
                  <p className="font-hanken text-body-sm text-on-surface-variant">{t('admin.noBookingsYet')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1">
            <h2 className="font-manrope text-headline-sm text-on-surface mb-4">{t('admin.quickActions')}</h2>
            <div className="flex flex-col gap-2">
              <Link to="/admin/services" className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-primary text-[20px]">category</span>
                <span className="font-hanken text-body-sm text-on-surface">{t('admin.manageServices')}</span>
                <span className="material-symbols-outlined text-on-surface-variant text-[16px] ml-auto">chevron_right</span>
              </Link>
              <Link to="/admin/verifications" className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-primary text-[20px]">verified_user</span>
                <span className="font-hanken text-body-sm text-on-surface">{t('admin.reviewVerifications')}</span>
                {stats.pending_verifications > 0 ? (
                  <span className="ml-auto bg-error-container text-on-error-container px-2 py-0.5 rounded-full font-hanken text-label-sm">{stats.pending_verifications}</span>
                ) : (
                  <span className="material-symbols-outlined text-on-surface-variant text-[16px] ml-auto">chevron_right</span>
                )}
              </Link>
              <Link to="/admin/overdue" className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-warning text-[20px]">schedule</span>
                <span className="font-hanken text-body-sm text-on-surface">{t('admin.overdueBookings')}</span>
                {stats.overdue_bookings > 0 ? (
                  <span className="ml-auto bg-error-container text-on-error-container px-2 py-0.5 rounded-full font-hanken text-label-sm">{stats.overdue_bookings}</span>
                ) : (
                  <span className="material-symbols-outlined text-on-surface-variant text-[16px] ml-auto">chevron_right</span>
                )}
              </Link>
              <Link to="/admin/payments" className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
                <span className="font-hanken text-body-sm text-on-surface">{t('admin.payments')}</span>
                <span className="material-symbols-outlined text-on-surface-variant text-[16px] ml-auto">chevron_right</span>
              </Link>
            </div>
          </div>
        </div>

        {data?.top_workers && data.top_workers.length > 0 && (
          <section className="flex flex-col gap-stack-md">
            <h2 className="font-manrope text-headline-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-warning" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              {t('admin.topWorkers')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-stack-md">
              {data.top_workers.map((worker, i) => (
                <div key={i} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-level-1 text-center">
                  <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-primary text-[24px]">person</span>
                  </div>
                  <p className="font-manrope text-label-md text-on-surface truncate">{worker.full_name}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[14px] text-warning" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="font-hanken text-label-sm text-on-surface">{worker.rating_avg}</span>
                  </div>
                  <p className="font-hanken text-body-sm text-on-surface-variant mt-0.5">
                    {t('admin.reviewsYrs', { reviews: worker.rating_count, years: worker.experience_years })}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {data?.recent_bookings && data.recent_bookings.length > 0 && (
          <section className="flex flex-col gap-stack-md">
            <h2 className="font-manrope text-headline-sm text-on-surface">{t('admin.recentBookings')}</h2>
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-level-1 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-container-low border-b border-outline-variant">
                    <tr>
                      <th className="px-4 py-3 text-left font-hanken text-label-sm text-on-surface-variant uppercase">{t('admin.service')}</th>
                      <th className="px-4 py-3 text-left font-hanken text-label-sm text-on-surface-variant uppercase">{t('admin.customer')}</th>
                      <th className="px-4 py-3 text-left font-hanken text-label-sm text-on-surface-variant uppercase hidden md:table-cell">{t('admin.worker')}</th>
                      <th className="px-4 py-3 text-left font-hanken text-label-sm text-on-surface-variant uppercase hidden md:table-cell">{t('admin.date')}</th>
                      <th className="px-4 py-3 text-left font-hanken text-label-sm text-on-surface-variant uppercase">{t('admin.amount')}</th>
                      <th className="px-4 py-3 text-left font-hanken text-label-sm text-on-surface-variant uppercase">{t('admin.statusHeader')}</th>
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

      {/* ============================================================= */}
      {/* DESKTOP VIEW (lg and up) — matches uploaded design             */}
      {/* ============================================================= */}
      <div className="hidden lg:flex lg:flex-col gap-stack-lg">
        {/* Page header */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="font-manrope text-headline-lg text-primary">{t('admin.overview')}</h2>
            <p className="font-hanken text-body-md text-on-surface-variant mt-1">{t('admin.keyMetrics')}</p>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-stack-md hover:shadow-level-1 transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <p className="font-hanken text-label-md text-on-surface-variant uppercase tracking-wider">{t('admin.totalRevenue')}</p>
              <span className="material-symbols-outlined text-secondary bg-secondary-container/20 p-2 rounded-lg">payments</span>
            </div>
            <h3 className="font-manrope text-display-lg text-primary">₹{revenue.total_revenue || 0}</h3>
            <p className="font-hanken text-body-sm text-secondary flex items-center gap-1 mt-2">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              {t('admin.completedBookingsCount', { count: revenue.completed_bookings || 0 })}
            </p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-stack-md hover:shadow-level-1 transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <p className="font-hanken text-label-md text-on-surface-variant uppercase tracking-wider">{t('admin.totalBookings')}</p>
              <span className="material-symbols-outlined text-secondary bg-secondary-container/20 p-2 rounded-lg">calendar_month</span>
            </div>
            <h3 className="font-manrope text-display-lg text-primary">{totalBookings}</h3>
            {stats.overdue_bookings > 0 ? (
              <Link to="/admin/overdue" className="font-hanken text-body-sm text-error font-medium flex items-center gap-1 mt-2 hover:underline">
                <span className="material-symbols-outlined text-[16px]">schedule</span>
                {t('admin.overdueNeedsAttention', { count: stats.overdue_bookings })}
              </Link>
            ) : (
              <p className="font-hanken text-body-sm text-on-surface-variant mt-2">{t('admin.acrossAllStatuses')}</p>
            )}
          </div>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-stack-md hover:shadow-level-1 transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <p className="font-hanken text-label-md text-on-surface-variant uppercase tracking-wider">{t('admin.totalUsers')}</p>
              <span className="material-symbols-outlined text-secondary bg-secondary-container/20 p-2 rounded-lg">group</span>
            </div>
            <h3 className="font-manrope text-display-lg text-primary">{totalUsers}</h3>
            <p className="font-hanken text-body-sm text-on-surface-variant mt-2">{t('admin.workersRegistered', { count: users.worker || 0 })}</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-stack-md hover:shadow-level-1 transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <p className="font-hanken text-label-md text-on-surface-variant uppercase tracking-wider">{t('admin.pendingVerifications')}</p>
              <span className="material-symbols-outlined text-error bg-error-container/50 p-2 rounded-lg">pending_actions</span>
            </div>
            <h3 className="font-manrope text-display-lg text-primary">{stats.pending_verifications || 0}</h3>
            <p className={`font-hanken text-body-sm mt-2 ${stats.pending_verifications > 0 ? 'text-error font-medium' : 'text-on-surface-variant'}`}>
              {stats.pending_verifications > 0 ? t('admin.requiresAttention') : t('admin.allCaughtUp')}
            </p>
          </div>
        </div>

        {/* Breakdown row (users by role 2/3 + bookings by status 1/3) */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-surface-container-lowest rounded-xl border border-outline-slate p-stack-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-manrope text-headline-sm text-primary">{t('admin.usersByRole')}</h3>
              <Link to="/admin/services" className="font-hanken text-label-md text-secondary hover:underline">{t('admin.manage')}</Link>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { labelKey: 'admin.customers', value: users.customer || 0, icon: 'person', color: 'bg-primary-container/10 text-primary-container' },
                { labelKey: 'admin.workers', value: users.worker || 0, icon: 'engineering', color: 'bg-secondary-container/20 text-secondary' },
                { labelKey: 'admin.admins', value: users.admin || 0, icon: 'admin_panel_settings', color: 'bg-surface-container-high text-on-surface-variant' },
              ].map((role) => (
                <div key={role.labelKey} className="border border-outline-slate rounded-lg p-stack-md flex flex-col gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${role.color}`}>
                    <span className="material-symbols-outlined">{role.icon}</span>
                  </div>
                  <div>
                    <p className="font-manrope text-headline-md text-primary">{role.value}</p>
                    <p className="font-hanken text-body-sm text-on-surface-variant">{t(role.labelKey)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-1 bg-surface-container-lowest rounded-xl border border-outline-slate p-stack-lg">
            <h3 className="font-manrope text-headline-sm text-primary mb-6">{t('admin.bookingsByStatus')}</h3>
            <div className="flex flex-col gap-3">
              {Object.entries(bookings).length > 0 ? (
                Object.entries(bookings).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center">
                    <StatusBadge status={status} />
                    <span className="font-manrope text-label-md text-primary">{count}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <span className="material-symbols-outlined text-on-surface-variant text-[32px] mb-2">event_busy</span>
                  <p className="font-hanken text-body-sm text-on-surface-variant">{t('admin.noBookingsYet')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity table */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-slate overflow-hidden">
          <div className="p-stack-md border-b border-outline-slate flex justify-between items-center">
            <h3 className="font-manrope text-headline-sm text-primary">{t('admin.recentBookings')}</h3>
          </div>
          {data?.recent_bookings && data.recent_bookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-slate">
                    <th className="p-4 font-hanken text-label-md text-on-surface">{t('admin.service')}</th>
                    <th className="p-4 font-hanken text-label-md text-on-surface">{t('admin.customer')}</th>
                    <th className="p-4 font-hanken text-label-md text-on-surface">{t('admin.worker')}</th>
                    <th className="p-4 font-hanken text-label-md text-on-surface">{t('admin.date')}</th>
                    <th className="p-4 font-hanken text-label-md text-on-surface text-right">{t('admin.amount')}</th>
                    <th className="p-4 font-hanken text-label-md text-on-surface">{t('admin.statusHeader')}</th>
                  </tr>
                </thead>
                <tbody className="font-hanken text-body-md text-on-surface-variant">
                  {data.recent_bookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-surface-variant hover:bg-surface-container-low transition-colors last:border-0">
                      <td className="p-4 font-medium text-primary">{booking.service_name}</td>
                      <td className="p-4">{booking.customer_name}</td>
                      <td className="p-4">{booking.worker_name || '—'}</td>
                      <td className="p-4">{booking.scheduled_date}</td>
                      <td className="p-4 text-right font-medium text-primary">₹{booking.total_amount || '-'}</td>
                      <td className="p-4"><StatusBadge status={booking.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-stack-lg text-center">
              <span className="material-symbols-outlined text-on-surface-variant text-[40px] mb-2">event_busy</span>
              <p className="font-hanken text-body-md text-on-surface-variant">{t('admin.noRecentBookings')}</p>
            </div>
          )}
        </div>

        {/* Top workers */}
        {data?.top_workers && data.top_workers.length > 0 && (
          <div className="flex flex-col gap-stack-md">
            <h3 className="font-manrope text-headline-sm text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-warning" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              {t('admin.topWorkers')}
            </h3>
            <div className="grid grid-cols-5 gap-6">
              {data.top_workers.map((worker, i) => (
                <div key={i} className="bg-surface-container-lowest rounded-xl border border-outline-slate p-stack-md text-center hover:shadow-level-1 transition-shadow">
                  <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-primary text-[24px]">person</span>
                  </div>
                  <p className="font-manrope text-label-md text-on-surface truncate">{worker.full_name}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[14px] text-warning" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="font-hanken text-label-sm text-on-surface">{worker.rating_avg}</span>
                  </div>
                  <p className="font-hanken text-body-sm text-on-surface-variant mt-0.5">{t('admin.reviewsSuffix', { count: worker.rating_count })}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
