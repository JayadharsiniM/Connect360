import { useState, useEffect } from 'react';
import { bookingsService } from '../../services/bookingsService';
import StatusBadge from '../../components/StatusBadge';
import CallButton from '../../components/CallButton';
import DashboardLayout from '../../components/DashboardLayout';

export default function WorkerBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

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

  function resetFilters() {
    setFilter('');
    setFromDate('');
    setToDate('');
  }

  const filtered = bookings.filter((b) => {
    if (filter && b.status !== filter) return false;
    if (fromDate && b.scheduled_date && b.scheduled_date < fromDate) return false;
    if (toDate && b.scheduled_date && b.scheduled_date > toDate) return false;
    return true;
  });
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  // Shared booking action buttons (used by both views)
  const renderActions = (booking) => {
    const id = booking.id || booking.booking_id;
    return (
      <>
        {(booking.status === 'accepted' || booking.status === 'in_progress') && (
          <CallButton bookingId={id} status={booking.status} label="Call Customer" />
        )}
        {booking.status === 'pending' && (
          <>
            <button onClick={() => handleRespond(id, 'accept')} disabled={actionLoading === id} className="btn-primary !py-2 !px-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Accept
            </button>
            <button onClick={() => handleRespond(id, 'reject')} disabled={actionLoading === id} className="btn-secondary !py-2 !px-4 flex items-center gap-1.5 !text-error !border-error">
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              Reject
            </button>
          </>
        )}
        {booking.status === 'accepted' && (
          <button onClick={() => handleStatusUpdate(id, 'in_progress')} disabled={actionLoading === id} className="btn-primary !py-2 !px-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
            Start Work
          </button>
        )}
        {booking.status === 'in_progress' && (
          <button onClick={() => handleStatusUpdate(id, 'completed')} disabled={actionLoading === id} className="btn-primary !py-2 !px-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">task_alt</span>
            Mark Complete
          </button>
        )}
      </>
    );
  };

  return (
    <DashboardLayout>
      {/* ============================================================= */}
      {/* MOBILE / TABLET VIEW (unchanged, below lg)                     */}
      {/* ============================================================= */}
      <div className="lg:hidden pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24">
        <section className="flex flex-col gap-stack-sm">
          <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">My Bookings</h1>
          <p className="font-hanken text-body-md text-on-surface-variant">
            {bookings.length} total bookings
            {pendingCount > 0 && ` · ${pendingCount} pending response`}
          </p>
        </section>

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

        {loading ? (
          <div className="flex flex-col gap-stack-md">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-surface-container-high rounded-xl animate-pulse" />)}
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
                      <h3 className="font-manrope text-headline-sm text-on-surface">{booking.service_name}</h3>
                      {booking.booking_type === 'priority' && (
                        <span className="badge badge-priority">
                          <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                          Priority
                        </span>
                      )}
                      <StatusBadge status={booking.status} />
                    </div>
                    <p className="font-hanken text-body-sm text-on-surface-variant mt-1">Customer: {booking.customer_name}</p>
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
                        <span className="font-hanken text-label-md text-primary">₹{booking.total_amount}</span>
                      )}
                    </div>
                    {booking.address && (
                      <p className="font-hanken text-body-sm text-on-surface-variant mt-2 flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[16px] mt-0.5">location_on</span>
                        {booking.address}
                      </p>
                    )}
                    {booking.notes && (
                      <p className="font-hanken text-body-sm text-on-surface-variant mt-1 italic">Note: {booking.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-stretch gap-2 flex-shrink-0 md:min-w-[180px]">
                    {(booking.status === 'accepted' || booking.status === 'in_progress') && (
                      <CallButton bookingId={booking.id || booking.booking_id} status={booking.status} label="Call Customer" />
                    )}
                    <div className="flex items-center gap-2">
                      {booking.status === 'pending' && (
                        <>
                          <button onClick={() => handleRespond(booking.id || booking.booking_id, 'accept')} disabled={actionLoading === (booking.id || booking.booking_id)} className="btn-primary !py-2 !px-4 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            Accept
                          </button>
                          <button onClick={() => handleRespond(booking.id || booking.booking_id, 'reject')} disabled={actionLoading === (booking.id || booking.booking_id)} className="btn-secondary !py-2 !px-4 flex items-center gap-1.5 !text-error !border-error">
                            <span className="material-symbols-outlined text-[16px]">cancel</span>
                            Reject
                          </button>
                        </>
                      )}
                      {booking.status === 'accepted' && (
                        <button onClick={() => handleStatusUpdate(booking.id || booking.booking_id, 'in_progress')} disabled={actionLoading === (booking.id || booking.booking_id)} className="btn-primary !py-2 !px-4 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                          Start Work
                        </button>
                      )}
                      {booking.status === 'in_progress' && (
                        <button onClick={() => handleStatusUpdate(booking.id || booking.booking_id, 'completed')} disabled={actionLoading === (booking.id || booking.booking_id)} className="btn-primary !py-2 !px-4 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">task_alt</span>
                          Mark Complete
                        </button>
                      )}
                    </div>
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

      {/* ============================================================= */}
      {/* DESKTOP VIEW (lg and up) — matches uploaded design             */}
      {/* ============================================================= */}
      <div className="hidden lg:flex lg:flex-col gap-stack-lg">
        {/* Header */}
        <div className="flex justify-between items-center gap-4">
          <div>
            <h2 className="font-manrope text-headline-lg text-on-surface">Bookings Management</h2>
            <p className="font-hanken text-body-md text-on-surface-variant mt-1">
              {bookings.length} total{pendingCount > 0 && ` · ${pendingCount} pending response`}
            </p>
          </div>
        </div>

        {/* Filters sidebar + content */}
        <div className="flex flex-row gap-stack-lg items-start">
          {/* Filters column (1/4) */}
          <div className="w-1/4 flex flex-col gap-stack-md">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-stack-md flex flex-col gap-stack-md sticky top-[80px]">
              <h3 className="font-manrope text-headline-sm text-primary border-b border-surface-container pb-3">Filters</h3>
              <div className="space-y-4">
                <div>
                  <label className="font-hanken text-label-sm text-on-surface-variant block mb-2">Date Range</label>
                  <div className="flex flex-col gap-2">
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full h-11 px-3 border border-outline-slate rounded-lg font-hanken text-body-sm focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none bg-surface" />
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full h-11 px-3 border border-outline-slate rounded-lg font-hanken text-body-sm focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none bg-surface" />
                  </div>
                </div>
                <div>
                  <label className="font-hanken text-label-sm text-on-surface-variant block mb-2">Status</label>
                  <select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full h-11 px-3 border border-outline-slate rounded-lg font-hanken text-body-sm focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none bg-surface capitalize">
                    {statuses.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
                  </select>
                </div>
                <button onClick={resetFilters} className="w-full mt-2 bg-surface-container-low border border-outline-slate text-on-surface font-hanken text-label-md h-10 rounded-lg hover:bg-surface-container transition-colors">
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* Main content (3/4) */}
          <div className="w-3/4 flex flex-col gap-stack-md">
            {/* Status tabs */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-slate px-2 flex overflow-x-auto no-scrollbar">
              {statuses.map((s) => {
                const count = s ? bookings.filter((b) => b.status === s).length : bookings.length;
                return (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`px-6 py-4 font-hanken text-label-md whitespace-nowrap capitalize transition-colors ${
                      filter === s ? 'text-primary border-b-2 border-secondary' : 'text-on-surface-variant hover:text-primary'
                    }`}
                  >
                    {s || 'All'} ({count})
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-surface-container-high rounded-xl animate-pulse" />)}
              </div>
            ) : error ? (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-12 text-center">
                <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">error</span>
                <h3 className="font-manrope text-headline-sm text-on-surface mb-2">Error</h3>
                <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
                <button onClick={loadBookings} className="btn-primary mt-4">Retry</button>
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filtered.map((booking) => (
                  <div
                    key={booking.id || booking.booking_id}
                    className="bg-surface-container-lowest rounded-xl border border-outline-slate p-stack-md flex flex-row gap-6 hover:shadow-level-1 transition-shadow relative overflow-hidden"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${booking.status === 'pending' ? 'bg-error' : booking.status === 'completed' ? 'bg-success' : 'bg-secondary'}`} />

                    {/* Customer */}
                    <div className="flex items-start gap-4 min-w-[200px]">
                      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary border border-outline-slate flex-shrink-0">
                        <span className="material-symbols-outlined">person</span>
                      </div>
                      <div>
                        <h4 className="font-hanken text-label-md text-on-surface">{booking.customer_name}</h4>
                        {booking.address && (
                          <p className="font-hanken text-body-sm text-on-surface-variant flex items-center gap-1 mt-1">
                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                            {booking.address}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-center border-l border-surface-container pl-6">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-hanken text-label-md text-on-surface bg-surface-container-low px-2 py-1 rounded">{booking.service_name}</span>
                          {booking.booking_type === 'priority' && (
                            <span className="badge badge-priority">
                              <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                              Priority
                            </span>
                          )}
                        </div>
                        <StatusBadge status={booking.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <p className="font-hanken text-label-sm text-on-surface-variant">Scheduled</p>
                          <p className="font-hanken text-body-sm text-on-surface font-medium flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                            {booking.scheduled_date}{booking.scheduled_time && `, ${booking.scheduled_time}`}
                          </p>
                        </div>
                        {booking.total_amount > 0 && (
                          <div>
                            <p className="font-hanken text-label-sm text-on-surface-variant">Amount</p>
                            <p className="font-hanken text-body-sm text-on-surface font-medium mt-0.5">₹{booking.total_amount}</p>
                          </div>
                        )}
                      </div>
                      {booking.notes && (
                        <p className="font-hanken text-body-sm text-on-surface-variant mt-2 italic">Note: {booking.notes}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 justify-center border-l border-surface-container pl-6 min-w-[160px]">
                      {renderActions(booking)}
                      {!['pending', 'accepted', 'in_progress'].includes(booking.status) && (
                        <span className="font-hanken text-body-sm text-on-surface-variant text-center">No actions</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-12 text-center">
                <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">event_busy</span>
                <h3 className="font-manrope text-headline-sm text-on-surface mb-2">No bookings found</h3>
                <p className="font-hanken text-body-md text-on-surface-variant">
                  {filter ? `No ${filter} bookings` : 'No bookings yet. They will appear here once customers book your services.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
