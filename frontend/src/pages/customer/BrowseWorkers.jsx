import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { workersService } from '../../services/workersService';
import { servicesService } from '../../services/servicesService';
import DashboardLayout from '../../components/DashboardLayout';

export default function BrowseWorkers() {
  const [searchParams] = useSearchParams();
  const [workers, setWorkers] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(searchParams.get('service') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('recommended');
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

  function clearFilters() {
    setSelectedService('');
    setSearchQuery('');
    setVerifiedOnly(false);
    setMinPrice('');
    setMaxPrice('');
    setMinRating(0);
    setSortBy('recommended');
  }

  // Client-side filtering
  const filtered = workers.filter((w) => {
    if (verifiedOnly && !w.is_verified) return false;
    if (minRating > 0 && (w.rating_avg || 0) < minRating) return false;
    const rate = w.hourly_rate || 0;
    if (minPrice !== '' && rate < Number(minPrice)) return false;
    if (maxPrice !== '' && rate > Number(maxPrice)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        w.full_name?.toLowerCase().includes(q) ||
        w.city?.toLowerCase().includes(q) ||
        w.bio?.toLowerCase().includes(q) ||
        w.service_names?.some((s) => s.toLowerCase().includes(q)) ||
        w.services?.some((s) => s.name?.toLowerCase().includes(q)) ||
        w.skills?.some((sk) => sk.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'rating': return (b.rating_avg || 0) - (a.rating_avg || 0);
      case 'price_asc': return (a.hourly_rate || 0) - (b.hourly_rate || 0);
      case 'price_desc': return (b.hourly_rate || 0) - (a.hourly_rate || 0);
      default: return 0;
    }
  });

  return (
    <DashboardLayout>
      {/* ============================================================= */}
      {/* MOBILE / TABLET VIEW (unchanged, below lg)                     */}
      {/* ============================================================= */}
      <div className="lg:hidden pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24">
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

      {/* ============================================================= */}
      {/* DESKTOP VIEW (lg and up) — matches uploaded design             */}
      {/* ============================================================= */}
      <div className="hidden lg:flex gap-gutter items-start">
        {/* Left Filter Panel */}
        <aside className="w-80 shrink-0 bg-surface-container-lowest border border-outline-slate rounded-xl p-gutter sticky top-[72px]">
          <div className="flex items-center justify-between mb-stack-md">
            <h2 className="font-manrope text-headline-sm font-bold text-primary">Filters</h2>
            <button onClick={clearFilters} className="text-on-surface-variant hover:text-secondary font-hanken text-label-sm transition-colors">
              Clear All
            </button>
          </div>

          {/* Service Category */}
          <div className="mb-stack-lg border-b border-outline-slate pb-stack-md">
            <h3 className="font-hanken text-label-md font-semibold text-on-primary-fixed-variant mb-3 uppercase tracking-wide">Service Category</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="service-cat"
                  checked={selectedService === ''}
                  onChange={() => setSelectedService('')}
                  className="border-outline-slate text-secondary focus:ring-secondary/20 w-4 h-4 cursor-pointer"
                />
                <span className="font-hanken text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors">All Services</span>
              </label>
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="service-cat"
                    checked={selectedService === String(s.id)}
                    onChange={() => setSelectedService(String(s.id))}
                    className="border-outline-slate text-secondary focus:ring-secondary/20 w-4 h-4 cursor-pointer"
                  />
                  <span className="font-hanken text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors">{s.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Hourly Rate */}
          <div className="mb-stack-lg border-b border-outline-slate pb-stack-md">
            <h3 className="font-hanken text-label-md font-semibold text-on-primary-fixed-variant mb-3 uppercase tracking-wide">Hourly Rate</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[14px]">₹</span>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Min"
                  className="w-full h-10 pl-7 pr-3 rounded-lg bg-surface border border-outline-slate focus:border-secondary focus:ring-1 focus:ring-secondary font-hanken text-body-sm text-on-surface outline-none"
                />
              </div>
              <span className="text-on-surface-variant">-</span>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[14px]">₹</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Max"
                  className="w-full h-10 pl-7 pr-3 rounded-lg bg-surface border border-outline-slate focus:border-secondary focus:ring-1 focus:ring-secondary font-hanken text-body-sm text-on-surface outline-none"
                />
              </div>
            </div>
          </div>

          {/* Minimum Rating */}
          <div className="mb-stack-lg border-b border-outline-slate pb-stack-md">
            <h3 className="font-hanken text-label-md font-semibold text-on-primary-fixed-variant mb-3 uppercase tracking-wide">Minimum Rating</h3>
            <div className="flex gap-2">
              {[4.5, 4.0].map((r) => {
                const activeR = minRating === r;
                return (
                  <button
                    key={r}
                    onClick={() => setMinRating(activeR ? 0 : r)}
                    className={`flex-1 h-10 rounded-lg border font-hanken text-label-md flex items-center justify-center gap-1 transition-colors ${
                      activeR
                        ? 'border-secondary bg-secondary/5 text-secondary'
                        : 'border-outline-slate bg-surface-container-lowest text-on-surface-variant hover:border-outline'
                    }`}
                  >
                    {r}+ <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: activeR ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Verification */}
          <div className="mb-stack-lg">
            <h3 className="font-hanken text-label-md font-semibold text-on-primary-fixed-variant mb-3 uppercase tracking-wide">Verification Level</h3>
            <label className="flex items-start gap-3 p-3 rounded-lg border border-outline-slate hover:border-secondary/50 hover:bg-surface-container/50 transition-colors cursor-pointer group">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="mt-1 rounded border-outline-slate text-secondary focus:ring-secondary/20 w-4 h-4 cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-1 font-hanken text-label-md text-on-surface group-hover:text-primary transition-colors">
                  Connect360 Verified
                  <span className="material-symbols-outlined text-secondary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                </div>
                <p className="font-hanken text-body-sm text-on-surface-variant mt-1">Professionals who have passed background and credential checks.</p>
              </div>
            </label>
          </div>
        </aside>

        {/* Right Results */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-end mb-stack-md">
            <div>
              <h2 className="font-manrope text-headline-lg font-bold text-primary">Find Professionals</h2>
              <p className="font-hanken text-body-md text-on-surface-variant mt-1">
                {loading ? 'Loading...' : `Showing ${sorted.length} professional${sorted.length !== 1 ? 's' : ''}`}
                {selectedService && services.find((s) => String(s.id) === String(selectedService)) &&
                  ` for "${services.find((s) => String(s.id) === String(selectedService)).name}"`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-hanken text-label-sm text-on-surface-variant uppercase">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 rounded-lg border border-outline-slate bg-surface-container-lowest text-on-surface font-hanken text-body-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary pl-3 pr-8 cursor-pointer"
              >
                <option value="recommended">Most Relevant</option>
                <option value="rating">Highest Rated</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-stack-md">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-48 bg-surface-container-high rounded-xl animate-pulse" />)}
            </div>
          ) : sorted.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-stack-md">
              {sorted.map((worker) => (
                <div
                  key={worker.id}
                  className="bg-surface-container-lowest rounded-xl border border-outline-slate p-stack-md flex flex-col gap-4 hover:shadow-level-2 transition-shadow group"
                >
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl shrink-0 overflow-hidden border border-outline-slate bg-surface-container-high flex items-center justify-center relative">
                      <span className="material-symbols-outlined text-primary text-[28px]">person</span>
                      {worker.is_verified && (
                        <div className="absolute bottom-0 right-0 bg-surface-container-lowest rounded-tl-lg p-0.5 shadow-sm border-t border-l border-outline-slate" title="Verified Professional">
                          <span className="material-symbols-outlined text-secondary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-manrope text-headline-sm font-bold text-primary truncate group-hover:text-secondary transition-colors">{worker.full_name}</h3>
                        <div className="flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded-md shrink-0">
                          <span className="material-symbols-outlined text-secondary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="font-hanken text-label-sm text-primary">{worker.rating_avg || 0}</span>
                        </div>
                      </div>
                      <p className="font-hanken text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5 truncate">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {worker.city || 'Service Professional'}
                      </p>
                      <p className="font-hanken text-label-md text-primary mt-1">₹{worker.hourly_rate || 0}/hr</p>
                    </div>
                  </div>

                  {worker.experience_years > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 rounded-md bg-surface border border-outline-slate font-hanken text-label-sm text-on-surface-variant">
                        {worker.experience_years} yrs exp
                      </span>
                      <span className="px-2 py-1 rounded-md bg-surface border border-outline-slate font-hanken text-label-sm text-on-surface-variant">
                        {worker.rating_count || 0} reviews
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 mt-auto pt-4 border-t border-surface">
                    <Link
                      to={`/customer/workers/${worker.id}`}
                      className="flex-1 h-9 rounded-lg bg-surface-container-lowest border border-outline-slate text-primary-container font-hanken text-label-md hover:bg-surface-container transition-colors flex items-center justify-center"
                    >
                      Profile
                    </Link>
                    <Link
                      to={`/customer/book/${worker.id}`}
                      className="flex-1 h-9 rounded-lg bg-primary-container text-on-primary font-hanken text-label-md hover:bg-primary transition-colors flex items-center justify-center"
                    >
                      Book
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-12 text-center">
              <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">search_off</span>
              <h3 className="font-manrope text-headline-sm text-on-surface mb-2">No professionals found</h3>
              <p className="font-hanken text-body-md text-on-surface-variant">Try adjusting your filters.</p>
              <button onClick={clearFilters} className="mt-4 px-4 py-2 bg-primary-container text-on-primary rounded-lg font-hanken text-label-md hover:opacity-90 transition-opacity">
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
