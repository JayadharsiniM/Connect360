import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { priorityService } from '../../services/priorityService';
import PriorityStatus, { priorityStatusMeta } from '../../components/PriorityStatus';
import DashboardLayout from '../../components/DashboardLayout';
import { PRIORITY_STATUS } from '../../config/constants';

// Statuses that are still "live" and worth polling for updates.
const ACTIVE = [PRIORITY_STATUS.MATCHING, PRIORITY_STATUS.REMATCHING, PRIORITY_STATUS.WORKER_PENDING];

export default function PriorityBookings() {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await priorityService.listCustomer();
      setItems(res.data.priority_bookings || []);
    } catch (err) {
      console.error('Priority load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while any request is still actively matching / awaiting a worker.
  useEffect(() => {
    const anyActive = items.some((b) => ACTIVE.includes(b.status));
    clearInterval(pollRef.current);
    if (anyActive) {
      pollRef.current = setInterval(load, 4000);
    }
    return () => clearInterval(pollRef.current);
  }, [items, load]);

  async function handleRematch(id) {
    setActionId(id);
    try {
      await priorityService.rematch(id);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not rematch');
    } finally {
      setActionId(null);
    }
  }

  async function handleCancel(id) {
    if (!window.confirm('Cancel this priority request?')) return;
    setActionId(id);
    try {
      await priorityService.cancel(id);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not cancel');
    } finally {
      setActionId(null);
    }
  }

  return (
    <DashboardLayout>
      <div className="pt-6 lg:pt-0 px-margin-mobile md:px-margin-desktop lg:px-0 max-w-3xl mx-auto flex flex-col gap-stack-lg pb-24 lg:pb-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-secondary text-on-secondary flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            </span>
            <div>
              <h1 className="font-manrope text-headline-lg-mobile lg:text-headline-lg text-primary">Priority Bookings</h1>
              <p className="font-hanken text-body-sm text-on-surface-variant">Automatic worker matching status</p>
            </div>
          </div>
          <Link to="/customer/priority/new" className="btn-primary !py-2 !px-4 hidden sm:inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col gap-stack-md">
            {[1, 2].map((i) => <div key={i} className="h-40 bg-surface-container-high rounded-xl animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="priority-card p-12 text-center">
            <div className="priority-accent-bar" />
            <span className="material-symbols-outlined text-secondary text-[48px] mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            <h3 className="font-manrope text-headline-sm text-primary mb-2">No priority requests yet</h3>
            <p className="font-hanken text-body-md text-on-surface-variant mb-4">
              Let us find the best available worker for you automatically.
            </p>
            <Link to="/customer/priority/new" className="btn-primary inline-block">Start a Priority Request</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-stack-md">
            {items.map((b) => (
              <PriorityCard
                key={b.booking_id}
                booking={b}
                busy={actionId === b.booking_id}
                onRematch={() => handleRematch(b.booking_id)}
                onCancel={() => handleCancel(b.booking_id)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function PriorityCard({ booking, busy, onRematch, onCancel }) {
  const meta = priorityStatusMeta(booking.status);
  const worker = booking.worker;
  const isMatching = booking.status === PRIORITY_STATUS.MATCHING || booking.status === PRIORITY_STATUS.REMATCHING;
  const isConfirmed = booking.status === PRIORITY_STATUS.ACCEPTED;
  const isNoWorker = booking.status === PRIORITY_STATUS.NO_WORKER || booking.status === PRIORITY_STATUS.EXPIRED;
  const canCancel = ACTIVE.includes(booking.status);

  return (
    <div className="priority-card p-stack-lg flex flex-col gap-stack-md">
      <div className="priority-accent-bar" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="badge badge-priority">
            <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            Priority
          </span>
          <h3 className="font-manrope text-headline-sm text-primary">{booking.service_name}</h3>
        </div>
        {booking.scheduled_date && (
          <span className="font-hanken text-body-sm text-on-surface-variant whitespace-nowrap">
            {booking.scheduled_date}{booking.scheduled_time && ` · ${booking.scheduled_time}`}
          </span>
        )}
      </div>

      {/* Matching visual (radar ping) */}
      {isMatching && (
        <div className="flex items-center justify-center py-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-secondary/30 anim-ping" />
            <span className="absolute inset-0 rounded-full bg-secondary/20 anim-ping" style={{ animationDelay: '0.6s' }} />
            <span className="material-symbols-outlined text-secondary text-[32px] relative" style={{ fontVariationSettings: "'FILL' 1" }}>
              radar
            </span>
          </div>
        </div>
      )}

      <PriorityStatus status={booking.status} />

      {/* Worker card once found / confirmed */}
      {worker && (booking.status === PRIORITY_STATUS.WORKER_PENDING || isConfirmed) && (
        <div className="flex items-center gap-4 bg-surface-container-low rounded-lg p-4 anim-rise">
          <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-slate flex-shrink-0">
            <span className="material-symbols-outlined text-primary">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-hanken text-label-md text-on-surface truncate">{worker.full_name}</p>
            <p className="font-hanken text-body-sm text-on-surface-variant">
              Match score {worker.match_score ?? booking.match_score ?? 0}%
            </p>
          </div>
          {booking.total_amount > 0 && (
            <span className="font-manrope text-headline-sm text-primary">₹{booking.total_amount}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        {isConfirmed && (
          <Link to="/customer/bookings" className="btn-primary !py-2 !px-4 inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">event_available</span>
            View Booking
          </Link>
        )}
        {isNoWorker && (
          <>
            <Link to="/customer/priority/new" className="btn-secondary !py-2 !px-4">Change Preferences</Link>
            <button onClick={onRematch} disabled={busy} className="btn-primary !py-2 !px-4">
              {busy ? 'Retrying…' : 'Try Again'}
            </button>
            <Link to="/customer/workers" className="btn-ghost !py-2 !px-4">Manual Booking</Link>
          </>
        )}
        {canCancel && (
          <button onClick={onCancel} disabled={busy} className="btn-ghost !py-2 !px-4 !text-error">
            {busy ? 'Cancelling…' : 'Cancel Request'}
          </button>
        )}
      </div>
    </div>
  );
}
