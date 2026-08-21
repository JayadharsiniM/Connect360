import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { workersService } from '../../services/workersService';
import { servicesService } from '../../services/servicesService';
import { Star, MapPin, Clock, Award, Filter } from 'lucide-react';

export default function BrowseWorkers() {
  const [searchParams] = useSearchParams();
  const [workers, setWorkers] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(searchParams.get('service') || '');
  const [showRecommended, setShowRecommended] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    loadWorkers();
  }, [selectedService, showRecommended]);

  async function loadServices() {
    try {
      const res = await servicesService.list();
      setServices(res.data.services || []);
    } catch (err) {
      console.error('Error loading services:', err);
    }
  }

  async function loadWorkers() {
    setLoading(true);
    try {
      const res = showRecommended
        ? await workersService.getRecommended(selectedService || undefined, 10)
        : await workersService.list(selectedService || undefined);
      setWorkers(res.data.workers || []);
    } catch (err) {
      console.error('Error loading workers:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Browse Workers</h1>
        <p className="text-gray-600 mt-1">Find the right professional for your needs</p>
      </div>

      {/* Filters */}
      <div className="card flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter:</span>
        </div>
        <select
          value={selectedService}
          onChange={(e) => setSelectedService(e.target.value)}
          className="input-field w-auto"
        >
          <option value="">All Services</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showRecommended}
            onChange={(e) => setShowRecommended(e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Show recommended first</span>
        </label>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : workers.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600">No workers found for the selected criteria.</p>
          <button onClick={() => setSelectedService('')} className="btn-secondary mt-4">
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.map((worker, idx) => (
            <Link
              key={worker.id}
              to={`/customer/workers/${worker.id}`}
              className="card hover:shadow-md transition-all group"
            >
              {/* Rank badge for recommended */}
              {showRecommended && worker.rank && (
                <div className="inline-flex items-center gap-1 mb-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                  <Award size={12} /> #{worker.rank} Recommended
                </div>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {worker.full_name}
                  </h3>
                  {worker.city && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={14} /> {worker.city}
                    </p>
                  )}
                </div>
                {worker.is_verified && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Verified</span>
                )}
              </div>

              {worker.bio && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{worker.bio}</p>
              )}

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-medium">{worker.rating_avg || '0.0'}</span>
                  <span className="text-xs text-gray-500">({worker.rating_count || 0})</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock size={14} />
                  {worker.experience_years || 0} yrs
                </div>
                {worker.hourly_rate && (
                  <span className="text-sm font-medium text-primary-600 ml-auto">
                    ₹{worker.hourly_rate}/hr
                  </span>
                )}
              </div>

              {worker.recommendation_score && (
                <div className="mt-2">
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-primary-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(worker.recommendation_score, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Match score: {Math.round(worker.recommendation_score)}/100
                  </p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
