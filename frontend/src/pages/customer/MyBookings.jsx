import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingsService } from '../../services/bookingsService';
import StatusBadge from '../../components/StatusBadge';
import CallButton from '../../components/CallButton';
import DashboardLayout from '../../components/DashboardLayout';

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

  // Desktop tabs group statuses semantically
  const desktopTabs = [
    { key: '', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];
  const [desktopTab, setDesktopTab] = useState('');

  const desktopFiltered = bookings.filter((b) => {
    if (desktopTab === '') return true;
    if (desktopTab === 'upcoming') return ['pending', 'accepted', 'in_progress'].includes(b.status);
    if (desktopTab === 'completed') return b.status === 'completed';
    if (desktopTab === 'cancelled') return b.status === 'cancelled' || b.status === 'rejected';
    return true;
  });

  return (
    <DashboardLayout>
      {/* ============================================================= */}
      {/* MOBILE / TABLET VIEW (unchanged, below lg)                     */}
      {/* ============================================================= */}
      <div className="lg:hidden pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24">
        <section className="flex flex-col gap-stack-sm">
          <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">My Bookings</h1>
          <p className="font-hanken text-body-md text-on-surface-variant">{bookings.length} total bookings</p>
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
            {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-surface-container-high rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="flex flex-col gap-stack-md">
            {filtered.map((booking) => (
              <div key={booking.booking_id || booking.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-level-1 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-manrope text-headline-sm text-on-surface">{booking.service_name}</h3>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="font-hanken text-body-sm text-on-surface-variant mt-1">
                    {booking.worker_name && `with ${booking.worker_name} · `}
                    {booking.scheduled_date} {booking.scheduled_time && `at ${booking.scheduled_time}`}
                  </p>
                  {booking.total_amount > 0 && <p className="font-hanken text-label-md text-primary mt-2">₹{booking.total_amount}</p>}
                </div>
                <div className="flex flex-col sm:flex-row md:flex-col gap-2 md:min-w-[180px]">
                  <CallButton bookingId={booking.booking_id || booking.id} status={booking.status} label="Call Technician" />
                  <Link to={`/customer/bookings`} className="btn-secondary !py-2 !px-4 text-center whitespace-nowrap">Details</Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-12 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">event_busy</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">No bookings found</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">{filter ? `No ${filter} bookings` : 'Start by booking a professional'}</p>
            <Link to="/customer/workers" className="btn-primary mt-4 inline-block">Find Workers</Link>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* DESKTOP VIEW (lg and up) — matches uploaded design             */}
      {/* ============================================================= */}
      <div className="hidden lg:flex lg:flex-col gap-stack-lg">
        {/* Header */}
        <div>
          <h2 className="font-manrope text-headline-lg text-on-surface mb-2">My Bookings</h2>
          <p className="font-hanken text-body-md text-on-surface-variant">Manage your upcoming appointments and review past services.</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-outline-slate">
          <nav className="flex gap-8">
            {desktopTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setDesktopTab(tab.key)}
                className={`border-b-2 py-4 px-1 font-hanken text-label-md transition-colors ${
                  desktopTab === tab.key ? 'border-secondary text-primary font-bold' : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-stack-md">
            {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-surface-container-high rounded-xl animate-pulse" />)}
          </div>
        ) : desktopFiltered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-stack-md">
            {desktopFiltered.map((booking) => {
              const canCall = booking.status === 'accepted' || booking.status === 'in_progress';
              return (
                <div key={booking.booking_id || booking.id} className="bg-surface-container-lowest border border-outline-slate rounded-xl p-stack-md hover:shadow-level-1 transition-shadow flex flex-col h-full relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-surface-container rounded-bl-full -z-10 opacity-50 group-hover:scale-110 transition-transform" />
                  <div className="flex justify-between items-start mb-4">
                    <StatusBadge status={booking.status} />
                    {booking.total_amount > 0 && <span className="font-manrope text-headline-sm text-on-surface">₹{booking.total_amount}</span>}
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-slate flex-shrink-0">
                      <span className="material-symbols-outlined text-primary">person</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-hanken text-label-md text-on-surface truncate">{booking.worker_name || 'Professional'}</h3>
                      <p className="font-hanken text-body-sm text-on-surface-variant truncate">{booking.service_name}</p>
                    </div>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-on-surface-variant">
                      <span className="material-symbols-outlined text-outline text-[20px]">event</span>
                      <span className="font-hanken text-body-sm">{booking.scheduled_date}{booking.scheduled_time && ` · ${booking.scheduled_time}`}</span>
                    </div>
                    {booking.address && (
                      <div className="flex items-center gap-3 text-on-surface-variant">
                        <span className="material-symbols-outlined text-outline text-[20px]">location_on</span>
                        <span className="font-hanken text-body-sm truncate">{booking.address}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-auto flex gap-3 pt-4 border-t border-surface-variant">
                    {canCall ? (
                      <div className="flex-1">
                        <CallButton bookingId={booking.booking_id || booking.id} status={booking.status} label="Contact Pro" />
                      </div>
                    ) : (
                      <Link to={`/customer/workers`} className="flex-1 bg-surface-container-lowest border border-outline-slate text-primary-container font-hanken text-label-md py-2 rounded-lg hover:bg-surface-container transition-colors text-center">
                        Book Again
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-12 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">event_busy</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">No bookings found</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">
              {desktopTab ? `No ${desktopTab} bookings` : 'Start by booking a professional'}
            </p>
            <Link to="/customer/workers" className="btn-primary mt-4 inline-block">Find Workers</Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
