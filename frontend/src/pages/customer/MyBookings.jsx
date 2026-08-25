import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingsService } from '../../services/bookingsService';
import StatusBadge from '../../components/StatusBadge';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      const res = await bookingsService.listMine();
      setBookings(res.data.bookings || []);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filter ? bookings.filter((b) => b.status === filter) : bookings;
  const statuses = ['', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'];

  return (
    <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24 md:pb-stack-xl">
      <section className="flex flex-col gap-stack-sm">
        <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">My Bookings</h1>
        <p className="font-hanken text-body-md text-on-surface-variant">{bookings.length} total bookings</p>
      </section>

      {/* Filters */}
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
            <div key={i} className="h-28 bg-surface-container-high rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="flex flex-col gap-stack-md">
          {filtered.map((booking) => (
            <div
              key={booking.booking_id || booking.id}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-level-1 flex flex-col md:flex-row md:items-center gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-manrope text-headline-sm text-on-surface">
                    {booking.service_name}
                  </h3>
                  <StatusBadge status={booking.status} />
                </div>
                <p className="font-hanken text-body-sm text-on-surface-variant mt-1">
                  {booking.worker_name && `with ${booking.worker_name} · `}
                  {booking.scheduled_date} {booking.scheduled_time && `at ${booking.scheduled_time}`}
                </p>
                {booking.total_amount > 0 && (
                  <p className="font-hanken text-label-md text-primary mt-2">₹{booking.total_amount}</p>
                )}
              </div>
              <Link
                to={`/customer/bookings`}
                className="btn-secondary !py-2 !px-4 text-center whitespace-nowrap"
              >
                Details
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-12 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">event_busy</span>
          <h3 className="font-manrope text-headline-sm text-on-surface mb-2">No bookings found</h3>
          <p className="font-hanken text-body-md text-on-surface-variant">
            {filter ? `No ${filter} bookings` : 'Start by booking a professional'}
          </p>
          <Link to="/customer/workers" className="btn-primary mt-4 inline-block">Find Workers</Link>
        </div>
      )}
    </div>
  );
}
