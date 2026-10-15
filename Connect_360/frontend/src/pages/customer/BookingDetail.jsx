import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { bookingsService } from '../../services/bookingsService';
import { paymentsService } from '../../services/paymentsService';
import { geocodeAddress } from '../../services/routingService';
import StatusBadge from '../../components/StatusBadge';
import CallButton from '../../components/CallButton';
import ArrivalOtpCard from '../../components/ArrivalOtpCard';
import PayNowButton from '../../components/PayNowButton';
import PaymentStatusBadge from '../../components/PaymentStatusBadge';
import PaymentReceiptModal from '../../components/PaymentReceiptModal';
import RatingModal from '../../components/RatingModal';
import LiveTrackingMap from '../../components/LiveTrackingMap';
import DashboardLayout from '../../components/DashboardLayout';

const TRACK_STATUSES = ['accepted', 'in_progress'];
const reviewedKey = (id) => `c360_reviewed_${id}`;
const PAYABLE = ['accepted', 'in_progress', 'completed'];
const PAID_STATES = ['SUCCESSFUL', 'AUTHORIZED', 'REFUNDED', 'PARTIALLY_REFUNDED'];

const STAGES = [
  { key: 'pending', labelKey: 'bookingDetail.requested' },
  { key: 'accepted', labelKey: 'bookingDetail.accepted' },
  { key: 'in_progress', labelKey: 'bookingDetail.inProgress' },
  { key: 'completed', labelKey: 'bookingDetail.completed' },
];

/**
 * Dedicated single-booking detail + tracking page for SCHEDULED (manual)
 * bookings — the equivalent of the priority tracking page. Shows status
 * progress, worker info, arrival OTP, live GPS map, payment, and details.
 */
export default function BookingDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payment, setPayment] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [workerLocation, setWorkerLocation] = useState(null);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const locationPollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await bookingsService.getById(id);
      const b = res.data.booking || res.data;
      setBooking(b);
      if (b && PAYABLE.includes(b.status) && b.total_amount > 0) {
        try {
          const pr = await paymentsService.getStatus(id);
          setPayment(pr.data);
        } catch { /* non-blocking */ }
      }
    } catch (err) {
      setError(t('bookingDetail.couldNotLoad'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Once completed and not yet reviewed, prompt for a rating (Ola/Uber-style
  // popup). We remember a submitted review locally so it doesn't nag again.
  useEffect(() => {
    if (!booking) return;
    const already = localStorage.getItem(reviewedKey(id)) === '1';
    setReviewed(already);
    if (booking.status === 'completed' && !already) {
      const timer = setTimeout(() => setRatingOpen(true), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [booking?.status, id]);

  function handleReviewed() {
    localStorage.setItem(reviewedKey(id), '1');
    setReviewed(true);
  }

  // Geocode the address for the map.
  useEffect(() => {
    if (!booking?.address) return;
    let cancelled = false;
    (async () => {
      const coords = await geocodeAddress(booking.address);
      if (!cancelled && coords) setCustomerLocation(coords);
    })();
    return () => { cancelled = true; };
  }, [booking?.address]);

  // Poll the worker's live GPS while the job is active.
  useEffect(() => {
    if (!booking || !TRACK_STATUSES.includes(booking.status)) return undefined;
    async function poll() {
      try {
        const res = await bookingsService.getLocation(id);
        const loc = res.data.location || res.data.worker_location;
        if (loc && loc.latitude != null) {
          setWorkerLocation({ lat: loc.latitude, lng: loc.longitude, heading: loc.heading });
        }
      } catch { /* ignore */ }
    }
    poll();
    locationPollRef.current = setInterval(poll, 8000);
    return () => clearInterval(locationPollRef.current);
  }, [booking?.status, id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-container mx-auto p-margin-mobile lg:p-0">
          <div className="h-8 w-48 bg-surface-container-high rounded-lg animate-pulse mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-lg">
            <div className="lg:col-span-5 h-96 bg-surface-container-high rounded-xl animate-pulse" />
            <div className="lg:col-span-7 h-96 bg-surface-container-high rounded-xl animate-pulse" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !booking) {
    return (
      <DashboardLayout>
        <div className="max-w-container mx-auto p-margin-mobile lg:p-0">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-12 text-center shadow-level-1">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">error</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">{t('bookingDetail.bookingNotFound')}</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">{error || t('bookingDetail.bookingUnavailable')}</p>
            <Link to="/customer/bookings" className="btn-primary mt-4 inline-block">{t('bookingDetail.backToMyBookings')}</Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const stageIndex = STAGES.findIndex((s) => s.key === booking.status);
  const isTracking = TRACK_STATUSES.includes(booking.status);
  const payStatus = payment?.payment_status || 'NONE';
  const isPaid = PAID_STATES.includes(payStatus);

  return (
    <DashboardLayout>
      <div className="max-w-container mx-auto p-margin-mobile lg:p-0 flex flex-col gap-stack-lg pb-24 lg:pb-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/customer/bookings" className="w-9 h-9 rounded-lg border border-outline-slate flex items-center justify-center text-on-surface-variant hover:bg-surface-container flex-shrink-0" aria-label={t('bookingDetail.back')}>
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <div className="min-w-0">
              <h1 className="font-manrope text-headline-lg-mobile lg:text-headline-lg text-primary truncate">{booking.service_name}</h1>
              <p className="font-hanken text-body-sm text-on-surface-variant">{t('bookingDetail.bookingNum', { id: String(booking.id).slice(0, 8) })}</p>
            </div>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-lg items-start">
          {/* Left: details */}
          <div className="lg:col-span-5 flex flex-col gap-stack-md">
            {/* Status progress */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-stack-md">
              <div className="flex items-center justify-between mb-2">
                {STAGES.map((s, i) => (
                  <span key={s.key} className={`font-hanken text-label-sm ${i <= stageIndex ? 'text-secondary font-bold' : 'text-on-surface-variant'}`}>
                    {t(s.labelKey)}
                  </span>
                ))}
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                <div
                  className="h-full bg-secondary rounded-full transition-all"
                  style={{ width: `${booking.status === 'cancelled' || booking.status === 'rejected' ? 100 : ((stageIndex + 1) / STAGES.length) * 100}%` }}
                />
              </div>
              {(booking.status === 'cancelled' || booking.status === 'rejected') && (
                <p className="font-hanken text-body-sm text-error mt-2">{t('bookingDetail.wasCancelled', { status: t(`status.${booking.status}`) })}</p>
              )}
            </div>

            {/* Worker card */}
            {booking.worker_name && (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-stack-md flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary">person</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-hanken text-label-md text-on-surface truncate">{booking.worker_name}</h3>
                    <p className="font-hanken text-body-sm text-on-surface-variant">{t('bookingDetail.assignedProfessional')}</p>
                  </div>
                </div>
                {isTracking && (
                  <CallButton bookingId={booking.id} status={booking.status} label={t('bookingDetail.callPro')} />
                )}
              </div>
            )}

            {/* Arrival OTP */}
            {(booking.status === 'accepted' || booking.status === 'in_progress') && (
              <ArrivalOtpCard booking={booking} />
            )}

            {/* Rate the service once completed */}
            {booking.status === 'completed' && (
              <div className="rounded-xl border border-outline-slate bg-surface-container-lowest p-stack-md flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-warning-container text-warning flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  </span>
                  <div>
                    <h3 className="font-manrope text-headline-sm text-primary">
                      {reviewed ? t('bookingDetail.thanksFeedback') : t('bookingDetail.howWasService')}
                    </h3>
                    <p className="font-hanken text-body-sm text-on-surface-variant">
                      {reviewed ? t('bookingDetail.reviewSubmitted') : t('bookingDetail.rateWorker', { name: booking.worker_name || t('bookingDetail.yourProfessional') })}
                    </p>
                  </div>
                </div>
                {!reviewed && (
                  <button onClick={() => setRatingOpen(true)} className="btn-primary !py-2 !px-4 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">rate_review</span>
                    {t('bookingDetail.rate')}
                  </button>
                )}
              </div>
            )}

            {/* Payment */}
            {PAYABLE.includes(booking.status) && booking.total_amount > 0 && (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-stack-md flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <PaymentStatusBadge status={payStatus} />
                  <span className="font-manrope text-headline-sm text-primary">₹{booking.total_amount}</span>
                </div>
                {isPaid && payment?.payment ? (
                  <button onClick={() => setReceiptOpen(true)} className="btn-secondary !py-2 !px-4 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                    {t('bookingDetail.receipt')}
                  </button>
                ) : (
                  <PayNowButton booking={booking} label={payStatus === 'FAILED' ? t('booking.retryPayment') : t('booking.payNow')} onPaid={load} />
                )}
              </div>
            )}

            {/* Details */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-stack-md flex flex-col gap-3">
              <Detail icon="event" label={t('bookingDetail.scheduled')} value={`${booking.scheduled_date || '—'}${booking.scheduled_time ? ` · ${booking.scheduled_time}` : ''}`} />
              {booking.address && <Detail icon="location_on" label={t('bookingDetail.location')} value={booking.address} />}
              {booking.notes && <Detail icon="sticky_note_2" label={t('bookingDetail.notes')} value={booking.notes} />}
            </div>
          </div>

          {/* Right: live map (only while tracking) */}
          <div className="lg:col-span-7">
            {isTracking ? (
              <div className="relative h-[480px] lg:h-[560px] bg-surface-container rounded-xl border border-outline-slate overflow-hidden">
                {customerLocation ? (
                  <LiveTrackingMap
                    workerLocation={workerLocation}
                    customerLocation={customerLocation}
                    workerName={booking.worker_name || t('bookingDetail.specialist')}
                    customerLabel={t('bookingDetail.serviceLocation')}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant gap-2">
                    <span className="w-8 h-8 rounded-full border-2 border-secondary/30 border-t-secondary animate-spin motion-reduce:animate-none" />
                    <p className="font-hanken text-body-sm">{t('bookingDetail.resolvingLocation')}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[480px] lg:h-[560px] bg-surface-container-lowest rounded-xl border border-outline-slate flex flex-col items-center justify-center text-center p-8">
                <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">map</span>
                <h3 className="font-manrope text-headline-sm text-on-surface mb-1">{t('bookingDetail.liveTracking')}</h3>
                <p className="font-hanken text-body-md text-on-surface-variant max-w-sm">
                  {booking.status === 'pending'
                    ? t('bookingDetail.trackingPending')
                    : booking.status === 'completed'
                      ? t('bookingDetail.trackingCompleted')
                      : t('bookingDetail.trackingUnavailable')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <PaymentReceiptModal
        open={receiptOpen}
        booking={booking}
        payment={payment?.payment}
        onClose={() => setReceiptOpen(false)}
      />

      <RatingModal
        open={ratingOpen}
        booking={booking}
        onClose={() => setRatingOpen(false)}
        onSubmitted={handleReviewed}
      />
    </DashboardLayout>
  );
}

function Detail({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-on-surface-variant text-[20px] mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="font-hanken text-label-sm text-on-surface-variant">{label}</p>
        <p className="font-hanken text-body-sm text-on-surface font-medium break-words">{value}</p>
      </div>
    </div>
  );
}
