import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { priorityService } from '../../services/priorityService';
import { bookingsService } from '../../services/bookingsService';
import { geocodeAddress } from '../../services/routingService';
import CallButton from '../../components/CallButton';
import ArrivalOtpCard from '../../components/ArrivalOtpCard';
import DashboardLayout from '../../components/DashboardLayout';
import LiveTrackingMap from '../../components/LiveTrackingMap';
import { PRIORITY_STATUS } from '../../config/constants';

const ACTIVE_STATUSES = [
  PRIORITY_STATUS.MATCHING,
  PRIORITY_STATUS.REMATCHING,
  PRIORITY_STATUS.WORKER_PENDING,
  'accepted',
  'in_progress',
];

export default function PriorityBookings() {
  const { t } = useTranslation();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(location.state?.focusId || null);
  const [actionId, setActionId] = useState(null);

  // Real GPS & Road Routing telemetry state
  const [workerLocation, setWorkerLocation] = useState(null);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [routeMetrics, setRouteMetrics] = useState(null);
  const [hasGpsSignal, setHasGpsSignal] = useState(false);

  const pollRef = useRef(null);
  const locationPollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await priorityService.listCustomer();
      const list = res.data.priority_bookings || [];
      setItems(list);
      if (!selectedId && list.length > 0) {
        setSelectedId(list[0].booking_id || list[0].id);
      }
    } catch (err) {
      console.error('Priority load error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  // Active polling to capture live worker acceptance or status transitions
  useEffect(() => {
    const hasActive = items.some((b) => ACTIVE_STATUSES.includes(b.status));
    clearInterval(pollRef.current);
    if (hasActive) {
      pollRef.current = setInterval(load, 3000);
    }
    return () => clearInterval(pollRef.current);
  }, [items, load]);

  const activeBooking = items.find((b) => (b.booking_id || b.id) === selectedId) || items[0];
  const isEnRoute = activeBooking && (activeBooking.status === 'accepted' || activeBooking.status === 'in_progress');

  // Geocode customer address to real lat/lng coordinates
  useEffect(() => {
    if (!activeBooking) return;
    let isCancelled = false;

    async function resolveCoords() {
      const addr = activeBooking.address;
      if (!addr) return;
      const coords = await geocodeAddress(addr);
      if (!isCancelled && coords) {
        setCustomerLocation({
          lat: coords.lat,
          lng: coords.lng,
          address: addr,
        });
      }
    }

    resolveCoords();
    return () => {
      isCancelled = true;
    };
  }, [activeBooking?.address]);

  // Poll real worker GPS location from backend (PUT /api/bookings/{id}/location stream)
  useEffect(() => {
    const bookingId = activeBooking?.booking_id || activeBooking?.id;
    if (!bookingId) return;

    let isCancelled = false;
    async function fetchWorkerLocation() {
      try {
        const res = await bookingsService.getLocation(bookingId);
        if (isCancelled) return;
        const loc = res.data?.location;
        if (loc && loc.latitude && loc.longitude) {
          // Real worker GPS from the backend tracking stream
          setWorkerLocation(loc);
          setHasGpsSignal(true);
        } else {
          // No real GPS yet — do NOT fabricate a worker position.
          setWorkerLocation(null);
          setHasGpsSignal(false);
        }
      } catch (err) {
        console.warn('Live location poll note:', err);
      }
    }

    fetchWorkerLocation();
    clearInterval(locationPollRef.current);
    locationPollRef.current = setInterval(fetchWorkerLocation, 3000);

    return () => {
      isCancelled = true;
      clearInterval(locationPollRef.current);
    };
  }, [activeBooking?.booking_id, activeBooking?.id]);

  async function handleRematch(id) {
    setActionId(id);
    try {
      await priorityService.rematch(id);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || t('priorityTrack.couldNotRematch'));
    } finally {
      setActionId(null);
    }
  }

  async function handleCancel(id) {
    if (!window.confirm(t('priorityTrack.confirmCancel'))) return;
    setActionId(id);
    try {
      await priorityService.cancel(id);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || t('priorityTrack.couldNotCancel'));
    } finally {
      setActionId(null);
    }
  }

  // Real ETA and route distance from the routing service (null until computed)
  const etaMinutes = routeMetrics?.durationMinutes ?? null;
  const distanceKm = routeMetrics?.distanceKm ?? null;

  return (
    <DashboardLayout>
      <div className="pt-4 lg:pt-0 px-margin-mobile md:px-margin-desktop lg:px-0 max-w-7xl mx-auto flex flex-col gap-6 pb-24 lg:pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
              <span className="material-symbols-outlined text-[24px]">bolt</span>
            </span>
            <div>
              <h1 className="font-manrope text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                {t('priorityTrack.title')}
              </h1>
              <p className="font-hanken text-xs sm:text-sm text-slate-500">
                {t('priorityTrack.subtitle')}
              </p>
            </div>
          </div>
          <Link
            to="/customer/priority/new"
            className="self-start sm:self-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {t('priorityTrack.newRequest')}
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 h-96 bg-white rounded-2xl border border-outline-slate animate-pulse" />
            <div className="lg:col-span-7 h-96 bg-white rounded-2xl border border-outline-slate animate-pulse" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-outline-slate p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 text-3xl">
              ⚡
            </div>
            <h3 className="font-manrope text-xl font-bold text-slate-900 mb-2">{t('priorityTrack.noBookingsTitle')}</h3>
            <p className="font-hanken text-sm text-slate-500 max-w-md mx-auto mb-6">
              {t('priorityTrack.noBookingsDesc')}
            </p>
            <Link
              to="/customer/priority/new"
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-6 rounded-xl text-sm inline-flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <span>{t('priorityTrack.createRequest')}</span>
              <span>→</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Active Booking Card & Controls */}
            <div className="lg:col-span-5 space-y-4">
              {/* Selected Booking Detail Card */}
              {activeBooking && (
                <div className="bg-white border border-outline-slate rounded-2xl shadow-elevation-md overflow-hidden">
                  {/* Status Banner */}
                  <div
                    className={`px-5 py-3 flex items-center justify-between text-xs font-bold ${
                      activeBooking.status === 'accepted'
                        ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                        : activeBooking.status === 'in_progress'
                        ? 'bg-blue-50 text-blue-800 border-b border-blue-200'
                        : activeBooking.status === 'no_worker_available'
                        ? 'bg-amber-50 text-amber-800 border-b border-amber-200'
                        : activeBooking.status === 'cancelled'
                        ? 'bg-slate-100 text-slate-700 border-b border-slate-200'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                      <span className="uppercase tracking-wider">
                        {activeBooking.status === 'worker_pending'
                          ? t('priorityTrack.awaitingAcceptance')
                          : activeBooking.status === 'accepted'
                          ? t('priorityTrack.confirmedEnRoute')
                          : activeBooking.status === 'in_progress'
                          ? t('priorityTrack.serviceInProgress')
                          : activeBooking.status === 'no_worker_available'
                          ? t('priorityTrack.noWorkerAvailable')
                          : activeBooking.status === 'cancelled'
                          ? t('priorityTrack.bookingCancelled')
                          : t('priorityTrack.matchingPro')}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] opacity-90">
                      {etaMinutes != null ? t('priorityTrack.etaMin', { min: etaMinutes }) : t('priorityTrack.etaCalculating')}
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Service & ID Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {activeBooking.service_name || t('priorityTrack.emergencyService')}
                          </span>
                          <span className="text-slate-400 font-mono text-xs">
                            #{String(activeBooking.booking_id || activeBooking.id).slice(-6)}
                          </span>
                        </div>
                        <h2 className="text-lg font-extrabold text-slate-900">
                          {activeBooking.service_name || t('priorityTrack.homeService')}
                        </h2>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black text-slate-900">
                          {activeBooking.total_amount ? `$${activeBooking.total_amount}` : '—'}
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold">{t('priorityTrack.estimatedTotal')}</span>
                      </div>
                    </div>

                    {/* Stepper Progress Bar */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span className={activeBooking.status ? 'text-blue-600' : ''}>{t('priorityTrack.dispatched')}</span>
                        <span className={['worker_pending', 'accepted', 'in_progress'].includes(activeBooking.status) ? 'text-blue-600' : ''}>
                          {t('priorityTrack.assigned')}
                        </span>
                        <span className={['accepted', 'in_progress'].includes(activeBooking.status) ? 'text-emerald-600 font-black' : ''}>
                          {t('priorityTrack.enRoute')}
                        </span>
                        <span className={activeBooking.status === 'completed' ? 'text-emerald-600' : ''}>
                          {t('priorityTrack.completed')}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full transition-all duration-500 ${
                            activeBooking.status === 'completed'
                              ? 'w-full bg-emerald-500'
                              : activeBooking.status === 'accepted' || activeBooking.status === 'in_progress'
                              ? 'w-3/4 bg-emerald-500'
                              : activeBooking.status === 'worker_pending'
                              ? 'w-2/4 bg-blue-600'
                              : 'w-1/4 bg-blue-600 animate-pulse'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Assigned Worker Snapshot */}
                    {activeBooking.worker ? (
                      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-base shadow-sm">
                            {activeBooking.worker.full_name?.slice(0, 2).toUpperCase() || 'WK'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-extrabold text-sm text-slate-900">
                              <span>{activeBooking.worker.full_name}</span>
                              {activeBooking.worker.rating_avg ? (
                                <span className="text-amber-500 text-xs">★ {activeBooking.worker.rating_avg}</span>
                              ) : null}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {t('priorityTrack.verifiedTechnician')}
                              {activeBooking.match_score
                                ? ` • ${t('priorityTrack.matchScore', { score: activeBooking.match_score })}`
                                : ''}
                            </div>
                            {etaMinutes != null && (
                              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                {t('priorityTrack.arrivalWindow', { min: etaMinutes })}
                              </div>
                            )}
                          </div>
                        </div>

                        <CallButton
                          bookingId={activeBooking.booking_id || activeBooking.id}
                          status={activeBooking.status}
                          label={t('priorityTrack.callPro')}
                        />
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3.5 text-center text-xs text-slate-500">
                        {activeBooking.status === 'no_worker_available' ? (
                          <div className="space-y-2">
                            <p className="font-bold text-slate-700">{t('priorityTrack.allBusy')}</p>
                            <button
                              onClick={() => handleRematch(activeBooking.booking_id || activeBooking.id)}
                              disabled={actionId === (activeBooking.booking_id || activeBooking.id)}
                              className="text-xs bg-blue-600 text-white font-bold py-1.5 px-3 rounded-lg"
                            >
                              {t('priorityTrack.retrySearch')}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                            <span>{t('priorityTrack.matchingNearest')}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Arrival OTP — share this with the worker on arrival */}
                    {(activeBooking.status === 'accepted' || activeBooking.status === 'in_progress') && (
                      <ArrivalOtpCard booking={activeBooking} />
                    )}

                    {/* Booking Details List */}
                    <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                      <div className="flex items-start justify-between">
                        <span className="text-slate-400 font-bold uppercase text-[10px]">{t('priorityTrack.locationLabel')}</span>
                        <span className="text-slate-800 font-semibold text-right max-w-xs truncate">
                          {activeBooking.address || t('priorityTrack.addressOnFile')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-bold uppercase text-[10px]">{t('priorityTrack.scheduleLabel')}</span>
                        <span className="text-slate-800 font-semibold">
                          {activeBooking.scheduled_date || t('priorityTrack.today')} {t('priorityTrack.atTime')} {activeBooking.scheduled_time || t('priorityTrack.immediate')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-bold uppercase text-[10px]">{t('priorityTrack.dispatchSla')}</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <span>✓ {t('priorityTrack.slaGuarantee')}</span>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      {['matching', 'worker_pending'].includes(activeBooking.status) && (
                        <button
                          onClick={() => handleCancel(activeBooking.booking_id || activeBooking.id)}
                          disabled={actionId === (activeBooking.booking_id || activeBooking.id)}
                          className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 font-bold text-xs hover:bg-red-50 transition-colors"
                        >
                          {t('priorityTrack.cancelRequest')}
                        </button>
                      )}
                      {activeBooking.status === 'no_worker_available' && (
                        <button
                          onClick={() => handleRematch(activeBooking.booking_id || activeBooking.id)}
                          className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700"
                        >
                          {t('priorityTrack.findAnother')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* All Priority Requests Selector */}
              {items.length > 1 && (
                <div className="bg-white border border-outline-slate rounded-xl p-3 shadow-xs space-y-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {t('priorityTrack.priorityHistory', { count: items.length })}
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                    {items.map((b) => (
                      <div
                        key={b.booking_id || b.id}
                        onClick={() => setSelectedId(b.booking_id || b.id)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          (b.booking_id || b.id) === selectedId
                            ? 'border-blue-600 bg-blue-50/50'
                            : 'border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">{b.service_name || t('priorityTrack.priorityBooking')}</span>
                          <span className="text-[10px] text-slate-500">{b.scheduled_date || t('priorityTrack.today')}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                            b.status === 'accepted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'worker_pending'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {t(`status.${b.status}`, b.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Live Interactive Leaflet Map with Real Road Routing */}
            <div className="lg:col-span-7 relative h-[560px] bg-slate-100 rounded-2xl border border-outline-slate overflow-hidden shadow-elevation-md">
              {customerLocation ? (
                <LiveTrackingMap
                  workerLocation={workerLocation}
                  customerLocation={customerLocation}
                  workerName={activeBooking?.worker_name || activeBooking?.worker?.full_name || t('priorityTrack.assignedSpecialist')}
                  customerLabel={activeBooking?.address || t('priorityTrack.yourServiceLocation')}
                  onRouteCalculated={(metrics) => setRouteMetrics(metrics)}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-3">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold font-manrope">{t('priorityTrack.resolvingLocation')}</span>
                </div>
              )}

              {/* Overlay hint when we have the customer location but the worker
                  has not started broadcasting real GPS yet. */}
              {customerLocation && !workerLocation && isEnRoute && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-[900] flex justify-center pointer-events-none">
                  <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-xl px-4 py-2 shadow-md text-xs font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    {t('priorityTrack.waitingGps')}
                  </div>
                </div>
              )}

              {/* Top Radar Banner */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border border-outline-slate shadow-md flex items-center gap-2.5 z-[1000]">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {isEnRoute
                    ? etaMinutes != null
                      ? t('priorityTrack.technicianEnRoute', { min: etaMinutes, km: distanceKm })
                      : t('priorityTrack.acquiringRoute')
                    : t('priorityTrack.dispatchRadar')}
                </span>
                {hasGpsSignal && (
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded border border-emerald-300">
                    {t('priorityTrack.liveGps')}
                  </span>
                )}
              </div>

              {/* Bottom Floating Legend */}
              <div className="absolute bottom-4 left-4 right-16 bg-white/95 backdrop-blur-md border border-outline-slate rounded-xl p-3 shadow-md flex items-center justify-between text-xs z-[1000]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <span className="font-bold text-slate-900">{t('priorityTrack.realTelemetry')}</span>
                  <span className="text-[10px] text-slate-400">
                    ({routeMetrics?.source === 'google-maps' ? 'Google Maps Routes' : 'OSRM Turn-by-Turn'})
                  </span>
                </div>
                <span className="text-slate-500 text-[11px] hidden sm:inline">
                  {hasGpsSignal ? t('priorityTrack.streamingGps') : t('priorityTrack.connectingGps')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
