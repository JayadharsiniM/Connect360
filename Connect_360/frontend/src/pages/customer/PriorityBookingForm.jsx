import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { servicesService } from '../../services/servicesService';
import { priorityService } from '../../services/priorityService';
import { geocodeAddress, reverseGeocode } from '../../services/routingService';
import { useAuth } from '../../context/AuthContext';
import LiveTrackingMap from '../../components/LiveTrackingMap';

/**
 * PriorityBookingForm — customer submits a REAL priority request.
 *
 * Everything here is real:
 *   - Service list comes from the backend.
 *   - The service address is entered by the customer (or captured from the
 *     device's real GPS via reverse geocoding). No hardcoded street address.
 *   - The address is geocoded to real coordinates and previewed on a real map.
 *   - The payload submitted to the backend reflects the customer's actual input.
 *
 * The backend matching engine chooses the worker; this form never fabricates
 * nearby workers, prices, ETAs, or promo logic.
 */
export default function PriorityBookingForm() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Real form fields
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');

  // Scheduling: ASAP (now) or a specific date/time the customer picks.
  const [scheduleMode, setScheduleMode] = useState('asap'); // 'asap' | 'scheduled'
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Optional budget cap (real, sent to the matching engine)
  const [budgetMax, setBudgetMax] = useState('');

  // Geocoding state for the live map preview
  const [customerLocation, setCustomerLocation] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    servicesService
      .list()
      .then((res) => {
        const list = res.data.services || [];
        setServices(list);
        if (list.length > 0) {
          setSelectedServiceId(list[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load services:', err);
        setError('Could not load services. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedService = services.find((s) => s.id === selectedServiceId) || null;

  // Debounced geocode of the typed address for the live map preview.
  const runGeocode = useCallback(async (addr) => {
    if (!addr || addr.trim().length < 4) {
      setCustomerLocation(null);
      return;
    }
    setGeocoding(true);
    try {
      const coords = await geocodeAddress(addr.trim());
      if (coords && coords.lat && coords.lng) {
        setCustomerLocation({ lat: coords.lat, lng: coords.lng, address: addr.trim() });
      }
    } finally {
      setGeocoding(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runGeocode(address), 700);
    return () => clearTimeout(t);
  }, [address, runGeocode]);

  // Capture the customer's REAL current location and reverse-geocode to an address.
  async function handleUseMyLocation() {
    setError('');
    if (!('geolocation' in navigator)) {
      setError('Location is not supported on this device.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const result = await reverseGeocode(latitude, longitude);
        if (result) {
          setAddress(result.address);
          setCustomerLocation({ lat: latitude, lng: longitude, address: result.address });
        } else {
          setCustomerLocation({ lat: latitude, lng: longitude, address: 'Current location' });
        }
        setLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Enter your address manually.'
            : 'Could not get your location. Enter your address manually.'
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit() {
    setError('');

    if (!selectedServiceId) {
      setError('Please select a service.');
      return;
    }
    if (!address.trim()) {
      setError('Please provide your service address.');
      return;
    }
    if (scheduleMode === 'scheduled' && (!scheduledDate || !scheduledTime)) {
      setError('Please pick a date and time, or choose ASAP.');
      return;
    }

    // Resolve final date/time from the real scheduling choice.
    const finalDate = scheduleMode === 'asap' ? new Date().toISOString().slice(0, 10) : scheduledDate;
    const finalTime =
      scheduleMode === 'asap'
        ? new Date().toTimeString().slice(0, 5) // HH:MM local
        : scheduledTime;

    setSubmitting(true);
    try {
      const payload = {
        service_id: selectedServiceId,
        service_name: selectedService?.name || '',
        urgency: scheduleMode === 'asap' ? 'asap' : 'scheduled',
        scheduled_date: finalDate,
        scheduled_time: finalTime,
        address: address.trim(),
        city: city.trim(),
        special_requirements: notes.trim(),
        notes: notes.trim(),
      };
      // Only include a budget cap if the customer actually set one.
      const bMax = parseFloat(budgetMax);
      if (!isNaN(bMax) && bMax > 0) {
        payload.budget_max = bMax;
      }

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
    <div className="flex h-screen flex-col overflow-hidden bg-surface text-on-surface font-sans">
      {/* Top bar */}
      <header className="h-16 bg-white border-b border-outline-slate px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-6">
          <Link to="/customer/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
              ⚡
            </div>
            <span className="text-slate-900 font-extrabold tracking-tight text-lg">
              Connect<span className="text-blue-600">360</span>
            </span>
          </Link>
          <div className="h-5 w-px bg-outline-slate hidden sm:block"></div>
          <span className="hidden sm:inline text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md text-xs">
            Priority Request
          </span>
        </div>
        <Link to="/customer/priority" className="text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">list_alt</span>
          My Priority Bookings
        </Link>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT: real request form */}
        <aside className="w-full md:w-[460px] bg-white border-r border-outline-slate flex flex-col justify-between shrink-0 z-20 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
            <div className="pt-1">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Create a priority request</h1>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Tell us what you need. We'll match you with the best available verified worker.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Service */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Service needed</label>
              {loading ? (
                <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
              ) : (
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full text-sm font-semibold text-slate-900 bg-white border border-outline-slate rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-600"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              {selectedService?.description && (
                <p className="text-[11px] text-slate-500">{selectedService.description}</p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Service address</label>
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={locating}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[14px]">my_location</span>
                  {locating ? 'Locating…' : 'Use my location'}
                </button>
              </div>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter the full address where you need the service"
                rows={2}
                className="w-full text-sm text-slate-900 bg-white border border-outline-slate rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-600 resize-none"
              />
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                {geocoding ? (
                  <>
                    <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Locating address on map…</span>
                  </>
                ) : customerLocation ? (
                  <>
                    <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                    <span className="text-emerald-700 font-semibold">Location confirmed on map</span>
                  </>
                ) : (
                  <span>Enter an address to preview it on the map</span>
                )}
              </div>
            </div>

            {/* City (optional, aids matching) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">City (optional)</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Chennai"
                className="w-full text-sm text-slate-900 bg-white border border-outline-slate rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* When */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">When</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleMode('asap')}
                  className={`rounded-xl px-3 py-2.5 text-sm font-bold border transition ${
                    scheduleMode === 'asap'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-outline-slate bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  As soon as possible
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMode('scheduled')}
                  className={`rounded-xl px-3 py-2.5 text-sm font-bold border transition ${
                    scheduleMode === 'scheduled'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-outline-slate bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  Schedule
                </button>
              </div>
              {scheduleMode === 'scheduled' && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={scheduledDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full text-sm text-slate-900 bg-white border border-outline-slate rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-600"
                  />
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full text-sm text-slate-900 bg-white border border-outline-slate rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-600"
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Describe the issue (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Circuit breaker keeps tripping in the kitchen"
                rows={2}
                className="w-full text-sm text-slate-900 bg-white border border-outline-slate rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-600 resize-none"
              />
            </div>

            {/* Budget cap (optional) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Max budget (optional)
              </label>
              <input
                type="number"
                min="0"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="Leave blank for no cap"
                className="w-full text-sm text-slate-900 bg-white border border-outline-slate rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="p-4 border-t border-outline-slate bg-white">
            <button
              onClick={handleSubmit}
              disabled={submitting || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-extrabold py-3.5 px-6 rounded-xl text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                bolt
              </span>
              <span>{submitting ? 'Finding your worker…' : 'Submit priority request'}</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              We'll match you with the best available verified worker.
            </p>
          </div>
        </aside>

        {/* RIGHT: real map preview of the customer's location */}
        <main className="flex-1 relative bg-slate-100 overflow-hidden hidden md:block">
          {customerLocation ? (
            <LiveTrackingMap
              customerLocation={customerLocation}
              workerLocation={null}
              customerLabel={address || 'Your service location'}
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-3">
              <span className="material-symbols-outlined text-[48px]">location_searching</span>
              <span className="text-sm font-bold">Enter your address to see it on the map</span>
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={locating}
                className="mt-1 text-xs font-bold text-blue-600 border border-blue-200 bg-blue-50 rounded-lg px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">my_location</span>
                {locating ? 'Locating…' : 'Use my current location'}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
