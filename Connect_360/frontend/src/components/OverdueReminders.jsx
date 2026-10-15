import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { bookingsService } from '../services/bookingsService';
import { notificationsService } from '../services/notificationsService';
import StatusBadge from './StatusBadge';

/**
 * OverdueReminders (Enhancement)
 *
 * Worker-facing reminder panel for bookings whose scheduled service time has
 * passed but which were never marked completed. Shows the customer name,
 * service, scheduled date/time, and current status, with an inline action to
 * resolve the booking (Start Work / Mark Complete) — reusing the existing
 * booking status workflow. It never auto-completes anything.
 *
 * De-duplication: the backend already de-duplicates reminders per booking; this
 * component shows each overdue booking once and lets the worker dismiss it.
 */
export default function OverdueReminders({ onResolved }) {
  const { t } = useTranslation();
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [dismissed, setDismissed] = useState(() => new Set());
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingsService.listWorkerOverdue();
      setOverdue(res.data.overdue_bookings || []);
    } catch (err) {
      // Non-critical: never block the dashboard on reminders.
      console.error('Failed to load overdue bookings:', err);
      setOverdue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Next valid action in the existing workflow (accepted -> in_progress -> completed).
  function nextAction(status) {
    if (status === 'accepted') return { to: 'in_progress', labelKey: 'worker.startWork', icon: 'play_arrow' };
    if (status === 'in_progress') return { to: 'completed', labelKey: 'worker.markComplete', icon: 'task_alt' };
    return null; // pending bookings aren't workable until accepted
  }

  async function handleAdvance(booking) {
    const action = nextAction(booking.status);
    if (!action) return;
    setActionId(booking.booking_id);
    try {
      await bookingsService.updateBookingStatus(booking.booking_id, action.to);
      await load();
      if (onResolved) onResolved();
    } catch (err) {
      alert(err.response?.data?.error || t('components.overdueUpdateFailed'));
    } finally {
      setActionId(null);
    }
  }

  async function handleDismiss(booking) {
    setDismissed((prev) => new Set(prev).add(booking.booking_id));
    try {
      await notificationsService.markRead(`NOTIF#OVERDUE#${booking.booking_id}`);
    } catch (err) {
      // Dismiss is a UI nicety; ignore failures.
    }
  }

  const visible = overdue.filter((b) => !dismissed.has(b.booking_id));

  if (loading || visible.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-l-4 border-l-warning border-outline-variant bg-warning-container/20 shadow-level-1 overflow-hidden"
      role="alert"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-3 p-4 text-left"
        aria-expanded={!collapsed}
      >
        <span className="w-10 h-10 rounded-xl bg-warning/20 text-warning flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>notification_important</span>
        </span>
        <span className="flex-1">
          <span className="flex items-center gap-2">
            <span className="font-manrope text-headline-sm text-on-surface">{t('components.overdueTitle')}</span>
            <span className="bg-warning text-on-surface font-hanken text-label-sm px-2 py-0.5 rounded-full">{visible.length}</span>
          </span>
          <span className="block font-hanken text-body-sm text-on-surface-variant mt-0.5">
            {t('components.overdueDesc')}
          </span>
        </span>
        <span className="material-symbols-outlined text-on-surface-variant">
          {collapsed ? 'expand_more' : 'expand_less'}
        </span>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          {visible.map((booking) => {
            const action = nextAction(booking.status);
            return (
              <div
                key={booking.booking_id}
                className="bg-surface-container-lowest rounded-lg border border-outline-variant p-4 flex flex-col md:flex-row md:items-center gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-hanken text-label-md text-on-surface">{booking.service_name}</h4>
                    <StatusBadge status={booking.status} />
                    <span className="badge badge-rejected">
                      <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                      {t('components.overdueChip')}
                    </span>
                  </div>
                  <p className="font-hanken text-body-sm text-on-surface-variant mt-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">person</span>
                    {booking.customer_name}
                  </p>
                  <p className="font-hanken text-body-sm text-on-surface-variant mt-0.5 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                    {booking.scheduled_date}{booking.scheduled_time && `, ${booking.scheduled_time}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {action ? (
                    <button
                      onClick={() => handleAdvance(booking)}
                      disabled={actionId === booking.booking_id}
                      className="btn-primary !py-2 !px-4 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">{action.icon}</span>
                      {t(action.labelKey)}
                    </button>
                  ) : (
                    <span className="font-hanken text-body-sm text-on-surface-variant">{t('components.overdueAwaitingAcceptance')}</span>
                  )}
                  <button
                    onClick={() => handleDismiss(booking)}
                    title={t('components.overdueDismiss')}
                    aria-label={t('components.overdueDismiss')}
                    className="w-9 h-9 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
