import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { servicesService } from '../../services/servicesService';
import { bookingsService } from '../../services/bookingsService';
import { workersService } from '../../services/workersService';
import StatusBadge from '../../components/StatusBadge';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [servicesRes, bookingsRes, recommendedRes] = await Promise.all([
        servicesService.list(),
        bookingsService.listMine(),
        workersService.getRecommended(null, 4),
      ]);
      setServices(servicesRes.data.services || []);
      setRecentBookings((bookingsRes.data.bookings || []).slice(0, 5));
      setRecommended(recommendedRes.data.workers || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  const upcomingBooking = recentBookings.find(
    (b) => b.status === 'pending' || b.status === 'accepted'
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
        <div className="animate-pulse flex flex-col gap-stack-lg">
          <div className="h-8 bg-surface-container-high rounded-lg w-2/3" />
          <div className="h-5 bg-surface-container-high rounded-lg w-1/3" />
          <div className="h-16 bg-surface-container-high rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-surface-container-high rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24 md:pb-stack-xl">
      {/* Welcome Section */}
      <section className="flex flex-col gap-stack-sm">
        <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">
          {getGreeting()}, {user?.fullName?.split(' ')[0] || 'there'}
        </h1>
        <p className="font-hanken text-body-lg text-on-surface-variant">
          What service do you need today?
        </p>
      </section>

      {/* Search Section */}
      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-level-1 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-2 focus:ring-secondary/20 font-hanken text-body-md outline-none transition-all placeholder:text-on-surface-variant/50"
          />
        </div>
        <button
          onClick={() => navigate('/customer/workers')}
          className="bg-primary-container text-on-primary h-12 px-6 rounded-lg font-hanken text-label-md hover:opacity-90 transition-opacity whitespace-nowrap active:scale-[0.98]"
        >
          Find Professionals
        </button>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-stack-lg">
          {/* Upcoming Booking */}
          {upcomingBooking && (
            <section className="flex flex-col gap-stack-md">
              <h2 className="font-manrope text-headline-sm text-on-surface">Upcoming Booking</h2>
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1 flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-14 h-14 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary text-[28px]">handyman</span>
                  </div>
                  <div>
                    <h3 className="font-manrope text-headline-sm text-on-surface">
                      {upcomingBooking.worker_name || 'Worker'}
                    </h3>
                    <p className="font-hanken text-body-md text-on-surface-variant">
                      {upcomingBooking.service_name}
                    </p>
                    <StatusBadge status={upcomingBooking.status} />
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full md:w-auto border-t border-outline-variant pt-4 md:border-t-0 md:pt-0">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                    <span className="font-hanken text-body-md">{upcomingBooking.scheduled_date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">schedule</span>
                    <span className="font-hanken text-body-md">{upcomingBooking.scheduled_time}</span>
                  </div>
                </div>
                <Link
                  to="/customer/bookings"
                  className="w-full md:w-auto bg-surface-container-lowest border border-outline-variant text-primary-container px-4 py-2 rounded-lg font-hanken text-label-md hover:bg-surface-container-low transition-colors text-center"
                >
                  View Details
                </Link>
              </div>
            </section>
          )}

          {/* Recommended Professionals */}
          <section className="flex flex-col gap-stack-md">
            <div className="flex justify-between items-end">
              <h2 className="font-manrope text-headline-sm text-on-surface">Recommended Professionals</h2>
              <Link to="/customer/workers" className="font-hanken text-label-md text-secondary hover:underline">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
              {recommended.length > 0 ? (
                recommended.slice(0, 4).map((worker) => (
                  <Link
                    key={worker.id}
                    to={`/customer/workers/${worker.id}`}
                    className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-level-1 flex flex-col gap-4 hover:shadow-level-2 transition-shadow"
                  >
                    <div className="flex gap-4">
                      <div className="w-14 h-14 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0 border border-outline-variant">
                        <span className="material-symbols-outlined text-primary text-[24px]">person</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-manrope text-headline-sm text-on-surface">
                            {worker.full_name}
                          </h3>
                          {worker.is_verified && (
                            <span
                              className="material-symbols-outlined text-secondary text-[16px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              verified
                            </span>
                          )}
                        </div>
                        <p className="font-hanken text-body-sm text-on-surface-variant">{worker.city}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span
                            className="material-symbols-outlined text-[#F59E0B] text-[16px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                          <span className="font-hanken text-label-sm text-on-surface">
                            {worker.rating_avg || 0} ({worker.rating_count || 0} reviews)
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-hanken text-body-sm text-on-surface-variant">
                        {worker.experience_years || 0} yrs experience
                      </span>
                      <span className="font-hanken text-label-md text-primary">
                        ₹{worker.hourly_rate || 0}/hr
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant p-8 text-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-[40px] mb-2">group</span>
                  <p className="font-hanken text-body-md text-on-surface-variant">
                    No recommended professionals yet. Browse our workers to get started.
                  </p>
                  <Link to="/customer/workers" className="btn-primary mt-4 inline-block">
                    Browse Workers
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="flex flex-col gap-stack-md">
          <h2 className="font-manrope text-headline-sm text-on-surface">Recent Activity</h2>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1">
            {recentBookings.length > 0 ? (
              <div className="relative pl-6 border-l border-outline-variant flex flex-col gap-6">
                {recentBookings.slice(0, 5).map((booking, index) => (
                  <div key={booking.booking_id || index} className="relative">
                    <div
                      className={`absolute -left-[31px] rounded-full w-6 h-6 flex items-center justify-center border-4 border-surface-container-lowest ${
                        booking.status === 'completed'
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'bg-surface-container-highest text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[12px]">
                        {booking.status === 'completed' ? 'check' : 'event'}
                      </span>
                    </div>
                    <p className="font-hanken text-body-md text-on-surface">
                      {booking.status === 'completed' ? 'Completed' : 'Booked'}{' '}
                      <span className="font-semibold">{booking.service_name}</span>
                      {booking.worker_name && (
                        <span className="text-on-surface-variant"> with {booking.worker_name}</span>
                      )}
                    </p>
                    <p className="font-hanken text-body-sm text-on-surface-variant mt-1">
                      {booking.scheduled_date}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <span className="material-symbols-outlined text-on-surface-variant text-[32px] mb-2">
                  history
                </span>
                <p className="font-hanken text-body-sm text-on-surface-variant">
                  No recent activity yet.
                </p>
              </div>
            )}
          </div>

          {/* Quick Services */}
          {services.length > 0 && (
            <div className="flex flex-col gap-stack-sm">
              <h3 className="font-manrope text-label-md text-on-surface">Quick Services</h3>
              <div className="grid grid-cols-2 gap-2">
                {services.slice(0, 6).map((service) => (
                  <Link
                    key={service.id}
                    to={`/customer/workers?service=${service.id}`}
                    className="bg-surface-container-low text-on-surface-variant px-3 py-2 rounded-lg font-hanken text-body-sm hover:bg-surface-container-high transition-colors text-center truncate"
                  >
                    {service.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
