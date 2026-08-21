import { useState, useEffect } from 'react';
import { bookingsService } from '../../services/bookingsService';
import StatusBadge from '../../components/StatusBadge';
import { Calendar, Clock, MapPin, CheckCircle, XCircle, Play } from 'lucide-react';

export default function WorkerBookings() {
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadBookings();
  }, [statusFilter]);

  async function loadBookings() {
    setLoading(true);
    try {
      const res = await bookingsService.listWorkerBookings(statusFilter || undefined);
      setBookings(res.data.bookings || []);
    } catch (err) {
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRespond(bookingId, action) {
    const confirmMsg = action === 'accept'
      ? 'Accept this booking?'
      : 'Reject this booking?';
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(bookingId);
    try {
      await bookingsService.respond(bookingId, action);
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${action} booking`);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStatusUpdate(bookingId, newStatus) {
    setActionLoading(bookingId);
    try {
      await bookingsService.updateStatus(bookingId, newStatus);
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-1">Manage incoming and active bookings</p>
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
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="card animate-pulse h-28"></div>)}
        </div>
      ) : bookings.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No bookings found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className={`card ${booking.status === 'pending' ? 'border-l-4 border-yellow-400' : ''}`}>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{booking.service_name}</h3>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="text-sm text-gray-700 mt-1">Customer: {booking.customer_name}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} /> {booking.scheduled_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> {booking.scheduled_time}
                    </span>
                    {booking.total_amount && (
                      <span className="font-medium text-green-700">₹{booking.total_amount}</span>
                    )}
                  </div>

                  {booking.address && (
                    <p className="text-sm text-gray-500 mt-1 flex items-start gap-1">
                      <MapPin size={14} className="mt-0.5 flex-shrink-0" /> {booking.address}
                    </p>
                  )}
                  {booking.notes && (
                    <p className="text-sm text-gray-500 mt-1 italic">Note: {booking.notes}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {booking.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleRespond(booking.id, 'accept')}
                        disabled={actionLoading === booking.id}
                        className="btn-success text-sm flex items-center gap-1"
                      >
                        <CheckCircle size={16} /> Accept
                      </button>
                      <button
                        onClick={() => handleRespond(booking.id, 'reject')}
                        disabled={actionLoading === booking.id}
                        className="btn-danger text-sm flex items-center gap-1"
                      >
                        <XCircle size={16} /> Reject
                      </button>
                    </>
                  )}
                  {booking.status === 'accepted' && (
                    <button
                      onClick={() => handleStatusUpdate(booking.id, 'in_progress')}
                      disabled={actionLoading === booking.id}
                      className="btn-primary text-sm flex items-center gap-1"
                    >
                      <Play size={16} /> Start Work
                    </button>
                  )}
                  {booking.status === 'in_progress' && (
                    <button
                      onClick={() => handleStatusUpdate(booking.id, 'completed')}
                      disabled={actionLoading === booking.id}
                      className="btn-success text-sm flex items-center gap-1"
                    >
                      <CheckCircle size={16} /> Mark Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
