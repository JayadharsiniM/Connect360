import { useState, useEffect } from 'react';
import { bookingsService } from '../../services/bookingsService';
import StatusBadge from '../../components/StatusBadge';
import { Calendar, Clock, MapPin, XCircle, Star } from 'lucide-react';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);

  useEffect(() => {
    loadBookings();
  }, [statusFilter]);

  async function loadBookings() {
    setLoading(true);
    try {
      const res = await bookingsService.listMine(statusFilter || undefined);
      setBookings(res.data.bookings || []);
    } catch (err) {
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(bookingId) {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancellingId(bookingId);
    try {
      await bookingsService.cancel(bookingId, 'Cancelled by customer');
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  }

  async function handleReview(bookingId, rating, comment) {
    try {
      await bookingsService.createReview({ booking_id: bookingId, rating, comment });
      setReviewModal(null);
      loadBookings();
      alert('Review submitted!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit review');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-1">Track your service bookings</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="card animate-pulse h-24"></div>)}
        </div>
      ) : bookings.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600">No bookings found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="card">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{booking.service_name}</h3>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Worker: {booking.worker_name}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} /> {booking.scheduled_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> {booking.scheduled_time}
                    </span>
                    {booking.total_amount && (
                      <span className="font-medium text-gray-700">₹{booking.total_amount}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Cancel button for pending/accepted */}
                  {['pending', 'accepted'].includes(booking.status) && (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      disabled={cancellingId === booking.id}
                      className="btn-danger text-sm flex items-center gap-1"
                    >
                      <XCircle size={16} />
                      {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}

                  {/* Review button for completed */}
                  {booking.status === 'completed' && (
                    <button
                      onClick={() => setReviewModal(booking)}
                      className="btn-secondary text-sm flex items-center gap-1"
                    >
                      <Star size={16} /> Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <ReviewModal
          booking={reviewModal}
          onSubmit={handleReview}
          onClose={() => setReviewModal(null)}
        />
      )}
    </div>
  );
}

function ReviewModal({ booking, onSubmit, onClose }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(booking.id, rating, comment);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Leave a Review</h2>
        <p className="text-sm text-gray-600 mb-4">
          Rate your experience with {booking.worker_name}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    size={28}
                    className={star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="input-field"
              rows={3}
              placeholder="Tell us about your experience"
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
