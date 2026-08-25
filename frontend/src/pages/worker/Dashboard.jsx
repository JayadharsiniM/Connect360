import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { workersService } from '../../services/workersService';
import { bookingsService } from '../../services/bookingsService';
import StatusBadge from '../../components/StatusBadge';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [profileRes, bookingsRes] = await Promise.all([
        workersService.getProfile(),
        bookingsService.listWorkerBookings(),
      ]);
      setProfile(profileRes.data.profile);
      setBookings(bookingsRes.data.bookings || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleRespond(bookingId, action) {
    try {
      await bookingsService.respondToBooking(bookingId, action);
      loadData();
    } catch (err) { alert(err.response?.data?.error || `Failed to ${action}`); }
  }

  const pending = bookings.filter((b) => b.status === 'pending');
  const active = bookings.filter((b) => b.status === 'accepted' || b.status === 'in_progress');
  const completed = bookings.filter((b) => b.status === 'completed');

  // Profile completion calculation
  const getProfileCompletion = () => {
    if (!profile) return 0;
    let score = 0;
    if (profile.full_name) score += 15;
    if (profile.bio) score += 15;
    if (profile.phone) score += 10;
    if (profile.city) score += 10;
    if (profile.hourly_rate) score += 15;
    if (profile.skills?.length > 0) score += 15;
    if (profile.services?.length > 0) score += 10;
    if (profile.is_verified) score += 10;
    return Math.min(score, 100);
  };

  const profileCompletion = getProfileCompletion();

  if (loading) {
    return (
      <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
        <div className="animate-pulse flex flex-col gap-stack-lg">
          <div className="h-8 bg-surface-container-high rounded-lg w-2/3" />
          <div className="h-5 bg-surface-container-high rounded-lg w-1/3" />
          <div className="h-20 bg-surface-container-high rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-stack-md">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-surface-container-high rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-lg">
            <div className="h-64 bg-surface-container-high rounded-xl" />
            <div className="h-64 bg-surface-container-high rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24 md:pb-stack-xl">
      {/* Header */}
      <section className="flex flex-col gap-stack-xs">
        <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">
          Welcome back, {user?.fullName?.split(' ')[0] || 'Worker'}
        </h1>
        <p className="font-hanken text-body-md text-on-surface-variant">
          Here is a summary of your professional dashboard for today.
        </p>
      </section>

      {/* Profile Completion */}
      {profileCompletion < 100 && (
        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-level-1 p-stack-md md:p-gutter">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h2 className="font-manrope text-headline-sm text-primary">Profile Completion</h2>
              <p className="font-hanken text-body-sm text-on-surface-variant">Complete your profile to unlock more bookings.</p>
            </div>
            <span className="font-manrope text-headline-md text-secondary">{profileCompletion}%</span>
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-2">
            <div className="bg-secondary-container h-2 rounded-full transition-all" style={{ width: `${profileCompletion}%` }} />
          </div>
        </section>
      )}

      {/* Metric Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-stack-md">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-level-1 p-stack-md flex flex-col gap-2">
          <span className="material-symbols-outlined text-secondary-container bg-surface-container-low p-2 rounded-lg w-fit">upcoming</span>
          <div>
            <p className="font-manrope text-headline-md text-primary">{active.length}</p>
            <p className="font-hanken text-body-sm text-on-surface-variant">Active Bookings</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-level-1 p-stack-md flex flex-col gap-2">
          <span className="material-symbols-outlined text-secondary-container bg-surface-container-low p-2 rounded-lg w-fit">task_alt</span>
          <div>
            <p className="font-manrope text-headline-md text-primary">{completed.length}</p>
            <p className="font-hanken text-body-sm text-on-surface-variant">Jobs Completed</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-level-1 p-stack-md flex flex-col gap-2">
          <span className="material-symbols-outlined text-secondary-container bg-surface-container-low p-2 rounded-lg w-fit" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
          <div>
            <p className="font-manrope text-headline-md text-primary flex items-center gap-1">
              {profile?.rating_avg || '—'}
              <span className="font-hanken text-body-sm text-on-surface-variant font-normal">
                ({profile?.rating_count || 0} reviews)
              </span>
            </p>
            <p className="font-hanken text-body-sm text-on-surface-variant">Rating</p>
          </div>
        </div>
        <div className={`bg-surface-container-lowest rounded-xl border border-outline-variant shadow-level-1 p-stack-md flex flex-col gap-2 ${pending.length > 0 ? 'border-l-4 border-l-warning' : ''}`}>
          <span className={`material-symbols-outlined p-2 rounded-lg w-fit ${pending.length > 0 ? 'text-warning bg-warning-container' : 'text-secondary-container bg-surface-container-low'}`}>
            pending_actions
          </span>
          <div>
            <p className="font-manrope text-headline-md text-primary">{pending.length}</p>
            <p className="font-hanken text-body-sm text-on-surface-variant">Pending Requests</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-lg">
        {/* Booking Requests */}
        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-level-1 p-stack-md md:p-gutter flex flex-col gap-stack-md">
          <div className="flex justify-between items-center">
            <h2 className="font-manrope text-headline-sm text-primary">Booking Requests</h2>
            {bookings.length > 0 && (
              <Link to="/worker/bookings" className="font-hanken text-label-md text-secondary hover:underline">View All</Link>
            )}
          </div>

          {pending.length > 0 ? (
            <div className="flex flex-col gap-stack-md">
              {pending.slice(0, 3).map((booking) => (
                <div key={booking.booking_id || booking.id} className="flex flex-col gap-2 border-b border-outline-variant pb-stack-md last:border-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-stack-md items-center">
                      <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-primary">person</span>
                      </div>
                      <div>
                        <h3 className="font-hanken text-label-md text-primary">{booking.customer_name}</h3>
                        <p className="font-hanken text-body-sm text-on-surface-variant">
                          {booking.service_name} &bull; {booking.scheduled_date}
                          {booking.scheduled_time && `, ${booking.scheduled_time}`}
                        </p>
                      </div>
                    </div>
                    <span className="font-hanken text-label-sm bg-surface-container text-on-surface-variant px-3 py-1 rounded-full">New</span>
                  </div>
                  {booking.notes && (
                    <p className="font-hanken text-body-sm text-on-surface-variant ml-[64px]">"{booking.notes}"</p>
                  )}
                  <div className="flex gap-2 ml-[64px] mt-1">
                    <button
                      onClick={() => handleRespond(booking.booking_id || booking.id, 'accept')}
                      className="bg-primary-container text-on-primary font-hanken text-label-md px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespond(booking.booking_id || booking.id, 'reject')}
                      className="bg-surface-container-lowest text-primary border border-outline-variant font-hanken text-label-md px-4 py-2 rounded-lg hover:bg-surface-container transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-on-surface-variant text-[40px] mb-2">inbox</span>
              <p className="font-hanken text-body-sm text-on-surface-variant">No pending booking requests</p>
            </div>
          )}
        </section>

        {/* Today's Schedule / Active Bookings */}
        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-level-1 p-stack-md md:p-gutter flex flex-col gap-stack-md">
          <div className="flex justify-between items-center">
            <h2 className="font-manrope text-headline-sm text-primary">Active Bookings</h2>
            <Link to="/worker/bookings" className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary">more_horiz</Link>
          </div>

          {active.length > 0 ? (
            <div className="relative border-l-2 border-outline-variant ml-4 flex flex-col gap-stack-lg pb-4">
              {active.slice(0, 4).map((booking, idx) => (
                <div key={booking.booking_id || booking.id} className="relative pl-6">
                  <div className={`absolute w-3 h-3 rounded-full -left-[7px] top-1.5 ring-4 ring-surface-container-lowest ${
                    idx === 0 ? 'bg-secondary-container' : 'bg-outline-variant'
                  }`} />
                  <p className="font-hanken text-label-sm text-secondary-container mb-1">
                    {booking.scheduled_date} {booking.scheduled_time && `· ${booking.scheduled_time}`}
                  </p>
                  <div className="bg-surface rounded-lg p-stack-md border border-outline-variant">
                    <h4 className="font-hanken text-label-md text-primary">{booking.service_name}</h4>
                    <p className="font-hanken text-body-sm text-on-surface-variant mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">person</span>
                      {booking.customer_name}
                    </p>
                    {booking.address && (
                      <p className="font-hanken text-body-sm text-on-surface-variant mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {booking.address}
                      </p>
                    )}
                    <div className="mt-2">
                      <StatusBadge status={booking.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-on-surface-variant text-[40px] mb-2">event_busy</span>
              <p className="font-hanken text-body-sm text-on-surface-variant">No active bookings today</p>
              <p className="font-hanken text-body-sm text-on-surface-variant mt-1">New bookings will appear here once customers book your services.</p>
            </div>
          )}
        </section>
      </div>

      {/* Verification Alert */}
      {!profile?.is_verified && (
        <div className="bg-warning-container/30 border border-warning/30 rounded-xl p-5 flex items-start gap-4">
          <span className="material-symbols-outlined text-warning text-[24px] mt-0.5">gpp_maybe</span>
          <div className="flex-1">
            <h3 className="font-manrope text-headline-sm text-on-surface">Complete Your Verification</h3>
            <p className="font-hanken text-body-sm text-on-surface-variant mt-1">
              Upload your documents to get verified and start receiving bookings from customers.
            </p>
            <Link to="/worker/verification" className="inline-flex items-center gap-1.5 mt-3 bg-primary-container text-on-primary font-hanken text-label-md px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-[18px]">upload</span>
              Upload Documents
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
