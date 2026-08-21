import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { workersService } from '../../services/workersService';
import { Star, MapPin, Clock, Award, Calendar, CheckCircle } from 'lucide-react';
import { DAYS_OF_WEEK } from '../../config/constants';

export default function WorkerDetail() {
  const { id } = useParams();
  const [worker, setWorker] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorker();
  }, [id]);

  async function loadWorker() {
    try {
      const [workerRes, reviewsRes] = await Promise.all([
        workersService.getById(id),
        workersService.getReviews(id),
      ]);
      setWorker(workerRes.data.worker);
      setReviews(reviewsRes.data.reviews || []);
    } catch (err) {
      console.error('Error loading worker:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      <div className="h-48 bg-gray-200 rounded-xl"></div>
    </div>;
  }

  if (!worker) {
    return <div className="card text-center py-12"><p className="text-gray-600">Worker not found.</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to="/customer/workers" className="text-sm text-primary-600 hover:text-primary-700">
        ← Back to workers
      </Link>

      {/* Profile Card */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{worker.full_name}</h1>
              {worker.is_verified && (
                <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  <CheckCircle size={12} /> Verified
                </span>
              )}
            </div>
            {worker.city && (
              <p className="text-gray-600 flex items-center gap-1 mt-1">
                <MapPin size={16} /> {worker.city}
              </p>
            )}
            {worker.bio && <p className="text-gray-700 mt-3 max-w-2xl">{worker.bio}</p>}
          </div>

          <Link
            to={`/customer/book/${worker.id}`}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <Calendar size={18} /> Book Now
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Star size={18} className="text-yellow-500 fill-yellow-500" />
              <span className="text-xl font-bold">{worker.rating_avg || '0.0'}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{worker.rating_count || 0} reviews</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{worker.experience_years || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Years experience</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-primary-600">₹{worker.hourly_rate || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Per hour</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-green-600">
              {worker.is_available ? 'Available' : 'Busy'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Status</p>
          </div>
        </div>
      </div>

      {/* Skills & Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {worker.skills && worker.skills.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {worker.skills.map((skill, i) => (
                <span key={i} className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {worker.services && worker.services.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3">Services Offered</h2>
            <div className="flex flex-wrap gap-2">
              {worker.services.map((service) => (
                <span key={service.id} className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
                  {service.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Availability */}
      {worker.availability && worker.availability.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Weekly Availability</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {worker.availability.map((slot, i) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-lg">
                <Calendar size={14} className="text-gray-400" />
                <span className="font-medium">{DAYS_OF_WEEK[slot.day_of_week]}</span>
                <span className="text-gray-600">{slot.start_time} - {slot.end_time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Reviews ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-500 text-sm">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className={star <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{review.customer_name}</span>
                  <span className="text-xs text-gray-400">{review.created_at?.split('T')[0]}</span>
                </div>
                {review.comment && (
                  <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
