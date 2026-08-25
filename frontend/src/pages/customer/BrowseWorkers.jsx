import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { workersService } from '../../services/workersService';
import { servicesService } from '../../services/servicesService';

export default function BrowseWorkers() {
  const [searchParams] = useSearchParams();
  const [workers, setWorkers] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(searchParams.get('service') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedService]);

  async function loadData() {
    setLoading(true);
    try {
      const [workersRes, servicesRes] = await Promise.all([
        workersService.list(selectedService || undefined),
        servicesService.list(),
      ]);
      setWorkers(workersRes.data.workers || []);
      setServices(servicesRes.data.services || []);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Client-side filtering
  const filtered = workers.filter((w) => {
    if (verifiedOnly && !w.is_verified) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return w.full_name?.toLowerCase().includes(q) || w.city?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24 md:pb-stack-xl">
      {/* Search & Filter Bar */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-level-2 p-stack-md flex flex-col md:flex-row gap-stack-md items-center justify-between sticky top-20 z-30">
        <div className="w-full md:w-1/3 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-outline-variant rounded-lg py-2 pl-10 pr-4 font-hanken text-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50"
            placeholder="Search professionals..."
          />
        </div>
        <div className="flex flex-wrap items-center gap-stack-sm w-full md:w-auto">
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="bg-surface border border-outline-variant rounded-lg py-2 px-3 font-hanken text-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all cursor-pointer"
          >
            <option value="">All Services</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 cursor-pointer bg-surface border border-outline-variant rounded-lg py-2 px-3 hover:bg-surface-container transition-colors">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="rounded border-outline-variant text-secondary focus:ring-secondary/20"
            />
            <span className="font-hanken text-body-sm text-on-surface">Verified Only</span>
          </label>
        </div>
      </section>

      {/* Results Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-on-surface">Find Professionals</h1>
          <p className="font-hanken text-body-md text-on-surface-variant mt-1">
            {loading ? 'Loading...' : `Showing ${filtered.length} professional${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-on-surface-variant">
          <span className="font-hanken text-body-sm">Sort by:</span>
          <span className="font-hanken text-body-sm font-semibold text-primary cursor-pointer">Recommended</span>
        </div>
      </div>

      {/* Professional Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 bg-surface-container-high rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {filtered.map((worker) => (
            <article
              key={worker.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-level-1 p-stack-md flex flex-col gap-stack-md hover:shadow-level-2 transition-shadow duration-300 group"
            >
              <div className="flex gap-stack-md items-start">
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-outline-variant bg-surface-container-high flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[28px]">person</span>
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-start">
                    <h2 className="font-manrope text-headline-sm text-on-surface group-hover:text-secondary transition-colors truncate">
                      {worker.full_name}
                    </h2>
                    {worker.is_verified && (
                      <span
                        className="material-symbols-outlined text-secondary text-[20px] flex-shrink-0"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                        title="Verified Professional"
                      >
                        verified
                      </span>
                    )}
                  </div>
                  <p className="font-hanken text-body-sm text-on-surface-variant">{worker.city || 'Service Professional'}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[#F59E0B] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="font-hanken text-label-sm font-semibold text-on-surface">{worker.rating_avg || 0}</span>
                    <span className="font-hanken text-label-sm text-on-surface-variant">({worker.rating_count || 0} reviews)</span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-stack-xs">
                {worker.experience_years > 0 && (
                  <span className="bg-surface-container-low text-on-surface font-hanken text-label-sm px-3 py-1 rounded-full border border-outline-variant/30">
                    {worker.experience_years} yrs exp
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-auto pt-stack-sm border-t border-outline-variant/50">
                <div className="flex flex-col">
                  <span className="font-hanken text-label-sm text-on-surface-variant">Starting from</span>
                  <span className="font-manrope text-headline-sm text-primary">
                    ₹{worker.hourly_rate || 0}<span className="font-hanken text-body-sm font-normal text-on-surface-variant">/hr</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/customer/workers/${worker.id}`}
                    className="px-4 py-2 bg-transparent border border-outline-variant text-primary font-hanken text-label-md rounded-lg hover:bg-surface-container-highest transition-colors"
                  >
                    Profile
                  </Link>
                  <Link
                    to={`/customer/book/${worker.id}`}
                    className="px-4 py-2 bg-primary-container text-on-primary font-hanken text-label-md rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Book
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-12 text-center shadow-level-1">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">search_off</span>
          <h3 className="font-manrope text-headline-sm text-on-surface mb-2">No professionals found</h3>
          <p className="font-hanken text-body-md text-on-surface-variant">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
}
