import { useState, useEffect } from 'react';
import { bookingsService } from '../../services/bookingsService';
import StatusBadge from '../../components/StatusBadge';

export default function WorkerBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');

  const statuses = ['', 'pending', 'accepted', 'in_progress', 'completed', 'rejected'];

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setLoading(true);
    try {
      const res = await bookingsService.listWorkerBookings();
      setBookings(res.data.bookings || []);
    } catch (err) {
      setError('Failed to load bookings.');
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRespond(bookingId, action) {
    const confirmMsg = action === 'accept' ? 'Accept this booking?' : 'Reject this booking?';
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(bookingId);
    try {
      await bookingsService.respondToBooking(bookingId, action);
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${action} booking`);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStatusUpdate(bookingId, newStatus) {
    setActionLoading(bookingId);
    try {
      await bookingsService.updateBookingStatus(bookingId, newStatus);
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = filter ? bookings.filter((b) => b.status === filter) : bookings;
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  return (
    <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24 md:pb-stack-xl">
      {/* Header */}
      <section className="flex flex-col gap-stack-sm">
        <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">My Bookings</h1>
        <p className="font-hanken text-body-md text-on-surface-variant">
          {bookings.length} total bookings
          {pendingCount > 0 && ` · ${pendingCount} pending response`}
        </p>
      </section>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 -mx-margin-mobile px-margin-mobile md:mx-0 md:px-0">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`flex-none px-4 py-2 rounded-full font-hanken text-body-sm border transition-all whitespace-nowrap capitalize ${
              filter === s
                ? 'bg-primary-container text-on-primary border-primary-container'
                : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="flex flex-col gap-stack-md">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-surface-container-high rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-12 text-center shadow-level-1">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">error</span>
          <h3 className="font-manrope text-headline-sm text-on-surface mb-2">Error</h3>
          <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
          <button onClick={loadBookings} className="btn-primary mt-4">Retry</button>
        </div>
      ) : filtered.length > 0 ? (
        <div className="flex flex-col gap-stack-md">
          {filtered.map((booking) => (
            <div
              key={booking.id || booking.booking_id}
              className={`bg-surface-container-lowest rounded-xl border p-5 shadow-level-1 flex flex-col gap-4 ${
                booking.status === 'pending' ? 'border-l-4 border-l-warning border-outline-variant' : 'border-outline-variant'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-manrope text-headline-sm text-on-surface">
                      {booking.service_name}
                    </h3>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="font-hanken text-body-sm text-on-surface-variant mt-1">
                    Customer: {booking.customer_name}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    <span className="flex items-center gap-1.5 font-hanken text-body-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                      {booking.scheduled_date}
                    </span>
                    {booking.scheduled_time && (
                      <span className="flex items-center gap-1.5 font-hanken text-body-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        {booking.scheduled_time}
                      </span>
                    )}
                    {booking.total_amount > 0 && (
                      <span className="font-hanken text-label-md text-primary">
                        ₹{booking.total_amount}
                      </span>
                    )}
                  </div>

                  {booking.address && (
                    <p className="font-hanken text-body-sm text-on-surface-variant mt-2 flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-[16px] mt-0.5">location_on</span>
                      {booking.address}
                    </p>
                  )}
                  {booking.notes && (
                    <p className="font-hanken text-body-sm text-on-surface-variant mt-1 italic">
                      Note: {booking.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {booking.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleRespond(booking.id || booking.booking_id, 'accept')}
                        disabled={actionLoading === (booking.id || booking.booking_id)}
                        className="btn-primary !py-2 !px-4 flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespond(booking.id || booking.booking_id, 'reject')}
                        disabled={actionLoading === (booking.id || booking.booking_id)}
                        className="btn-secondary !py-2 !px-4 flex items-center gap-1.5 !text-error !border-error"
                      >
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                        Reject
                      </button>
                    </>
                  )}
                  {booking.status === 'accepted' && (
                    <button
                      onClick={() => handleStatusUpdate(booking.id || booking.booking_id, 'in_progress')}
                      disabled={actionLoading === (booking.id || booking.booking_id)}
                      className="btn-primary !py-2 !px-4 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                      Start Work
                    </button>
                  )}
                  {booking.status === 'in_progress' && (
                    <button
                      onClick={() => handleStatusUpdate(booking.id || booking.booking_id, 'completed')}
                      disabled={actionLoading === (booking.id || booking.booking_id)}
                      className="btn-primary !py-2 !px-4 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">task_alt</span>
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-12 text-center shadow-level-1">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">event_busy</span>
          <h3 className="font-manrope text-headline-sm text-on-surface mb-2">No bookings found</h3>
          <p className="font-hanken text-body-md text-on-surface-variant">
            {filter ? `No ${filter} bookings` : 'No bookings yet. They will appear here once customers book your services.'}
          </p>
        </div>
      )}
    </div>
  );
}
