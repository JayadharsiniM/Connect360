import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { workersService } from '../../services/workersService';
import { bookingsService } from '../../services/bookingsService';
import { servicesService } from '../../services/servicesService';

export default function BookingForm() {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    service_id: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_hours: 1,
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
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await bookingsService.create({ ...formData, worker_id: workerId });
      navigate('/customer/bookings', { state: { success: 'Booking created successfully!' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  }

  const totalAmount = (worker?.hourly_rate || 0) * formData.duration_hours;

  if (loading) {
    return (
      <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
        <div className="animate-pulse h-96 bg-surface-container-high rounded-xl" />
      </div>
    );
  }

  return (
    <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24 md:pb-stack-xl">
      <Link to={`/customer/workers/${workerId}`} className="flex items-center gap-1 font-hanken text-body-sm text-on-surface-variant hover:text-secondary">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back to profile
      </Link>

      <h1 className="font-manrope text-headline-lg-mobile text-primary">Book Service</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        {/* Form */}
        <div className="md:col-span-2">
          {error && (
            <div className="bg-error-container border border-error/20 rounded-lg p-4 flex items-start gap-3 mb-stack-md">
              <span className="material-symbols-outlined text-error text-[20px]">error</span>
              <p className="font-hanken text-body-sm text-on-error-container">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1 flex flex-col gap-stack-md">
            <div className="flex flex-col gap-stack-xs">
              <label className="font-hanken text-label-md text-on-surface">Service</label>
              <select name="service_id" value={formData.service_id} onChange={handleChange} className="input-field" required>
                <option value="">Select a service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
              <div className="flex flex-col gap-stack-xs">
                <label className="font-hanken text-label-md text-on-surface">Date</label>
                <input type="date" name="scheduled_date" value={formData.scheduled_date} onChange={handleChange} className="input-field" required />
              </div>
              <div className="flex flex-col gap-stack-xs">
                <label className="font-hanken text-label-md text-on-surface">Time</label>
                <input type="time" name="scheduled_time" value={formData.scheduled_time} onChange={handleChange} className="input-field" required />
              </div>
            </div>

            <div className="flex flex-col gap-stack-xs">
              <label className="font-hanken text-label-md text-on-surface">Duration (hours)</label>
              <input type="number" name="duration_hours" value={formData.duration_hours} onChange={handleChange} min="1" max="8" className="input-field" required />
            </div>

            <div className="flex flex-col gap-stack-xs">
              <label className="font-hanken text-label-md text-on-surface">Address</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Enter service address" className="input-field" required />
            </div>

            <div className="flex flex-col gap-stack-xs">
              <label className="font-hanken text-label-md text-on-surface">Notes (optional)</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Any specific instructions..." className="input-field min-h-[80px] resize-none" rows={3} />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full mt-stack-sm">
              {submitting ? 'Booking...' : `Confirm Booking · ₹${totalAmount}`}
            </button>
          </form>
        </div>

        {/* Summary Sidebar */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-level-1 h-fit sticky top-24">
          <h3 className="font-manrope text-headline-sm text-on-surface mb-4">Booking Summary</h3>
          <div className="flex items-center gap-3 pb-4 border-b border-outline-variant">
            <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">person</span>
            </div>
            <div>
              <p className="font-hanken text-body-md text-on-surface font-medium">{worker?.full_name}</p>
              <p className="font-hanken text-body-sm text-on-surface-variant">{worker?.city}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex justify-between">
              <span className="font-hanken text-body-sm text-on-surface-variant">Rate</span>
              <span className="font-hanken text-body-sm text-on-surface">₹{worker?.hourly_rate || 0}/hr</span>
            </div>
            <div className="flex justify-between">
              <span className="font-hanken text-body-sm text-on-surface-variant">Duration</span>
              <span className="font-hanken text-body-sm text-on-surface">{formData.duration_hours} hr(s)</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-outline-variant">
              <span className="font-hanken text-body-md text-on-surface font-semibold">Total</span>
              <span className="font-manrope text-headline-sm text-primary">₹{totalAmount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
