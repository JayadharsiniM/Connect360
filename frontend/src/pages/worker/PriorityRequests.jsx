import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { priorityService } from '../../services/priorityService';
import { bookingsService } from '../../services/bookingsService';
import { geocodeAddress } from '../../services/routingService';
import { useAuth } from '../../context/AuthContext';
import CallButton from '../../components/CallButton';
import LiveTrackingMap from '../../components/LiveTrackingMap';

export default function WorkerPriorityRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [flash, setFlash] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [countdown, setCountdown] = useState(14);
  const [autoAccept, setAutoAccept] = useState(false);

  // GPS & Road Routing state
  const [workerLocation, setWorkerLocation] = useState(null);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [routeMetrics, setRouteMetrics] = useState(null);
  const [gpsMode, setGpsMode] = useState('searching'); // 'searching' | 'device' | 'test_drive'
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [isDriving, setIsDriving] = useState(false);

  const pollRef = useRef(null);
  const driveIntervalRef = useRef(null);
  const driveIndexRef = useRef(0);
  const isDrivingRef = useRef(false);

  // Load incoming offers and check for active accepted bookings
  const load = useCallback(async () => {
    if (!isOnline) {
      setRequests([]);
      setLoading(false);
      return;
    }
    try {
      // 1. Check for incoming offers
      const res = await priorityService.listWorkerRequests();
      const list = res.data.priority_requests || [];
      setRequests(list);
      if (list.length > 0) {
        setCountdown(14);
      }

      // 2. Check for active accepted priority jobs
      const resBookings = await bookingsService.listWorkerBookings();
      const bookingsList = resBookings.data.bookings || [];
      const active = bookingsList.find(
        (b) => b.booking_type === 'priority' && ['accepted', 'in_progress'].includes(b.status)
      );
      setActiveJob(active || null);
    } catch (err) {
      console.error('Priority requests load error:', err);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 4000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  // Geocode active job customer address or active offer area
  useEffect(() => {
    const targetAddress = activeJob?.address || requests[0]?.address || 'Chennai, Tamil Nadu';
    let isCancelled = false;

    async function resolveCustomer() {
      const coords = await geocodeAddress(targetAddress);
      if (!isCancelled) {
        setCustomerLocation({
          lat: coords.lat,
          lng: coords.lng,
          address: targetAddress,
        });

        // If worker location is not yet set, initialize near customer so route is ready
        setWorkerLocation((prev) => {
          if (prev) return prev;
          return {
            latitude: coords.lat + 0.012,
            longitude: coords.lng - 0.014,
            heading: 60,
            speed: 35,
          };
        });
      }
    }

    resolveCustomer();
    return () => {
      isCancelled = true;
    };
  }, [activeJob?.address, requests]);

  // Stream actual device GPS via navigator.geolocation.watchPosition
  useEffect(() => {
    const bookingId = activeJob?.id || activeJob?.booking_id;
    if (!bookingId || isDriving) return;

    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (isDrivingRef.current) return;
          const { latitude, longitude, heading, speed, accuracy } = pos.coords;
          const locData = {
            latitude,
            longitude,
            heading: heading || 0,
            speed: speed || 0,
            accuracy: Math.round(accuracy || 10),
            timestamp: new Date().toISOString(),
          };
          setWorkerLocation(locData);
          setGpsAccuracy(Math.round(accuracy || 10));
          setGpsMode('device');

          // Transmit real GPS to backend
          bookingsService.updateLocation(bookingId, locData).catch(console.warn);
        },
        (err) => {
          console.warn('Device geolocation note:', err.message);
          setGpsMode('simulated_fallback');
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [activeJob?.id, activeJob?.booking_id, isDriving]);

  // Test Drive Simulation along real road waypoints (OSRM / Google Routes)
  useEffect(() => {
    isDrivingRef.current = isDriving;
    const bookingId = activeJob?.id || activeJob?.booking_id;
    const waypoints = routeMetrics?.coordinates;

    if (isDriving && waypoints && waypoints.length > 1 && bookingId) {
      clearInterval(driveIntervalRef.current);
      setGpsMode('test_drive');

      driveIntervalRef.current = setInterval(() => {
        driveIndexRef.current += 1;
        if (driveIndexRef.current >= waypoints.length) {
          driveIndexRef.current = 0; // Loop or reach destination
        }

        const currentPoint = waypoints[driveIndexRef.current];
        const nextPoint = waypoints[Math.min(driveIndexRef.current + 1, waypoints.length - 1)];

        // Compute heading angle between current and next road waypoint
        const dLat = nextPoint[0] - currentPoint[0];
        const dLng = nextPoint[1] - currentPoint[1];
        const angleDeg = ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;

        const locData = {
          latitude: currentPoint[0],
          longitude: currentPoint[1],
          heading: Math.round(angleDeg),
          speed: 42,
          accuracy: 5,
          timestamp: new Date().toISOString(),
        };

        setWorkerLocation(locData);
        // Transmit coordinates to backend stream
        bookingsService.updateLocation(bookingId, locData).catch(console.warn);
      }, 1800);

      return () => clearInterval(driveIntervalRef.current);
    } else {
      clearInterval(driveIntervalRef.current);
    }
  }, [isDriving, routeMetrics?.coordinates, activeJob?.id, activeJob?.booking_id]);

  // 14s Countdown for incoming offer
  useEffect(() => {
    if (requests.length === 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [requests.length]);

  async function handleAccept(id) {
    setActionId(id);
    try {
      await priorityService.accept(id);
      setFlash('Priority request accepted! Routing and GPS telemetry active.');
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not accept this request');
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id) {
    setActionId(id);
    try {
      await priorityService.reject(id);
      setFlash('Request declined. Dispatched to next available technician.');
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not decline this request');
    } finally {
      setActionId(null);
    }
  }

  async function handleStatusUpdate(newStatus) {
    const bookingId = activeJob?.id || activeJob?.booking_id;
    if (!bookingId) return;
    setActionId(bookingId);
    try {
      await bookingsService.updateBookingStatus(bookingId, newStatus);
      setFlash(`Status updated to ${newStatus.replace('_', ' ')}.`);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setActionId(null);
    }
  }

  const activeOffer = requests[0];
  const activeJobId = activeJob?.id || activeJob?.booking_id;

  return (
    <div className="relative w-full h-screen flex flex-col bg-[#f8f9ff] overflow-hidden select-none font-sans text-slate-800">
      {/* Header: Top Bar */}
      <header className="h-16 bg-white/95 backdrop-blur border-b border-slate-200/80 flex items-center justify-between px-6 z-30 shrink-0 shadow-sm">
        <div className="flex items-center gap-5">
          <Link to="/worker/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-600/25">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-base tracking-tight">
                  Connect<span className="text-blue-600">360</span>
                </span>
                <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border border-blue-200 tracking-wider">
                  Partner Radar
                </span>
              </div>
            </div>
          </Link>
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

          {/* Driver Online Status Pill */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all ${
              isOnline ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            <span className="relative flex h-2.5 w-2.5">
              {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
            </span>
            <span className="text-xs font-bold tracking-wide uppercase">
              {isOnline ? 'ONLINE • Radar Streaming' : 'OFFLINE • Radar Paused'}
            </span>
            <button
              onClick={() => setIsOnline(!isOnline)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition ml-1 underline cursor-pointer"
              type="button"
            >
              {isOnline ? 'Go Offline' : 'Go Online'}
            </button>
          </div>
        </div>

        {/* GPS Live Telemetry Pill */}
        <div className="hidden md:flex items-center gap-2.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200 text-xs shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-extrabold text-slate-800">
            {gpsMode === 'device'
              ? `Live Device GPS (±${gpsAccuracy || 10}m)`
              : gpsMode === 'test_drive'
              ? 'Road-Drive Simulator Active'
              : 'GPS Streaming Ready'}
          </span>
          {workerLocation && (
            <span className="text-[10px] text-slate-500 font-mono">
              {workerLocation.latitude.toFixed(4)}, {workerLocation.longitude.toFixed(4)}
            </span>
          )}
        </div>

        {/* Driver Profile */}
        <div className="flex items-center gap-3">
          <Link to="/worker/bookings" className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-sm transition">
            <span className="material-symbols-outlined text-[16px] text-blue-600">calendar_month</span>
            <span>All Bookings</span>
          </Link>
          <div className="h-6 w-px bg-slate-200"></div>
          <Link to="/worker/profile" className="flex items-center gap-2 pl-1">
            <div className="w-9 h-9 rounded-full bg-blue-50 border-2 border-blue-600 text-blue-700 flex items-center justify-center font-extrabold text-xs shadow-sm">
              {user?.fullName ? user.fullName.slice(0, 2).toUpperCase() : 'SP'}
            </div>
          </Link>
        </div>
      </header>

      {/* Main Interactive Leaflet Map Area */}
      <div className="relative flex-1 w-full overflow-hidden bg-[#eef2f8]">
        {customerLocation && workerLocation ? (
          <LiveTrackingMap
            workerLocation={workerLocation}
            customerLocation={customerLocation}
            workerName={user?.fullName || 'You (Technician)'}
            customerLabel={activeJob?.address || activeOffer?.address || 'Customer Location'}
            isWorkerPerspective={true}
            onRouteCalculated={(metrics) => setRouteMetrics(metrics)}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 gap-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold">Acquiring GPS & Map Satellites...</span>
          </div>
        )}

        {/* Flash Notification */}
        {flash && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
            <span>✓</span>
            <span>{flash}</span>
            <button onClick={() => setFlash('')} className="ml-2 opacity-80 hover:opacity-100 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Scenario A: ACTIVE ACCEPTED JOB HUD */}
        {activeJob ? (
          <div className="absolute top-5 left-6 w-[440px] max-w-[calc(100vw-3rem)] z-[1000]">
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-elevation-xl overflow-hidden">
              {/* Active Banner */}
              <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3 flex items-center justify-between text-white shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="animate-pulse text-amber-300">⚡</span>
                  <span className="text-xs font-extrabold uppercase tracking-wider">
                    {activeJob.status === 'accepted' ? 'ACTIVE PRIORITY TRIP • EN ROUTE' : 'IN PROGRESS • WORK UNDERWAY'}
                  </span>
                </div>
                <span className="text-[10px] bg-blue-800 text-blue-100 font-bold px-2 py-0.5 rounded-full uppercase">
                  {activeJob.status}
                </span>
              </div>

              <div className="p-4 space-y-3.5">
                {/* Route Metrics Snapshot */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      Guaranteed Total Payout
                    </span>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                      ${activeJob.total_amount || 145}.00
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-extrabold text-blue-600">
                      ~{routeMetrics?.durationMinutes ?? 8} min drive
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {routeMetrics?.distanceKm ?? '2.1'} km via actual roads
                    </span>
                  </div>
                </div>

                {/* Service Details & Address */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-xs">{activeJob.service_name || 'Priority Service'}</span>
                    <span className="text-[10px] font-mono text-slate-400">#{String(activeJobId).slice(-6)}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="material-symbols-outlined text-[16px] text-blue-600 shrink-0">location_on</span>
                    <span className="font-semibold">{activeJob.address || 'Customer Residence'}</span>
                  </div>
                </div>

                {/* Call Customer & GPS Test Drive Bar */}
                <div className="flex items-center gap-2 pt-1">
                  <CallButton bookingId={activeJobId} status={activeJob.status} label="Call Customer" className="flex-1" />
                  <button
                    onClick={() => setIsDriving(!isDriving)}
                    type="button"
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                      isDriving
                        ? 'bg-amber-100 border-amber-300 text-amber-900 animate-pulse'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    }`}
                    title="Simulate driving along actual road network for testing without moving physical device"
                  >
                    <span>{isDriving ? '⏸ Pause Drive' : '🚗 Test Drive Route'}</span>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="pt-1">
                  {activeJob.status === 'accepted' && (
                    <button
                      onClick={() => handleStatusUpdate('in_progress')}
                      disabled={actionId === activeJobId}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                      <span>{actionId === activeJobId ? 'Updating...' : 'I Have Arrived • Start Work'}</span>
                    </button>
                  )}
                  {activeJob.status === 'in_progress' && (
                    <button
                      onClick={() => handleStatusUpdate('completed')}
                      disabled={actionId === activeJobId}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">task_alt</span>
                      <span>{actionId === activeJobId ? 'Completing...' : 'Mark Job Complete & Signoff'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeOffer ? (
          /* Scenario B: INCOMING DISPATCH OFFER CARD */
          <div className="absolute top-5 left-6 w-[440px] max-w-[calc(100vw-3rem)] z-[1000]">
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-elevation-xl overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-4 py-3 flex items-center justify-between text-slate-950 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-base animate-bounce">⚡</span>
                  <span className="text-xs font-extrabold tracking-wider uppercase">
                    PRIORITY DISPATCH • HIGH URGENCY
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900 text-amber-300 px-2.5 py-0.5 rounded-full font-mono text-xs font-black shadow-sm">
                  <span>⏱ 0:{countdown < 10 ? `0${countdown}` : countdown}</span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                      Guaranteed Total Payout
                    </span>
                    <div className="text-3xl font-black text-slate-900 tracking-tight flex items-baseline gap-1.5">
                      <span className="text-emerald-600 font-extrabold">
                        ${activeOffer.estimated_earnings || activeOffer.total_amount || 145}.00
                      </span>
                      <span className="text-xs font-semibold text-slate-400">est.</span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="inline-block px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-extrabold">
                      +$30.00 Express Surge
                    </span>
                    <span className="block text-[10px] text-slate-500">Direct deposit upon signoff</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold uppercase tracking-wide">
                        {activeOffer.service_name || 'Emergency Repair'}
                      </span>
                      <span className="text-slate-400 text-xs font-mono font-semibold">
                        #{String(activeOffer.booking_id).slice(-6)}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                      {activeOffer.service_name || 'Emergency'} Diagnostics & Immediate Repair
                    </h3>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2.5">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-900">
                            {activeOffer.address || activeOffer.area || 'Customer Address'}
                          </span>
                          <span className="text-blue-600 font-extrabold">
                            {routeMetrics?.durationMinutes ? `~${routeMetrics.durationMinutes} min drive` : 'Near you'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Client: {activeOffer.customer_name || 'Verified Client'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-2.5 border border-slate-200/80 text-[11px] text-slate-600 italic flex items-start gap-2 shadow-xs">
                      <span className="not-italic text-amber-500 font-bold">💬</span>
                      <span className="leading-relaxed">
                        "{activeOffer.special_requirements || 'Urgent repair required immediately.'}"
                      </span>
                    </div>
                  </div>
                </div>

                {/* Accept / Decline */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => handleAccept(activeOffer.booking_id)}
                    disabled={actionId === activeOffer.booking_id}
                    className="relative w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-extrabold text-base rounded-xl shadow-amber-glow transition transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 overflow-hidden border border-amber-400 cursor-pointer"
                    type="button"
                  >
                    <span className="relative z-10 flex items-center gap-2 tracking-wide uppercase font-black">
                      <span>{actionId === activeOffer.booking_id ? 'CONFIRMING...' : 'TAP TO ACCEPT'}</span>
                      <span className="text-xs bg-slate-950 text-amber-300 px-2.5 py-0.5 rounded-full font-mono font-black">
                        0:{countdown < 10 ? `0${countdown}` : countdown}
                      </span>
                    </span>
                    <div
                      className="absolute left-0 bottom-0 top-0 bg-amber-500/30 transition-all duration-1000 pointer-events-none"
                      style={{ width: `${(countdown / 14) * 100}%` }}
                    ></div>
                  </button>

                  <div className="flex items-center justify-between px-1 text-xs pt-1">
                    <button
                      onClick={() => handleReject(activeOffer.booking_id)}
                      disabled={actionId === activeOffer.booking_id}
                      className="text-slate-500 hover:text-slate-800 font-semibold transition py-1 underline-offset-2 hover:underline cursor-pointer"
                      type="button"
                    >
                      Decline Request
                    </button>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Auto-dispatch will route to next tech in {countdown}s
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Scenario C: RADAR SEARCHING */
          <div className="absolute top-5 left-6 w-[420px] max-w-[calc(100vw-3rem)] z-[1000]">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-6 shadow-elevation-lg text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-2xl">
                📡
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Radar Active • Waiting for Requests</h3>
              <p className="text-xs text-slate-500">
                You are prioritized for high-urgency jobs in your zone. Your live GPS is actively broadcasting.
              </p>
              <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 py-1.5 rounded-lg border border-emerald-200">
                ● Ready for instant dispatch (5 mi radius)
              </div>
            </div>
          </div>
        )}

        {/* Bottom Cockpit Drawer */}
        <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-xl border-t border-slate-200/90 px-6 py-3.5 shadow-elevation-lg">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-[22px] animate-spin">sync</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Priority Dispatch Radar
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-emerald-200">
                    Live GPS Stream
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Road routing: <strong className="text-slate-800 font-bold">{routeMetrics?.source === 'google-maps' ? 'Google Maps Routes' : 'OSRM Turn-by-Turn'}</strong> • GPS Accuracy:{' '}
                  <strong className="text-emerald-600 font-bold">±{gpsAccuracy || 5}m</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-600 w-full lg:w-auto justify-between sm:justify-start border-y lg:border-y-0 border-slate-100 py-2 lg:py-0">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Acceptance Rate</span>
                <span className="text-sm font-black text-emerald-600">98% (Tier 1)</span>
              </div>
              <div className="h-6 w-px bg-slate-200"></div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Dispatch Score</span>
                <span className="text-sm font-black text-blue-600">98 / 100</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-600">Auto-Accept:</span>
                <button
                  onClick={() => setAutoAccept(!autoAccept)}
                  className={`w-8 h-4 rounded-full p-0.5 transition flex items-center shadow-inner ${
                    autoAccept ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                  type="button"
                >
                  <span className="w-3 h-3 rounded-full bg-white block shadow-sm"></span>
                </button>
              </div>

              <Link
                to="/worker/bookings"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold border border-blue-700 flex items-center gap-1.5 transition shadow-sm"
              >
                <span>Bookings Queue</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
