import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { workersService } from '../../services/workersService';
import { bookingsService } from '../../services/bookingsService';
import { priorityService } from '../../services/priorityService';
import StatusBadge from '../../components/StatusBadge';
import DashboardLayout from '../../components/DashboardLayout';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [priorityCount, setPriorityCount] = useState(0);
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

    // Priority requests are non-critical; load separately so a failure here
    // never blocks the main dashboard.
    try {
      const pr = await priorityService.listWorkerRequests();
      setPriorityCount((pr.data.priority_requests || []).length);
    } catch (err) { /* non-blocking */ }
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.fullName?.split(' ')[0] || 'Worker';

  if (loading) {
    return (
      <DashboardLayout>
        {/* Mobile skeleton (unchanged) */}
        <div className="lg:hidden pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
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
        {/* Desktop skeleton */}
        <div className="hidden lg:block animate-pulse flex-col gap-stack-lg">
          <div className="h-9 bg-surface-container-high rounded-lg w-1/3 mb-6" />
          <div className="grid grid-cols-3 gap-gutter mb-8">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-surface-container-high rounded-xl" />)}
          </div>
          <div className="grid grid-cols-12 gap-gutter">
            <div className="col-span-7 h-96 bg-surface-container-high rounded-xl" />
            <div className="col-span-5 h-96 bg-surface-container-high rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* ============================================================= */}
      {/* MOBILE / TABLET VIEW (unchanged, below lg)                     */}
      {/* ============================================================= */}
      <div className="lg:hidden pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24">
        {/* Header */}
        <section className="flex flex-col gap-stack-xs">
          <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">
            Welcome back, {firstName}
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

        {/* ⚡ Priority Requests entry (mobile) */}
        <Link to="/worker/priority-requests" className="priority-card p-4 flex items-center gap-4 active:scale-[0.99] transition-transform">
          <span className="priority-accent-bar" />
          <span className="w-11 h-11 rounded-xl bg-secondary text-on-secondary flex items-center justify-center flex-shrink-0 ml-1">
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          </span>
          <span className="flex-1">
            <span className="flex items-center gap-2">
              <span className="font-manrope text-label-md text-primary">Priority Requests</span>
              {priorityCount > 0 && (
                <span className="bg-secondary text-on-secondary font-hanken text-label-sm px-2 py-0.5 rounded-full">{priorityCount}</span>
              )}
            </span>
            <span className="block font-hanken text-body-sm text-on-surface-variant">
              {priorityCount > 0 ? 'Auto-matched jobs awaiting your response' : 'No priority requests right now'}
            </span>
          </span>
          <span className="material-symbols-outlined text-secondary">arrow_forward</span>
        </Link>

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

      {/* ============================================================= */}
      {/* DESKTOP VIEW (lg and up) — matches uploaded design             */}
      {/* ============================================================= */}
      <div className="hidden lg:flex lg:flex-col gap-stack-lg">
        {/* Page Header */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="font-manrope text-headline-lg text-on-background">{getGreeting()}, {firstName}</h2>
            <p className="font-hanken text-body-md text-on-surface-variant mt-1">Here's your schedule and activity for today.</p>
          </div>
          <span className="font-hanken text-label-sm bg-surface-container px-3 py-1.5 rounded-full text-on-surface-variant border border-outline-slate flex items-center">
            <span className="w-2 h-2 rounded-full bg-secondary mr-2" />
            {profile?.is_verified ? 'Online & Accepting Jobs' : 'Verification Pending'}
          </span>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-gutter">
          <div className="bg-surface-container-lowest border border-outline-slate rounded-xl p-stack-md flex items-center justify-between hover:shadow-level-1 transition-shadow group">
            <div>
              <p className="font-hanken text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Active Bookings</p>
              <p className="font-manrope text-display-lg text-on-background group-hover:text-secondary transition-colors">{active.length}</p>
            </div>
            <div className="w-12 h-12 bg-secondary-fixed/40 rounded-full flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined">event_upcoming</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-slate rounded-xl p-stack-md flex items-center justify-between hover:shadow-level-1 transition-shadow group">
            <div>
              <p className="font-hanken text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Jobs Completed</p>
              <p className="font-manrope text-display-lg text-on-background group-hover:text-secondary transition-colors">{completed.length}</p>
            </div>
            <div className="w-12 h-12 bg-secondary-fixed/40 rounded-full flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined">task_alt</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-slate rounded-xl p-stack-md flex items-center justify-between hover:shadow-level-1 transition-shadow group">
            <div>
              <p className="font-hanken text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Average Rating</p>
              <div className="flex items-end gap-2">
                <p className="font-manrope text-display-lg text-on-background group-hover:text-secondary transition-colors">{profile?.rating_avg || '—'}</p>
                <span className="font-hanken text-label-sm text-on-surface-variant mb-2">({profile?.rating_count || 0})</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-secondary-fixed/40 rounded-full flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            </div>
          </div>
        </div>

        {/* Profile completion (desktop) */}
        {profileCompletion < 100 && (
          <div className="bg-surface-container-lowest border border-outline-slate rounded-xl p-stack-md">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h3 className="font-manrope text-headline-sm text-on-background">Profile Completion</h3>
                <p className="font-hanken text-body-sm text-on-surface-variant">Complete your profile to unlock more bookings.</p>
              </div>
              <span className="font-manrope text-headline-md text-secondary">{profileCompletion}%</span>
            </div>
            <div className="w-full bg-surface-container-highest rounded-full h-2">
              <div className="bg-secondary h-2 rounded-full transition-all" style={{ width: `${profileCompletion}%` }} />
            </div>
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-12 gap-gutter">
          {/* Left: New Booking Requests */}
          <div className="col-span-7 flex flex-col gap-stack-md">
            {/* ⚡ Priority Requests entry (desktop) */}
            <Link to="/worker/priority-requests" className="priority-card p-stack-md flex items-center gap-4 hover:shadow-level-2 transition-all group">
              <span className="priority-accent-bar" />
              <span className="w-12 h-12 rounded-xl bg-secondary text-on-secondary flex items-center justify-center flex-shrink-0 ml-1">
                <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              </span>
              <span className="flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-manrope text-headline-sm text-primary group-hover:text-secondary transition-colors">Priority Requests</span>
                  {priorityCount > 0 && (
                    <span className="bg-secondary text-on-secondary font-hanken text-label-sm px-2 py-0.5 rounded-full">{priorityCount}</span>
                  )}
                </span>
                <span className="block font-hanken text-body-md text-on-surface-variant mt-0.5">
                  {priorityCount > 0 ? 'Auto-matched jobs awaiting your response' : 'No priority requests right now'}
                </span>
              </span>
              <span className="material-symbols-outlined text-secondary group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>

            <div className="flex items-center justify-between border-b border-outline-slate pb-2">
              <h3 className="font-manrope text-headline-sm text-on-background flex items-center">
                <span className="material-symbols-outlined mr-2 text-on-surface-variant">inbox</span>
                New Booking Requests
                {pending.length > 0 && (
                  <span className="ml-3 bg-secondary text-on-secondary font-hanken text-label-sm px-2 py-0.5 rounded-full">{pending.length}</span>
                )}
              </h3>
              <Link to="/worker/bookings" className="font-hanken text-label-sm text-secondary hover:underline">View All</Link>
            </div>

            {pending.length > 0 ? (
              <div className="flex flex-col gap-4">
                {pending.slice(0, 5).map((booking) => (
                  <div key={booking.booking_id || booking.id} className="bg-surface-container-lowest border border-outline-slate rounded-xl p-stack-md flex flex-row gap-4 relative overflow-hidden group hover:shadow-level-1 transition-shadow">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary hidden group-hover:block" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-hanken text-label-md text-on-background">{booking.service_name}</h4>
                          <p className="font-hanken text-body-sm text-on-surface-variant">Requested by {booking.customer_name}</p>
                        </div>
                        <span className="font-hanken text-label-sm bg-surface-container text-on-surface-variant px-2 py-1 rounded">New</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="flex items-center text-on-surface-variant font-hanken text-body-sm">
                          <span className="material-symbols-outlined text-[16px] mr-2">schedule</span>
                          {booking.scheduled_date}{booking.scheduled_time && `, ${booking.scheduled_time}`}
                        </div>
                        {booking.address && (
                          <div className="flex items-center text-on-surface-variant font-hanken text-body-sm">
                            <span className="material-symbols-outlined text-[16px] mr-2">location_on</span>
                            {booking.address}
                          </div>
                        )}
                      </div>
                      {booking.notes && (
                        <p className="font-hanken text-body-sm text-on-surface-variant mt-3 italic">"{booking.notes}"</p>
                      )}
                    </div>
                    <div className="flex flex-col justify-end gap-2 border-l border-outline-slate pl-4 min-w-[120px]">
                      <button
                        onClick={() => handleRespond(booking.booking_id || booking.id, 'accept')}
                        className="bg-primary-container text-on-primary font-hanken text-label-md px-4 py-2 rounded-lg hover:bg-tertiary transition-colors w-full text-center"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespond(booking.booking_id || booking.id, 'reject')}
                        className="bg-surface-container-lowest text-primary-container border border-outline-slate font-hanken text-label-md px-4 py-2 rounded-lg hover:bg-surface-container transition-colors w-full text-center"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface-container-lowest border border-outline-slate rounded-xl p-stack-lg text-center">
                <span className="material-symbols-outlined text-on-surface-variant text-[40px] mb-2">inbox</span>
                <p className="font-hanken text-body-md text-on-surface-variant">No pending booking requests</p>
              </div>
            )}

            {/* Verification alert (desktop) */}
            {!profile?.is_verified && (
              <div className="bg-warning-container/30 border border-warning/30 rounded-xl p-stack-md flex items-start gap-4">
                <span className="material-symbols-outlined text-warning text-[24px] mt-0.5">gpp_maybe</span>
                <div className="flex-1">
                  <h3 className="font-manrope text-headline-sm text-on-surface">Complete Your Verification</h3>
                  <p className="font-hanken text-body-sm text-on-surface-variant mt-1">
                    Upload your documents to get verified and start receiving bookings.
                  </p>
                  <Link to="/worker/verification" className="inline-flex items-center gap-1.5 mt-3 bg-primary-container text-on-primary font-hanken text-label-md px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                    Upload Documents
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right: Today's Schedule (active bookings timeline) */}
          <div className="col-span-5">
            <div className="bg-surface-container-lowest border border-outline-slate rounded-xl p-stack-md h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-manrope text-headline-sm text-on-background flex items-center">
                  <span className="material-symbols-outlined mr-2 text-on-surface-variant">calendar_today</span>
                  Today's Schedule
                </h3>
                <Link to="/worker/bookings" className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container transition-colors text-on-surface-variant">
                  <span className="material-symbols-outlined">more_vert</span>
                </Link>
              </div>

              {active.length > 0 ? (
                <div className="relative border-l-2 border-surface-container-high ml-4 space-y-8 pb-4">
                  {active.slice(0, 5).map((booking, idx) => (
                    <div key={booking.booking_id || booking.id} className="relative pl-6">
                      <div className={`absolute rounded-full border-surface-container-lowest ${
                        idx === 0
                          ? 'w-4 h-4 bg-secondary -left-[9px] top-1 border-4 shadow-sm animate-pulse'
                          : 'w-3 h-3 bg-primary-fixed-dim -left-[7px] top-1.5 border-2'
                      }`} />
                      <div className="flex flex-col">
                        <span className={`font-hanken text-label-sm mb-1 ${idx === 0 ? 'text-secondary font-bold' : 'text-on-surface-variant'}`}>
                          {booking.scheduled_date}{booking.scheduled_time && ` · ${booking.scheduled_time}`}
                          {idx === 0 && ' (Up Next)'}
                        </span>
                        <div className={`p-4 rounded-lg border ${idx === 0 ? 'bg-secondary-fixed/20 border-secondary/30 shadow-sm' : 'bg-surface border-outline-slate'}`}>
                          <h4 className="font-hanken text-label-md text-on-background mb-1">{booking.service_name}</h4>
                          <div className="flex items-center text-on-surface-variant font-hanken text-body-sm">
                            <span className="material-symbols-outlined text-[16px] mr-1">person</span>
                            {booking.customer_name}
                          </div>
                          {booking.address && (
                            <div className="flex items-center text-on-surface-variant font-hanken text-body-sm mt-1">
                              <span className="material-symbols-outlined text-[16px] mr-1">location_on</span>
                              {booking.address}
                            </div>
                          )}
                          <div className="mt-3">
                            <StatusBadge status={booking.status} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-on-surface-variant text-[40px] mb-2">event_busy</span>
                  <p className="font-hanken text-body-sm text-on-surface-variant">No active bookings today</p>
                  <p className="font-hanken text-body-sm text-on-surface-variant mt-1">New bookings appear here once customers book your services.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
