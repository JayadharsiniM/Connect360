import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminService } from '../../services/adminService';
import StatusBadge from '../../components/StatusBadge';
import DashboardLayout from '../../components/DashboardLayout';

/**
 * Admin Overdue Bookings (Enhancement)
 *
 * Lets an admin identify unresolved bookings: those whose scheduled service
 * time has passed but which were never marked completed. Read-only — the admin
 * sees the worker, customer, service, date and current status so they can
 * follow up. Resolution still happens through the worker's normal workflow.
 */
export default function AdminOverdueBookings() {
  const { t } = useTranslation();
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await adminService.listOverdueBookings();
      setOverdue(res.data.overdue_bookings || []);
    } catch (err) {
      setError(t('adminOverdue.loadFailed'));
      console.error('Error loading overdue bookings:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="pt-6 lg:pt-0 px-margin-mobile lg:px-0 max-w-container mx-auto flex flex-col gap-stack-lg pb-24 lg:pb-0">
        <section className="flex flex-col gap-stack-sm">
          <h1 className="font-manrope text-headline-lg-mobile lg:text-headline-lg text-primary">{t('adminOverdue.title')}</h1>
          <p className="font-hanken text-body-md text-on-surface-variant">
            {t('adminOverdue.subtitle')}
            {overdue.length > 0 && t('adminOverdue.unresolvedSuffix', { count: overdue.length })}
          </p>
        </section>

        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-surface-container-high rounded-xl animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-12 text-center shadow-level-1">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">error</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">{t('adminOverdue.error')}</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
            <button onClick={load} className="btn-primary mt-4">{t('adminOverdue.retry')}</button>
          </div>
        ) : overdue.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-12 text-center shadow-level-1">
            <span className="material-symbols-outlined text-success text-[48px] mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">{t('adminOverdue.noOverdue')}</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">{t('adminOverdue.noOverdueDesc')}</p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate shadow-level-1 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container border-b border-outline-slate">
                  <tr>
                    <th className="p-4 font-hanken text-label-md text-on-surface">{t('adminOverdue.service')}</th>
                    <th className="p-4 font-hanken text-label-md text-on-surface">{t('adminOverdue.customer')}</th>
                    <th className="p-4 font-hanken text-label-md text-on-surface">{t('adminOverdue.worker')}</th>
                    <th className="p-4 font-hanken text-label-md text-on-surface">{t('adminOverdue.scheduled')}</th>
                    <th className="p-4 font-hanken text-label-md text-on-surface">{t('adminOverdue.status')}</th>
                  </tr>
                </thead>
                <tbody className="font-hanken text-body-md text-on-surface-variant">
                  {overdue.map((b) => (
                    <tr key={b.id} className="border-b border-surface-variant last:border-0 hover:bg-surface-container-low transition-colors">
                      <td className="p-4 font-medium text-primary">
                        {b.service_name}
                        {b.booking_type === 'priority' && (
                          <span className="badge badge-priority ml-2">
                            <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                            {t('adminOverdue.priority')}
                          </span>
                        )}
                      </td>
                      <td className="p-4">{b.customer_name}</td>
                      <td className="p-4">{b.worker_name || '—'}</td>
                      <td className="p-4">{b.scheduled_date}{b.scheduled_time && `, ${b.scheduled_time}`}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={b.status} />
                          <span className="badge badge-rejected">
                            <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                            {t('adminOverdue.overdue')}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
