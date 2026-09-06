import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { workersService } from '../../services/workersService';
import { bookingsService } from '../../services/bookingsService';
import { servicesService } from '../../services/servicesService';
import DashboardLayout from '../../components/DashboardLayout';

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
  const selectedService = services.find((s) => String(s.id) === String(formData.service_id));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="lg:hidden pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
          <div className="animate-pulse h-96 bg-surface-container-high rounded-xl" />
        </div>
        <div className="hidden lg:grid grid-cols-12 gap-gutter animate-pulse">
          <div className="col-span-8 h-96 bg-surface-container-high rounded-xl" />
          <div className="col-span-4 h-72 bg-surface-container-high rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* ============================================================= */}
      {/* MOBILE / TABLET VIEW (unchanged, below lg)                     */}
      {/* ============================================================= */}
      <div className="lg:hidden pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24">
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

      {/* ============================================================= */}
      {/* DESKTOP VIEW (lg and up) — booking design language             */}
      {/* ============================================================= */}
      <div className="hidden lg:block">
        {/* Top row: cancel/back */}
        <div className="flex justify-between items-center mb-stack-lg">
          <Link to={`/customer/workers/${workerId}`} className="flex items-center gap-1 font-hanken text-body-sm text-on-surface-variant hover:text-secondary">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to profile
          </Link>
          <Link to="/customer/workers" className="font-hanken text-label-md text-on-surface-variant hover:text-primary transition-colors">
            Cancel Booking
          </Link>
        </div>

        <div className="grid grid-cols-12 gap-gutter items-start">
          {/* Left: Booking form */}
          <div className="col-span-8 flex flex-col gap-stack-lg">
            {/* Header + progress */}
            <div className="flex flex-col gap-stack-sm">
              <p className="font-hanken text-label-sm text-on-surface-variant uppercase tracking-wider">Book your consultation</p>
              <h1 className="font-manrope text-headline-lg text-primary">Booking Details</h1>
              <p className="font-hanken text-body-md text-on-surface-variant max-w-2xl mt-1">
                Select your service, choose a date and time, and add any details for the professional.
              </p>
              <div className="w-full h-1 bg-surface-container-high rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-secondary transition-all duration-500 ease-in-out" style={{ width: formData.service_id && formData.scheduled_date ? '100%' : formData.service_id ? '60%' : '20%' }} />
              </div>
            </div>

            {error && (
              <div className="bg-error-container border border-error/20 rounded-lg p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-error text-[20px]">error</span>
                <p className="font-hanken text-body-sm text-on-error-container">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-stack-lg">
              {/* Service selection cards */}
              <section className="bg-surface-container-lowest border border-outline-slate rounded-xl p-stack-lg">
                <h3 className="font-manrope text-headline-sm text-primary mb-stack-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant">cases</span>
                  Select Service
                </h3>
                {services.length > 0 ? (
                  <div className="grid grid-cols-2 gap-stack-md">
                    {services.map((s) => {
                      const active = String(formData.service_id) === String(s.id);
                      return (
                        <label key={s.id} className="cursor-pointer group relative h-full">
                          <input
                            type="radio"
                            name="service_id"
                            value={s.id}
                            checked={active}
                            onChange={handleChange}
                            className="sr-only"
                            required
                          />
                          <div className={`h-full rounded-xl border p-stack-md flex flex-col justify-between transition-all duration-200 ${
                            active
                              ? 'border-secondary bg-secondary-fixed shadow-level-1'
                              : 'bg-surface-container-lowest border-outline-slate hover:border-secondary-fixed-dim hover:shadow-level-1'
                          }`}>
                            <div className="flex justify-between items-start mb-6">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${active ? 'bg-secondary text-on-secondary' : 'bg-primary-container text-on-primary'}`}>
                                <span className="material-symbols-outlined">handyman</span>
                              </div>
                              <div className={`w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-on-secondary transition-all ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-manrope text-headline-sm text-primary mb-2 group-hover:text-secondary transition-colors">{s.name}</h4>
                              {s.description && (
                                <p className="font-hanken text-body-sm text-on-surface-variant mb-4 line-clamp-3">{s.description}</p>
                              )}
                            </div>
                            <div className="mt-auto pt-4 border-t border-outline-variant flex items-baseline gap-1">
                              <span className="font-manrope text-headline-md text-primary">₹{worker?.hourly_rate || 0}</span>
                              <span className="font-hanken text-body-sm text-on-surface-variant">/ hr</span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="font-hanken text-body-sm text-on-surface-variant">No services available.</p>
                )}
              </section>

              {/* Date, time, duration */}
              <section className="bg-surface-container-lowest border border-outline-slate rounded-xl p-stack-lg">
                <h3 className="font-manrope text-headline-sm text-primary mb-stack-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant">calendar_month</span>
                  Date &amp; Time
                </h3>
                <div className="grid grid-cols-3 gap-stack-md">
                  <div className="flex flex-col gap-stack-xs">
                    <label className="font-hanken text-label-md text-on-surface-variant">Date</label>
                    <input type="date" name="scheduled_date" value={formData.scheduled_date} onChange={handleChange} className="input-field" required />
                  </div>
                  <div className="flex flex-col gap-stack-xs">
                    <label className="font-hanken text-label-md text-on-surface-variant">Time</label>
                    <input type="time" name="scheduled_time" value={formData.scheduled_time} onChange={handleChange} className="input-field" required />
                  </div>
                  <div className="flex flex-col gap-stack-xs">
                    <label className="font-hanken text-label-md text-on-surface-variant">Duration (hours)</label>
                    <input type="number" name="duration_hours" value={formData.duration_hours} onChange={handleChange} min="1" max="8" className="input-field" required />
                  </div>
                </div>
              </section>

              {/* Location & notes */}
              <section className="bg-surface-container-lowest border border-outline-slate rounded-xl p-stack-lg">
                <h3 className="font-manrope text-headline-sm text-primary mb-stack-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant">location_on</span>
                  Location &amp; Notes
                </h3>
                <div className="flex flex-col gap-stack-md">
                  <div className="flex flex-col gap-stack-xs">
                    <label className="font-hanken text-label-md text-on-surface-variant">Address</label>
                    <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Enter service address" className="input-field" required />
                  </div>
                  <div className="flex flex-col gap-stack-xs">
                    <label className="font-hanken text-label-md text-on-surface-variant">Notes (optional)</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Any specific instructions..." className="input-field min-h-[100px] resize-none" rows={4} />
                  </div>
                </div>
              </section>
            </form>
          </div>

          {/* Right: Order summary sidebar */}
          <div className="col-span-4">
            <div className="bg-surface-container-lowest border border-outline-slate rounded-xl p-stack-lg sticky top-[80px]">
              <h2 className="font-manrope text-headline-sm text-primary mb-stack-md border-b border-outline-slate pb-stack-md">Booking Summary</h2>

              <div className="mb-stack-md">
                <span className="font-hanken text-label-sm text-on-surface-variant uppercase tracking-wider block mb-1">Professional</span>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">person</span>
                  </div>
                  <div>
                    <h4 className="font-hanken text-label-md text-on-surface">{worker?.full_name}</h4>
                    <p className="font-hanken text-body-sm text-on-surface-variant">{worker?.city || 'Professional'}</p>
                  </div>
                </div>
              </div>

              <div className="mb-stack-md">
                <span className="font-hanken text-label-sm text-on-surface-variant uppercase tracking-wider block mb-1">Service</span>
                <p className="font-hanken text-body-md text-primary">{selectedService?.name || 'Not selected yet'}</p>
              </div>

              <div className="mb-stack-md">
                <span className="font-hanken text-label-sm text-on-surface-variant uppercase tracking-wider block mb-1">Date &amp; Time</span>
                <p className="font-hanken text-body-md text-primary">
                  {formData.scheduled_date || '—'}{formData.scheduled_time && ` at ${formData.scheduled_time}`}
                </p>
              </div>

              <div className="border-t border-outline-slate pt-4">
                <div className="flex justify-between mb-2">
                  <span className="font-hanken text-body-sm text-on-surface-variant">Rate</span>
                  <span className="font-hanken text-body-sm text-on-surface">₹{worker?.hourly_rate || 0}/hr</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="font-hanken text-body-sm text-on-surface-variant">Duration</span>
                  <span className="font-hanken text-body-sm text-on-surface">{formData.duration_hours} hr(s)</span>
                </div>
              </div>

              <div className="border-t border-outline-slate pt-4 mt-2 flex justify-between items-center">
                <span className="font-hanken text-label-md text-primary">Total</span>
                <span className="font-manrope text-headline-md text-primary font-bold">₹{totalAmount}</span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !formData.service_id || !formData.scheduled_date || !formData.scheduled_time || !formData.address}
                className="w-full mt-stack-lg h-12 bg-primary-container text-on-primary font-hanken text-label-md rounded-lg flex items-center justify-center gap-2 hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Confirming...' : 'Confirm Booking'}
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
              <p className="font-hanken text-body-sm text-on-surface-variant text-center mt-4">
                By confirming, you agree to our <span className="text-secondary">Terms of Service</span> and <span className="text-secondary">Cancellation Policy</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
