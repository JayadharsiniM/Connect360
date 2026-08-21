import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { workersService } from '../../services/workersService';
import { servicesService } from '../../services/servicesService';
import { bookingsService } from '../../services/bookingsService';
import { Calendar, Clock, MapPin, CreditCard } from 'lucide-react';

export default function BookingForm() {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    service_id: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_hours: '1',
    address: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [workerId]);

  async function loadData() {
    try {
      const [workerRes, servicesRes] = await Promise.all([
        workersService.getById(workerId),
        servicesService.list(),
      ]);
      setWorker(workerRes.data.worker);
      setServices(servicesRes.data.services || []);

      // Pre-select first service the worker offers
      const workerServices = workerRes.data.worker?.services || [];
      if (workerServices.length > 0) {
        setFormData((prev) => ({ ...prev, service_id: workerServices[0].id }));
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const totalAmount = worker?.hourly_rate
    ? (parseFloat(worker.hourly_rate) * parseFloat(formData.duration_hours || 1)).toFixed(2)
    : '0.00';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await bookingsService.create({
        worker_id: workerId,
        service_id: formData.service_id,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        duration_hours: parseFloat(formData.duration_hours),
        address: formData.address,
        notes: formData.notes,
      });
      setSuccess(true);
      setTimeout(() => navigate('/customer/bookings'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div></div>;
  }

  if (!worker) {
    return <div className="card text-center py-12"><p className="text-gray-600">Worker not found.</p></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to={`/customer/workers/${workerId}`} className="text-sm text-primary-600 hover:text-primary-700">
        ← Back to worker profile
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Book {worker.full_name}</h1>
        <p className="text-gray-600 mt-1">Fill in the details to schedule your service</p>
      </div>

      {/* Success */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          Booking created successfully! Redirecting to your bookings...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Service */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
          <select
            name="service_id"
            value={formData.service_id}
            onChange={handleChange}
            className="input-field"
            required
          >
            <option value="">Select a service</option>
            {(worker.services || services).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar size={14} className="inline mr-1" /> Date
            </label>
            <input
              type="date"
              name="scheduled_date"
              value={formData.scheduled_date}
              onChange={handleChange}
              className="input-field"
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock size={14} className="inline mr-1" /> Time
            </label>
            <input
              type="time"
              name="scheduled_time"
              value={formData.scheduled_time}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
          <select
            name="duration_hours"
            value={formData.duration_hours}
            onChange={handleChange}
            className="input-field"
          >
            <option value="0.5">30 minutes</option>
            <option value="1">1 hour</option>
            <option value="1.5">1.5 hours</option>
            <option value="2">2 hours</option>
            <option value="3">3 hours</option>
            <option value="4">4 hours</option>
            <option value="5">5 hours</option>
            <option value="8">Full day (8 hours)</option>
          </select>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <MapPin size={14} className="inline mr-1" /> Service Address
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="input-field"
            rows={2}
            placeholder="Enter the address where service is needed"
            required
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className="input-field"
            rows={2}
            placeholder="Any specific instructions or requirements"
          />
        </div>

        {/* Price Summary */}
        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Rate: ₹{worker.hourly_rate}/hr × {formData.duration_hours} hrs</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Estimated Total</p>
              <p className="text-2xl font-bold text-primary-600">₹{totalAmount}</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || success}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {submitting ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <CreditCard size={18} /> Confirm Booking — ₹{totalAmount}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
