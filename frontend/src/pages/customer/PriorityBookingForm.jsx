import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { servicesService } from '../../services/servicesService';
import { priorityService } from '../../services/priorityService';
import DashboardLayout from '../../components/DashboardLayout';
import { PRIORITY_URGENCY, PRIORITY_TIME_WINDOW } from '../../config/constants';

const WHEN_OPTIONS = [
  { value: PRIORITY_URGENCY.ASAP, label: 'ASAP' },
  { value: PRIORITY_URGENCY.TODAY, label: 'Today' },
  { value: PRIORITY_URGENCY.TOMORROW, label: 'Tomorrow' },
  { value: PRIORITY_URGENCY.SCHEDULED, label: 'Select date' },
];

const TIME_OPTIONS = [
  { value: PRIORITY_TIME_WINDOW.MORNING, label: 'Morning', hint: '8am – 12pm', time: '09:00' },
  { value: PRIORITY_TIME_WINDOW.AFTERNOON, label: 'Afternoon', hint: '12pm – 4pm', time: '14:00' },
  { value: PRIORITY_TIME_WINDOW.EVENING, label: 'Evening', hint: '4pm – 8pm', time: '17:00' },
  { value: PRIORITY_TIME_WINDOW.SPECIFIC, label: 'Specific time', hint: 'Pick a time', time: '' },
];

function isoDaysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function PriorityBookingForm() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    service_id: '',
    urgency: PRIORITY_URGENCY.ASAP,
    scheduled_date: '',
    time_window: PRIORITY_TIME_WINDOW.MORNING,
    scheduled_time: '',
    address: '',
    budget_min: 500,
    budget_max: 1500,
    special_requirements: '',
    duration_hours: 1,
  });

  useEffect(() => {
    servicesService
      .list()
      .then((res) => setServices(res.data.services || []))
      .catch((err) => console.error('Load services error:', err))
      .finally(() => setLoading(false));
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Resolve the effective scheduled_date from the urgency choice
  function resolveDate() {
    switch (form.urgency) {
      case PRIORITY_URGENCY.ASAP:
      case PRIORITY_URGENCY.TODAY:
        return isoDaysFromNow(0);
      case PRIORITY_URGENCY.TOMORROW:
        return isoDaysFromNow(1);
      case PRIORITY_URGENCY.SCHEDULED:
        return form.scheduled_date;
      default:
        return '';
    }
  }

  function resolveTime() {
    const opt = TIME_OPTIONS.find((t) => t.value === form.time_window);
    if (form.time_window === PRIORITY_TIME_WINDOW.SPECIFIC) return form.scheduled_time;
    return opt?.time || '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.service_id) return setError('Please select a service.');
    if (!form.address.trim()) return setError('Please enter your location/address.');
    if (form.urgency === PRIORITY_URGENCY.SCHEDULED && !form.scheduled_date)
      return setError('Please pick a date.');
    if (form.time_window === PRIORITY_TIME_WINDOW.SPECIFIC && !form.scheduled_time)
      return setError('Please pick a specific time.');
    if (Number(form.budget_min) > Number(form.budget_max))
      return setError('Minimum budget cannot exceed maximum budget.');

    setSubmitting(true);
    try {
      const payload = {
        service_id: form.service_id,
        urgency: form.urgency,
        scheduled_date: resolveDate(),
        scheduled_time: resolveTime(),
        address: form.address.trim(),
        budget_min: Number(form.budget_min),
        budget_max: Number(form.budget_max),
        special_requirements: form.special_requirements.trim(),
        duration_hours: Number(form.duration_hours) || 1,
      };
      const res = await priorityService.create(payload);
      const bookingId = res.data.booking_id;
      navigate('/customer/priority', { state: { focusId: bookingId } });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit priority request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="pt-6 lg:pt-0 px-margin-mobile md:px-margin-desktop lg:px-0 max-w-3xl mx-auto flex flex-col gap-stack-lg pb-24 lg:pb-0">
        <Link to="/customer/book-type" className="flex items-center gap-1 font-hanken text-body-sm text-on-surface-variant hover:text-secondary">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back
        </Link>

        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-xl bg-secondary text-on-secondary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          </span>
          <div>
            <h1 className="font-manrope text-headline-lg-mobile lg:text-headline-lg text-primary">Priority Booking</h1>
            <p className="font-hanken text-body-md text-on-surface-variant">Tell us what you need — we'll find the best available worker.</p>
          </div>
        </div>

        {error && (
          <div className="bg-error-container border border-error/20 rounded-lg p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-error text-[20px]">error</span>
            <p className="font-hanken text-body-sm text-on-error-container">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="priority-card p-stack-lg flex flex-col gap-stack-lg">
          <div className="priority-accent-bar" />

          {/* Service */}
          <div className="flex flex-col gap-stack-xs">
            <label className="font-hanken text-label-md text-on-surface">Service <span className="text-error">*</span></label>
            {loading ? (
              <div className="h-12 bg-surface-container-high rounded-lg animate-pulse" />
            ) : (
              <select value={form.service_id} onChange={(e) => update('service_id', e.target.value)} className="input-field" required>
                <option value="">Select a service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* When */}
          <div className="flex flex-col gap-stack-sm">
            <label className="font-hanken text-label-md text-on-surface">When do you need it?</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {WHEN_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => update('urgency', o.value)}
                  className={`py-2.5 px-3 rounded-lg border font-hanken text-body-sm transition-all ${
                    form.urgency === o.value
                      ? 'border-secondary bg-secondary-fixed text-secondary shadow-level-1'
                      : 'border-outline-slate text-on-surface-variant hover:border-secondary-fixed-dim'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {form.urgency === PRIORITY_URGENCY.SCHEDULED && (
              <input
                type="date"
                min={isoDaysFromNow(0)}
                value={form.scheduled_date}
                onChange={(e) => update('scheduled_date', e.target.value)}
                className="input-field mt-1"
              />
            )}
          </div>

          {/* Preferred time */}
          <div className="flex flex-col gap-stack-sm">
            <label className="font-hanken text-label-md text-on-surface">Preferred time</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIME_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => update('time_window', o.value)}
                  className={`py-2.5 px-3 rounded-lg border font-hanken text-body-sm transition-all flex flex-col items-center ${
                    form.time_window === o.value
                      ? 'border-secondary bg-secondary-fixed text-secondary shadow-level-1'
                      : 'border-outline-slate text-on-surface-variant hover:border-secondary-fixed-dim'
                  }`}
                >
                  {o.label}
                  <span className="text-label-sm opacity-70">{o.hint}</span>
                </button>
              ))}
            </div>
            {form.time_window === PRIORITY_TIME_WINDOW.SPECIFIC && (
              <input
                type="time"
                value={form.scheduled_time}
                onChange={(e) => update('scheduled_time', e.target.value)}
                className="input-field mt-1"
              />
            )}
          </div>

          {/* Location */}
          <div className="flex flex-col gap-stack-xs">
            <label className="font-hanken text-label-md text-on-surface">Location <span className="text-error">*</span></label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="Enter service address"
              className="input-field"
              required
            />
          </div>

          {/* Budget */}
          <div className="flex flex-col gap-stack-sm">
            <label className="font-hanken text-label-md text-on-surface">
              Budget range <span className="font-normal text-on-surface-variant">(optional)</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <span className="font-hanken text-label-sm text-on-surface-variant">Min (₹)</span>
                <input type="number" min="0" step="50" value={form.budget_min} onChange={(e) => update('budget_min', e.target.value)} className="input-field mt-1" />
              </div>
              <span className="text-on-surface-variant mt-5">—</span>
              <div className="flex-1">
                <span className="font-hanken text-label-sm text-on-surface-variant">Max (₹)</span>
                <input type="number" min="0" step="50" value={form.budget_max} onChange={(e) => update('budget_max', e.target.value)} className="input-field mt-1" />
              </div>
            </div>
          </div>

          {/* Special requirements */}
          <div className="flex flex-col gap-stack-xs">
            <label className="font-hanken text-label-md text-on-surface">
              Special requirements <span className="font-normal text-on-surface-variant">(optional)</span>
            </label>
            <textarea
              value={form.special_requirements}
              onChange={(e) => update('special_requirements', e.target.value)}
              placeholder="Anything the worker should know before arriving..."
              className="input-field min-h-[90px] resize-none"
              rows={3}
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
            {submitting ? (
              'Submitting…'
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                Find the Best Worker
              </>
            )}
          </button>
          <p className="font-hanken text-body-sm text-on-surface-variant text-center -mt-2">
            We match you automatically based on availability, distance, rating, experience and budget.
          </p>
        </form>
      </div>
    </DashboardLayout>
  );
}
