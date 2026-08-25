import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { workersService } from '../../services/workersService';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function WorkerDetail() {
  const { id } = useParams();
  const [worker, setWorker] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadWorker(); }, [id]);

  async function loadWorker() {
    try {
      const [workerRes, reviewsRes] = await Promise.all([
        workersService.getById(id),
        workersService.getReviews(id),
      ]);
      setWorker(workerRes.data.worker);
      setReviews(reviewsRes.data.reviews || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) {
    return (
      <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
        <div className="animate-pulse flex flex-col gap-stack-lg">
          <div className="h-6 bg-surface-container-high rounded w-24" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            <div className="md:col-span-2 h-64 bg-surface-container-high rounded-xl" />
            <div className="h-64 bg-surface-container-high rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto text-center py-stack-xl">
        <span className="material-symbols-outlined text-on-surface-variant text-[48px]">person_off</span>
        <h2 className="font-manrope text-headline-sm text-on-surface mt-4">Worker not found</h2>
        <Link to="/customer/workers" className="btn-secondary mt-4 inline-block">Back to search</Link>
      </div>
    );
  }

  // Group availability by day
  const availByDay = {};
  (worker.availability || []).forEach((slot) => {
    const day = slot.day_of_week;
    if (!availByDay[day]) availByDay[day] = [];
    availByDay[day].push(slot);
  });

  return (
    <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24 md:pb-stack-xl">
      {/* Back */}
      <Link to="/customer/workers" className="flex items-center gap-1 font-hanken text-body-sm text-on-surface-variant hover:text-secondary w-fit">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back to search
      </Link>

      {/* Profile Header Bento */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        {/* Main Profile Card */}
        <div className="md:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-level-2 p-stack-lg flex flex-col md:flex-row gap-stack-lg items-center md:items-start relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-surface-container to-surface-container-lowest opacity-50 pointer-events-none" />
          
          <div className="relative z-10 w-32 h-32 md:w-40 md:h-40 flex-shrink-0">
            <div className="w-full h-full rounded-full border-4 border-surface-container-lowest shadow-lg bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[60px]">person</span>
            </div>
            {worker.is_verified && (
              <div className="absolute bottom-2 right-2 bg-secondary text-on-secondary rounded-full p-1 border-2 border-surface-container-lowest flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              </div>
            )}
          </div>

          <div className="relative z-10 flex-grow text-center md:text-left flex flex-col gap-1">
            <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">{worker.full_name}</h1>
            <p className="font-manrope text-headline-sm text-on-surface-variant flex items-center justify-center md:justify-start gap-2">
              {worker.city || 'Service Professional'}
              {worker.is_verified && (
                <span className="px-2 py-0.5 bg-surface-container-low text-primary text-xs rounded-full font-hanken text-label-sm">Verified</span>
              )}
            </p>

            <div className="flex items-center justify-center md:justify-start gap-stack-md mt-2 text-on-surface-variant">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-secondary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="font-manrope text-headline-sm text-primary">{worker.rating_avg || 0}</span>
                <span className="font-hanken text-body-sm">({worker.rating_count || 0} Reviews)</span>
              </div>
              {worker.experience_years > 0 && (
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">work</span>
                  <span className="font-hanken text-body-sm">{worker.experience_years} yrs experience</span>
                </div>
              )}
            </div>

            {/* Skills */}
            {worker.skills?.length > 0 && (
              <div className="mt-stack-md flex flex-wrap gap-2 justify-center md:justify-start">
                {worker.skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-surface-container text-on-surface rounded-full font-hanken text-label-sm">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Action / Booking Card */}
        <div className="bg-primary-container text-on-primary-container rounded-xl p-stack-lg flex flex-col justify-between shadow-level-3">
          <div>
            <h3 className="font-manrope text-headline-md text-on-primary mb-stack-sm">Book Service</h3>
            <p className="font-hanken text-body-sm mb-stack-md text-primary-fixed-dim">
              {worker.is_available ? 'Currently accepting bookings' : 'Currently unavailable'}
            </p>
            <div className="flex justify-between items-center py-2 border-b border-on-primary-container/20">
              <span className="font-hanken text-body-sm text-primary-fixed-dim">Hourly Rate</span>
              <span className="font-manrope text-headline-sm text-on-primary">₹{worker.hourly_rate || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-on-primary-container/20">
              <span className="font-hanken text-body-sm text-primary-fixed-dim">Experience</span>
              <span className="font-manrope text-headline-sm text-on-primary">{worker.experience_years || 0} yrs</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-hanken text-body-sm text-primary-fixed-dim">Completed Jobs</span>
              <span className="font-manrope text-headline-sm text-on-primary">{worker.rating_count || 0}+</span>
            </div>
          </div>
          <Link
            to={`/customer/book/${worker.id}`}
            className="mt-stack-md w-full bg-secondary text-on-secondary font-manrope text-headline-sm py-3 rounded-lg hover:bg-secondary-container transition-colors shadow-md flex items-center justify-center gap-2"
          >
            Book Now
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </section>

      {/* Detailed Content */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        {/* Left: About & Services */}
        <div className="lg:col-span-2 flex flex-col gap-stack-lg">
          {/* About */}
          {worker.bio && (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-stack-lg shadow-level-1">
              <h2 className="font-manrope text-headline-lg-mobile text-primary mb-stack-md">About</h2>
              <p className="font-hanken text-body-lg text-on-surface-variant leading-relaxed">{worker.bio}</p>
            </div>
          )}

          {/* Services */}
          {worker.services?.length > 0 && (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-stack-lg shadow-level-1">
              <h2 className="font-manrope text-headline-lg-mobile text-primary mb-stack-md">Services Offered</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
                {worker.services.map((svc, i) => (
                  <div key={i} className="p-stack-md border border-outline-variant rounded-lg hover:border-secondary transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="material-symbols-outlined text-secondary text-[28px]">handyman</span>
                      <span className="font-manrope text-headline-sm text-primary">
                        ₹{worker.hourly_rate || 0}<span className="font-hanken text-body-sm text-on-surface-variant">/hr</span>
                      </span>
                    </div>
                    <h4 className="font-manrope text-headline-sm text-primary group-hover:text-secondary transition-colors">{svc.name}</h4>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Schedule & Reviews */}
        <div className="flex flex-col gap-stack-lg">
          {/* Availability */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-stack-lg shadow-level-1">
            <h2 className="font-manrope text-headline-md text-primary mb-stack-md flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">calendar_month</span>
              Availability
            </h2>
            <div className="flex flex-col gap-1">
              {DAYS.map((day, idx) => {
                // Map: Mon=1, Tue=2, ..., Sun=0
                const dayIdx = idx === 6 ? 0 : idx + 1;
                const slots = availByDay[dayIdx];
                return (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-outline-variant/50 last:border-0">
                    <span className="font-hanken text-body-md font-medium text-primary">{day}</span>
                    <span className="font-hanken text-body-md text-on-surface-variant">
                      {slots ? `${slots[0].start_time} - ${slots[0].end_time}` : 'Closed'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reviews */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-stack-lg shadow-level-1 flex-grow">
            <div className="flex justify-between items-center mb-stack-md">
              <h2 className="font-manrope text-headline-md text-primary">Reviews</h2>
              {reviews.length > 3 && (
                <span className="font-hanken text-label-md text-secondary">View All</span>
              )}
            </div>
            {reviews.length > 0 ? (
              <div className="flex flex-col gap-stack-md">
                {reviews.slice(0, 4).map((review, i) => (
                  <div key={i} className="p-stack-sm rounded-lg bg-surface-container-low border border-outline-variant/30">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex text-secondary">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span
                            key={s}
                            className={`material-symbols-outlined text-sm ${s <= review.rating ? 'text-[#F59E0B]' : 'text-outline-variant'}`}
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="font-hanken text-body-sm text-on-surface italic">"{review.comment}"</p>
                    )}
                    <p className="font-hanken text-label-sm text-primary mt-2">- {review.customer_name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-hanken text-body-sm text-on-surface-variant text-center py-4">No reviews yet</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
