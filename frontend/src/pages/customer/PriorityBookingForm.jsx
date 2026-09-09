import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { servicesService } from '../../services/servicesService';
import { priorityService } from '../../services/priorityService';
import { useAuth } from '../../context/AuthContext';

export default function PriorityBookingForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form selections
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [bookingMode, setBookingMode] = useState('priority'); // 'priority' | 'standard'
  const [address, setAddress] = useState('1204 E Pine St, Capitol Hill, Seattle');
  const [editingAddress, setEditingAddress] = useState(false);
  const [notes, setNotes] = useState('Circuit breaker tripping & power outage in workspace.');
  const [editingNotes, setEditingNotes] = useState(false);

  // Payment & Promo state
  const [paymentMethod, setPaymentMethod] = useState('visa'); // 'visa' | 'upi' | 'cash'
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  // Map Controls State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [mapCenter, setMapCenter] = useState({ x: 0, y: 0 });

  useEffect(() => {
    servicesService
      .list()
      .then((res) => {
        const list = res.data.services || [];
        setServices(list);
        if (list.length > 0) {
          const electrical = list.find((s) => s.name.toLowerCase().includes('electric'));
          setSelectedServiceId(electrical ? electrical.id : list[0].id);
        }
      })
      .catch((err) => console.error('Failed to load services:', err))
      .finally(() => setLoading(false));

    if (user?.city) {
      setAddress((prev) => (prev.includes(user.city) ? prev : `1204 E Pine St, ${user.city}`));
    }
  }, [user]);

  const selectedService = services.find((s) => s.id === selectedServiceId) || {
    name: 'Electrical Emergency',
    description: 'Electrical Short Circuit & Fuse Box Tripping',
  };

  // Dynamic Pricing Calculation
  const baseFare = 110;
  const expressSurge = bookingMode === 'priority' ? 30 : 0;
  const discount = promoApplied ? 15 : 0;
  const totalAmount = Math.max(0, baseFare + expressSurge - discount);

  function handleApplyPromo() {
    if (promoCode.trim().toUpperCase() === 'CONNECT15' || promoCode.trim().toUpperCase() === 'PRIORITY') {
      setPromoApplied(true);
      setPromoError('');
    } else {
      setPromoError('Invalid voucher code. Try CONNECT15');
    }
  }

  async function handleConfirmBooking() {
    setError('');
    if (!selectedServiceId) {
      setError('Please select a service.');
      return;
    }
    if (!address.trim()) {
      setError('Please provide a service location.');
      return;
    }

    if (bookingMode === 'standard') {
      navigate('/customer/workers');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        service_id: selectedServiceId,
        service_name: selectedService.name,
        urgency: 'asap',
        scheduled_date: new Date().toISOString().slice(0, 10),
        scheduled_time: '10:00',
        address: address.trim(),
        city: user?.city || 'Seattle',
        budget_min: 100,
        budget_max: totalAmount + 50,
        special_requirements: notes.trim(),
        notes: notes.trim(),
        total_amount: totalAmount,
        payment_method: paymentMethod,
      };

      const res = await priorityService.create(payload);
      const bookingId = res.data.booking_id;
      navigate('/customer/priority', { state: { focusId: bookingId } });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to dispatch priority request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface text-on-surface font-sans selection:bg-secondary selection:text-white">
      {/* TopBarHeader */}
      <header className="h-16 bg-white border-b border-outline-slate px-6 flex items-center justify-between shrink-0 z-30 select-none">
        <div className="flex items-center gap-6">
          <Link to="/customer/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm shadow-blue-500/20">
              ⚡
            </div>
            <span className="text-slate-900 font-extrabold tracking-tight text-lg">
              Connect<span className="text-blue-600">360</span>
            </span>
          </Link>
          <div className="h-5 w-px bg-outline-slate hidden sm:block"></div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
            <span className="text-slate-700">{selectedService?.name || 'Service'}</span>
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">Priority Dispatch</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-outline-slate bg-white shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>24/7 Priority Dispatch</span>
          </div>
          <div className="h-6 w-px bg-outline-slate hidden lg:block"></div>
          <Link to="/customer/profile" className="flex items-center gap-2.5 pl-1">
            <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-bold ring-2 ring-blue-100">
              {user?.fullName ? user.fullName.slice(0, 2).toUpperCase() : 'CU'}
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                {user?.fullName || 'Customer'}
                <svg className="w-3.5 h-3.5 text-blue-600 inline" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <span className="text-[11px] text-on-surface-variant font-medium">Verified Account</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Uber/Ola Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT COLUMN: Booking Sheet */}
        <aside className="w-full md:w-[440px] bg-white border-r border-outline-slate flex flex-col justify-between shrink-0 z-20 shadow-lg shadow-slate-900/5 overflow-hidden">
          {/* Scrollable Options Area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
            {/* Header / Step Title */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Select service mode</h1>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {selectedService?.name || 'Emergency'} • Ready to dispatch
                </p>
              </div>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> 6 Pros Near
              </span>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Address & Service Route Box */}
            <div className="bg-surface-container-low border border-outline-slate rounded-2xl p-3.5 space-y-2.5">
              {/* Pickup Location */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center justify-center pt-1">
                  <span className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-100 shrink-0"></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service Location</div>
                  {editingAddress ? (
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="text-xs p-1.5 border border-blue-600 rounded-lg w-full bg-white text-slate-900"
                        autoFocus
                      />
                      <button
                        onClick={() => setEditingAddress(false)}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded-md font-bold"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-slate-900 truncate">{address}</div>
                  )}
                </div>
                {!editingAddress && (
                  <button
                    onClick={() => setEditingAddress(true)}
                    className="text-blue-600 hover:text-blue-700 text-xs font-bold px-2 py-0.5 rounded hover:bg-blue-50 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>

              {/* Connecting line */}
              <div className="flex items-center gap-3 py-0">
                <div className="w-3 flex justify-center">
                  <div className="w-0.5 h-4 bg-slate-300"></div>
                </div>
                <div className="flex-1 border-t border-outline-slate"></div>
              </div>

              {/* Task / Service Selector */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-3.5 h-3.5 bg-primary-container rounded-sm shrink-0 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service Category</div>
                  {loading ? (
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-32 mt-0.5"></div>
                  ) : (
                    <select
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      className="text-xs font-bold text-slate-900 bg-transparent border-none p-0 focus:ring-0 cursor-pointer w-full"
                    >
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  Urgent
                </span>
              </div>
            </div>

            {/* Live Requirement Note */}
            <div className="bg-slate-50 border border-outline-slate rounded-xl p-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                <span>Notes / Issue Details</span>
                <button
                  onClick={() => setEditingNotes(!editingNotes)}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  {editingNotes ? 'Save' : 'Edit Note'}
                </button>
              </div>
              {editingNotes ? (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                  rows={2}
                />
              ) : (
                <p className="text-xs text-slate-700 font-medium italic">"{notes}"</p>
              )}
            </div>

            {/* Section Label */}
            <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider pt-1">
              Available Service Types
            </div>

            {/* Mode Selection Cards */}
            <div className="space-y-2.5">
              {/* Option 1: Priority Auto-Match */}
              <div
                onClick={() => setBookingMode('priority')}
                className={`relative cursor-pointer rounded-2xl p-3.5 transition-all shadow-sm flex items-center justify-between gap-3 group ${
                  bookingMode === 'priority'
                    ? 'border-2 border-blue-600 bg-blue-50/40 hover:bg-blue-50/60 ring-2 ring-blue-500/10'
                    : 'border border-outline-slate bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl shrink-0 shadow-md shadow-blue-500/25">
                    ⚡
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">Priority Auto-Match</span>
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wide">
                        Fastest
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5 font-medium">
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>4 mins away
                      </span>
                      <span>•</span>
                      <span className="text-slate-700 font-semibold">Top 4.9★ Pro</span>
                    </div>
                    <div className="text-[11px] text-on-surface-variant mt-0.5">Instant Pro lock • Arrival SLA ≤45 min</div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg font-black text-slate-900">${baseFare + expressSurge}</div>
                  <div className="text-[10px] text-slate-400 line-through">${baseFare + expressSurge + 15}</div>
                  <div className="mt-1 flex justify-end">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        bookingMode === 'priority' ? 'bg-blue-600 text-white' : 'border-2 border-slate-300'
                      }`}
                    >
                      {bookingMode === 'priority' && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                        </svg>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Option 2: Standard Manual Slot */}
              <div
                onClick={() => setBookingMode('standard')}
                className={`cursor-pointer rounded-2xl p-3.5 transition-all flex items-center justify-between gap-3 text-slate-900 ${
                  bookingMode === 'standard'
                    ? 'border-2 border-blue-600 bg-blue-50/30 ring-2 ring-blue-500/10'
                    : 'border border-outline-slate bg-white hover:border-slate-300 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-low border border-outline-slate flex items-center justify-center text-xl text-slate-700 shrink-0">
                    📅
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">Standard Schedule</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                      <span>Choose custom time slot</span>
                    </div>
                    <div className="text-[11px] text-on-surface-variant mt-0.5">Browse profiles & pick manually</div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg font-extrabold text-slate-800">${baseFare}</div>
                  <div className="text-[10px] text-slate-400">Regular fee</div>
                  <div className="mt-1 flex justify-end">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        bookingMode === 'standard' ? 'bg-blue-600 text-white' : 'border-2 border-slate-300'
                      }`}
                    >
                      {bookingMode === 'standard' && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                        </svg>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment & Promo Selector */}
            <div className="pt-2 border-t border-outline-slate space-y-2">
              {/* Payment Method Row */}
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-outline-slate hover:border-slate-300 bg-white hover:bg-slate-50/70 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-6 bg-primary-container text-white rounded flex items-center justify-center text-[10px] font-black tracking-wider uppercase shadow-xs">
                    {paymentMethod === 'visa' ? 'VISA' : paymentMethod === 'upi' ? 'UPI' : 'CASH'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {paymentMethod === 'visa'
                        ? 'Visa •••• 4242'
                        : paymentMethod === 'upi'
                        ? 'UPI • instant@bank'
                        : 'Cash on Completion'}
                    </div>
                    <div className="text-[10px] text-on-surface-variant">Default verified payment method</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-slate-400 group-hover:text-blue-600 text-xs font-bold">
                  <span>Change</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
              </button>

              {/* Promo Code Row */}
              {promoApplied ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓ Coupon CONNECT15 Applied</span>
                  </div>
                  <span className="font-extrabold text-emerald-700">-$15.00</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Add Promo Code (Try CONNECT15)"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="w-full pl-3 pr-16 py-2 text-xs font-medium rounded-xl border border-dashed border-outline-slate bg-surface-container-lowest focus:outline-none focus:border-blue-600 uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-extrabold text-blue-600 hover:text-blue-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
              {promoError && <p className="text-[11px] text-red-600 font-medium">{promoError}</p>}
            </div>

            {/* Price Breakdown */}
            <div className="bg-surface-container-low rounded-xl p-3 border border-outline-slate space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Standard Base Service</span>
                <span>${baseFare}.00</span>
              </div>
              {bookingMode === 'priority' && (
                <div className="flex justify-between text-amber-700 font-semibold">
                  <span>Express Priority Dispatch Fee</span>
                  <span>+${expressSurge}.00</span>
                </div>
              )}
              {promoApplied && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Promo Voucher Discount</span>
                  <span>-${discount}.00</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-slate-900 text-sm">
                <span>Estimated Total</span>
                <span>${totalAmount}.00</span>
              </div>
            </div>

            {/* Cancellation & SLA Guarantee snippet */}
            <div className="flex items-center justify-between text-[11px] text-on-surface-variant bg-surface-container-low px-3 py-2 rounded-xl border border-outline-slate">
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                Arrives in ≤45 min or fee refunded
              </span>
              <span className="text-slate-500 font-medium">Free cancel in 3m</span>
            </div>
          </div>

          {/* Bottom Sticky Action Bar */}
          <div className="p-4 border-t border-outline-slate bg-white shadow-lg">
            <button
              onClick={handleConfirmBooking}
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-extrabold py-3.5 px-6 rounded-xl text-sm transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35 flex items-center justify-between group cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span>{submitting ? 'Dispatching Pro...' : 'Confirm Priority Booking'}</span>
                {!submitting && <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-ping"></span>}
              </span>
              <span className="flex items-center gap-1.5 text-base font-bold">
                <span>${totalAmount}.00</span>
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                </svg>
              </span>
            </button>
          </div>
        </aside>

        {/* RIGHT COLUMN: Modern Clean Light-Theme Telemetry Map */}
        <main className="flex-1 relative bg-[#f1f4f9] overflow-hidden select-none">
          {/* Stylized Realistic Light Vector Map Canvas */}
          <svg
            className="w-full h-full object-cover absolute inset-0 transition-transform duration-300"
            style={{ transform: `scale(${zoomLevel}) translate(${mapCenter.x}px, ${mapCenter.y}px)` }}
            preserveAspectRatio="xMidYMid slice"
            viewBox="0 0 1200 800"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="lightWaterGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#dbeafe" />
                <stop offset="100%" stopColor="#bfdbfe" />
              </linearGradient>
              <linearGradient id="lightParkGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#dcfce7" />
                <stop offset="100%" stopColor="#bbf7d0" />
              </linearGradient>
            </defs>

            {/* Base Canvas Ground */}
            <rect fill="#f8fafc" height="100%" width="100%" />

            {/* Water Body Edge */}
            <path d="M0,0 L240,0 C220,150 180,260 110,380 C60,470 30,550 0,620 Z" fill="url(#lightWaterGrad)" />
            <path d="M1020,0 C1060,110 1120,220 1200,310 L1200,0 Z" fill="url(#lightWaterGrad)" />

            {/* Soft Green Zones / Parks */}
            <path d="M520,70 Q620,60 670,120 Q690,190 620,230 Q540,240 500,180 Z" fill="url(#lightParkGrad)" />
            <path d="M680,480 Q780,460 810,540 Q800,630 710,650 Q630,620 650,530 Z" fill="url(#lightParkGrad)" />
            <path d="M260,600 Q330,580 360,650 Q340,720 270,710 Z" fill="url(#lightParkGrad)" />

            {/* City Blocks */}
            <g fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5">
              <rect height="70" rx="8" width="90" x="320" y="100" />
              <rect height="60" rx="8" width="110" x="430" y="100" />
              <rect height="80" rx="8" width="90" x="320" y="190" />
              <rect height="80" rx="8" width="110" x="430" y="190" />
              <rect height="90" rx="8" width="120" x="560" y="270" />
              <rect height="90" rx="8" width="100" x="700" y="270" />
              <rect height="85" rx="8" width="120" x="560" y="380" />
              <rect height="85" rx="8" width="100" x="700" y="380" />
              <rect height="75" rx="8" width="130" x="390" y="380" />
              <rect height="75" rx="8" width="130" x="390" y="475" />
              <rect height="75" rx="8" width="90" x="280" y="380" />
              <rect height="75" rx="8" width="90" x="280" y="475" />
              <rect height="85" rx="8" width="140" x="830" y="250" />
              <rect height="95" rx="8" width="140" x="830" y="355" />
              <rect height="80" rx="8" width="110" x="830" y="470" />
            </g>

            {/* Secondary Arteries / Streets */}
            <g fill="none" stroke="#eef2f6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="10">
              <line x1="220" x2="1100" y1="90" y2="90" />
              <line x1="220" x2="1100" y1="180" y2="180" />
              <line x1="240" x2="1150" y1="260" y2="260" />
              <line x1="240" x2="1150" y1="370" y2="370" />
              <line x1="240" x2="1150" y1="470" y2="470" />
              <line x1="240" x2="1150" y1="570" y2="570" />
              <line x1="240" x2="1150" y1="670" y2="670" />

              <line x1="310" x2="310" y1="40" y2="760" />
              <line x1="420" x2="420" y1="40" y2="760" />
              <line x1="550" x2="550" y1="40" y2="760" />
              <line x1="690" x2="690" y1="40" y2="760" />
              <line x1="820" x2="820" y1="40" y2="760" />
              <line x1="980" x2="980" y1="40" y2="760" />
            </g>

            {/* Major Highway / Corridor */}
            <path d="M190,0 Q260,300 240,500 T300,800" fill="none" stroke="#fde68a" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12" />
            <path d="M190,0 Q260,300 240,500 T300,800" fill="none" stroke="#ffffff" strokeDasharray="8 6" strokeLinecap="round" strokeWidth="2.5" />

            {/* Active Auto-Dispatch ETA Route Polyline */}
            <path d="M690,190 L690,260 L550,260 L550,370 L530,370" fill="none" stroke="#2563eb" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8" />
            <path d="M690,190 L690,260 L550,260 L550,370 L530,370" fill="none" stroke="#ffffff" strokeDasharray="6 6" strokeLinecap="round" strokeWidth="2.5" />

            {/* Street Labels */}
            <text fill="#94a3b8" fontFamily="Manrope, sans-serif" fontSize="10" fontWeight="700" letterSpacing="1" x="555" y="85">E MERCER ST</text>
            <text fill="#94a3b8" fontFamily="Manrope, sans-serif" fontSize="10" fontWeight="700" letterSpacing="1" x="560" y="255">E OLIVE WAY</text>
            <text fill="#64748b" fontFamily="Manrope, sans-serif" fontSize="10" fontWeight="800" letterSpacing="1" x="560" y="365">E PINE ST (PICKUP)</text>
            <text fill="#94a3b8" fontFamily="Manrope, sans-serif" fontSize="10" fontWeight="700" letterSpacing="1" x="560" y="465">E PIKE ST</text>
            <text fill="#94a3b8" fontFamily="Manrope, sans-serif" fontSize="10" fontWeight="700" letterSpacing="1" transform="rotate(90 685,300)" x="685" y="315">BROADWAY AVE E</text>
          </svg>

          {/* Top Center Floating Live Radar Status Pill */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border border-outline-slate shadow-lg shadow-slate-900/5 flex items-center gap-3 z-10">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-800 tracking-tight">
              6 Certified {selectedService?.name || 'Pros'} Active in Capitol Hill
            </span>
            <span className="text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
              Radar ON
            </span>
          </div>

          {/* Floating Map Zoom & Recenter Controls */}
          <div className="absolute top-5 right-5 flex flex-col gap-2 z-10">
            <div className="bg-white rounded-xl border border-outline-slate shadow-md overflow-hidden flex flex-col">
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 1.8))}
                className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-50 border-b border-outline-slate text-lg font-bold"
                title="Zoom In"
              >
                +
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.8))}
                className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-50 text-lg font-bold"
                title="Zoom Out"
              >
                −
              </button>
            </div>
            <button
              onClick={() => {
                setZoomLevel(1);
                setMapCenter({ x: 0, y: 0 });
              }}
              className="w-10 h-10 bg-white rounded-xl border border-outline-slate shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors"
              title="Recenter to my location"
            >
              <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" strokeWidth="2" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </button>
          </div>

          {/* MAP MARKERS / PINS & ETA TOOLTIPS */}
          {/* Marker 1: USER PICKUP PIN */}
          <div className="absolute top-[46%] left-[44%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
            <div className="bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>{address.split(',')[0]}</span>
              <span className="text-slate-400 text-[10px] font-normal">• You</span>
            </div>
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg ring-4 ring-blue-200">
                <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
              </div>
              <div className="absolute w-14 h-14 rounded-full bg-blue-500/20 animate-radar-pulse pointer-events-none"></div>
            </div>
          </div>

          {/* Marker 2: AUTO-MATCHED FASTEST PRO */}
          <div className="absolute top-[24%] left-[57%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center cursor-pointer group">
            <div className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-md flex items-center gap-1.5 whitespace-nowrap mb-1 group-hover:scale-105 transition-transform">
              <span>⚡ 4 min</span>
              <span className="bg-blue-800 text-[10px] font-bold px-1.5 rounded">Fastest</span>
            </div>
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-white border-2 border-blue-600 shadow-xl flex items-center justify-center text-lg">
                🚐
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-bold text-white">
                ✓
              </span>
            </div>
            <div className="bg-white/95 backdrop-blur-sm border border-outline-slate text-[10px] font-bold text-slate-800 px-2 py-0.5 rounded-md shadow-xs mt-1">
              David C. (4.98★)
            </div>
          </div>

          {/* Marker 3: Nearby Pro 2 */}
          <div className="absolute top-[34%] left-[70%] -translate-x-1/2 -translate-y-1/2 z-0 flex flex-col items-center cursor-pointer group opacity-90 hover:opacity-100">
            <div className="bg-slate-800 text-white text-[11px] font-bold px-2 py-0.5 rounded-lg shadow-sm mb-1">
              7 min
            </div>
            <div className="w-8 h-8 rounded-xl bg-white border border-outline-slate shadow-md flex items-center justify-center text-sm">
              🚗
            </div>
            <div className="text-[9px] font-semibold text-slate-600 bg-white/90 border border-slate-200 px-1.5 py-0.2 rounded mt-0.5">
              Marcus (4.9★)
            </div>
          </div>

          {/* Marker 4: Nearby Pro 3 */}
          <div className="absolute top-[68%] left-[38%] -translate-x-1/2 -translate-y-1/2 z-0 flex flex-col items-center cursor-pointer group opacity-90 hover:opacity-100">
            <div className="bg-slate-800 text-white text-[11px] font-bold px-2 py-0.5 rounded-lg shadow-sm mb-1">
              9 min
            </div>
            <div className="w-8 h-8 rounded-xl bg-white border border-outline-slate shadow-md flex items-center justify-center text-sm">
              🚐
            </div>
            <div className="text-[9px] font-semibold text-slate-600 bg-white/90 border border-slate-200 px-1.5 py-0.2 rounded mt-0.5">
              Elena (4.95★)
            </div>
          </div>

          {/* Marker 5: Nearby Pro 4 */}
          <div className="absolute top-[60%] left-[62%] -translate-x-1/2 -translate-y-1/2 z-0 flex flex-col items-center cursor-pointer opacity-75 hover:opacity-100">
            <div className="bg-slate-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg shadow-sm mb-1">
              12 min
            </div>
            <div className="w-7 h-7 rounded-lg bg-white border border-outline-slate shadow-sm flex items-center justify-center text-xs">
              🚗
            </div>
          </div>

          {/* Bottom Floating Legend / SLA Notice */}
          <div className="absolute bottom-5 left-6 right-6 md:left-8 md:right-auto bg-white/95 backdrop-blur-md border border-outline-slate rounded-2xl p-3 px-4 shadow-lg shadow-slate-900/5 flex items-center gap-4 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span className="text-xs font-bold text-slate-900">Priority Route Active</span>
            </div>
            <div className="h-3 w-px bg-outline-slate"></div>
            <div className="text-xs text-on-surface-variant flex items-center gap-1.5 font-medium">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              </svg>
              Locking pro reserves ETA immediately
            </div>
          </div>
        </main>
      </div>

      {/* Payment Selection Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-outline-slate space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Select Payment Method</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-700 text-lg">
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {[
                { id: 'visa', label: 'Visa •••• 4242', sub: 'Default • Personal', icon: 'VISA' },
                { id: 'upi', label: 'UPI / Google Pay', sub: 'Instant bank transfer', icon: 'UPI' },
                { id: 'cash', label: 'Cash on Completion', sub: 'Pay directly after inspection', icon: 'CASH' },
              ].map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    setPaymentMethod(m.id);
                    setShowPaymentModal(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === m.id ? 'border-blue-600 bg-blue-50/50' : 'border-outline-slate hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-6 bg-slate-900 text-white rounded text-[10px] font-black flex items-center justify-center">
                      {m.icon}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{m.label}</div>
                      <div className="text-[10px] text-slate-500">{m.sub}</div>
                    </div>
                  </div>
                  {paymentMethod === m.id && <span className="text-blue-600 font-extrabold text-sm">✓</span>}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
            >
              Confirm Method
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
