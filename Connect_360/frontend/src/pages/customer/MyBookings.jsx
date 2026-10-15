import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { bookingsService } from '../../services/bookingsService';
import { paymentsService } from '../../services/paymentsService';
import StatusBadge from '../../components/StatusBadge';
import CallButton from '../../components/CallButton';
import PayNowButton from '../../components/PayNowButton';
import PaymentStatusBadge from '../../components/PaymentStatusBadge';
import PaymentReceiptModal from '../../components/PaymentReceiptModal';
import RatingModal from '../../components/RatingModal';
import DashboardLayout from '../../components/DashboardLayout';

const PAYABLE = ['accepted', 'in_progress', 'completed'];
// Payment states where a stored payment record exists and is terminal-ish.
const PAID_STATES = ['SUCCESSFUL', 'AUTHORIZED', 'REFUNDED', 'PARTIALLY_REFUNDED'];

export default function MyBookings() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [payments, setPayments] = useState({}); // bookingId -> payment status obj
  const [receipt, setReceipt] = useState(null); // { booking, payment } for modal
  const [rateBooking, setRateBooking] = useState(null); // booking to review
  const [reviewed, setReviewed] = useState(() => new Set());

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      const res = await bookingsService.listMine();
      const list = res.data.bookings || [];
      setBookings(list);
      loadPayments(list);
      // Seed which completed bookings were already reviewed (local record).
      const done = new Set();
      list.forEach((b) => {
        const id = b.booking_id || b.id;
        if (localStorage.getItem(`c360_reviewed_${id}`) === '1') done.add(id);
      });
      setReviewed(done);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleReviewed(bookingId) {
    localStorage.setItem(`c360_reviewed_${bookingId}`, '1');
    setReviewed((prev) => new Set(prev).add(bookingId));
  }

  async function loadPayments(list) {
    // Fetch payment status only for payable bookings.
    const payable = list.filter((b) => PAYABLE.includes(b.status));
    const results = await Promise.all(
      payable.map(async (b) => {
        const id = b.booking_id || b.id;
        try {
          const r = await paymentsService.getStatus(id);
          return [id, r.data];
        } catch {
          return [id, null];
        }
      })
    );
    setPayments((prev) => ({ ...prev, ...Object.fromEntries(results) }));
  }

  function paymentFor(booking) {
    const id = booking.booking_id || booking.id;
    return payments[id];
  }

  // Visual theme for the payment row tile, driven by real payment status.
  function payTheme(status) {
    switch (status) {
      case 'SUCCESSFUL':
        return { wrap: 'bg-success-container/30 border-success/30', tile: 'bg-success-container text-success', icon: 'check_circle' };
      case 'AUTHORIZED':
        return { wrap: 'bg-secondary-container/20 border-secondary/30', tile: 'bg-secondary-container text-on-secondary', icon: 'lock_clock' };
      case 'FAILED':
        return { wrap: 'bg-error-container/30 border-error/30', tile: 'bg-error-container text-error', icon: 'error' };
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED':
        return { wrap: 'bg-surface-container-low border-outline-variant', tile: 'bg-surface-container-high text-on-surface-variant', icon: 'undo' };
      case 'PENDING':
        return { wrap: 'bg-warning-container/30 border-warning/30', tile: 'bg-warning-container text-warning', icon: 'hourglass_top' };
      default: // NONE / unpaid
        return { wrap: 'bg-warning-container/20 border-warning/30', tile: 'bg-warning-container text-warning', icon: 'account_balance_wallet' };
    }
  }

  /**
   * Enhanced payment row for a booking card. Presentation only — amount comes
   * from the booking's trusted total; status/action come from the real payment
   * record. Kept visually separate from the booking status.
   */
  function renderPaymentRow(booking) {
    if (!PAYABLE.includes(booking.status) || !(booking.total_amount > 0)) return null;
    const pay = paymentFor(booking);
    const status = pay?.payment_status || 'NONE';
    const paymentObj = pay?.payment;
    const theme = payTheme(status);
    const isPaid = PAID_STATES.includes(status);

    return (
      <div className={`mt-2 pt-4 border-t border-outline-slate/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${theme.wrap}`}>
        <div className="flex items-start gap-3 min-w-0">
          <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${theme.tile}`}>
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{theme.icon}</span>
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-hanken text-label-sm uppercase tracking-wider text-on-surface-variant">{t('myBookings.payment')}</span>
              <PaymentStatusBadge status={status} />
            </div>
            <p className="font-manrope text-headline-sm text-primary mt-1">₹{booking.total_amount}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
          {isPaid && paymentObj && (
            <button
              onClick={() => setReceipt({ booking, payment: paymentObj })}
              className="btn-secondary !py-2 !px-4 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              {t('myBookings.viewReceipt')}
            </button>
          )}
          {(status === 'NONE' || status === 'PENDING' || status === 'FAILED') && (
            <PayNowButton
              booking={booking}
              label={status === 'FAILED' ? t('booking.retryPayment') : t('booking.payNow')}
              onPaid={() => loadPayments([booking])}
            />
          )}
        </div>
      </div>
    );
  }

  const filtered = filter ? bookings.filter((b) => b.status === filter) : bookings;
  const statuses = ['', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'];

  // Desktop tabs group statuses semantically
  const desktopTabs = [
    { key: '', label: t('myBookings.all') },
    { key: 'upcoming', label: t('myBookings.upcoming') },
    { key: 'completed', label: t('myBookings.completed') },
    { key: 'cancelled', label: t('myBookings.cancelled') },
  ];
  const [desktopTab, setDesktopTab] = useState('');

  const desktopFiltered = bookings.filter((b) => {
    if (desktopTab === '') return true;
    if (desktopTab === 'upcoming') return ['pending', 'accepted', 'in_progress'].includes(b.status);
    if (desktopTab === 'completed') return b.status === 'completed';
    if (desktopTab === 'cancelled') return b.status === 'cancelled' || b.status === 'rejected';
    return true;
  });

  return (
    <DashboardLayout>
      {/* ============================================================= */}
      {/* MOBILE / TABLET VIEW (unchanged, below lg)                     */}
      {/* ============================================================= */}
      <div className="lg:hidden pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24">
        <section className="flex flex-col gap-stack-sm">
          <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">{t('booking.myBookingsTitle')}</h1>
          <p className="font-hanken text-body-md text-on-surface-variant">{t('myBookings.totalBookings', { count: bookings.length })}</p>
        </section>

        <div className="flex overflow-x-auto no-scrollbar gap-2 -mx-margin-mobile px-margin-mobile md:mx-0 md:px-0">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex-none px-4 py-2 rounded-full font-hanken text-body-sm border transition-all whitespace-nowrap capitalize ${
                filter === s
                  ? 'bg-primary-container text-on-primary border-primary-container'
                  : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              {s ? t(`status.${s}`) : t('myBookings.all')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-stack-md">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-surface-container-high rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="flex flex-col gap-stack-md">
            {filtered.map((booking) => (
              <div key={booking.booking_id || booking.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-level-1 flex flex-col gap-4">
               <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-manrope text-headline-sm text-on-surface">{booking.service_name}</h3>
                    {booking.booking_type === 'priority' && (
                      <span className="badge badge-priority">
                        <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                        {t('myBookings.priority')}
                      </span>
                    )}
                    <StatusBadge status={booking.status} />
                    {booking.overdue_flag && !['completed', 'cancelled', 'rejected'].includes(booking.status) && (
                      <span className="badge badge-rejected">
                        <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                        {t('myBookings.overdue')}
                      </span>
                    )}
                  </div>
                  <p className="font-hanken text-body-sm text-on-surface-variant mt-1">
                    {booking.worker_name && `${t('myBookings.with', { name: booking.worker_name })} · `}
                    {booking.scheduled_date} {booking.scheduled_time && `${t('booking.time')}: ${booking.scheduled_time}`}
                  </p>
                  {booking.total_amount > 0 && <p className="font-hanken text-label-md text-primary mt-2">₹{booking.total_amount}</p>}
                </div>
                <div className="flex flex-col sm:flex-row md:flex-col gap-2 md:min-w-[180px]">
                  <CallButton bookingId={booking.booking_id || booking.id} status={booking.status} label={t('myBookings.callTechnician')} />
                  {booking.status === 'completed' && !reviewed.has(booking.booking_id || booking.id) && (
                    <button onClick={() => setRateBooking(booking)} className="btn-primary !py-2 !px-4 flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <span className="material-symbols-outlined text-[16px]">star</span>
                      {t('booking.rateService')}
                    </button>
                  )}
                  {['accepted', 'in_progress'].includes(booking.status) ? (
                    <Link to={`/customer/bookings/${booking.booking_id || booking.id}`} className="btn-secondary !py-2 !px-4 text-center whitespace-nowrap">{t('booking.viewAndTrack')}</Link>
                  ) : (
                    <Link to={`/customer/bookings/${booking.booking_id || booking.id}`} className="btn-secondary !py-2 !px-4 text-center whitespace-nowrap">{t('common.viewDetails')}</Link>
                  )}
                </div>
               </div>
               {renderPaymentRow(booking)}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-12 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">event_busy</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">{t('booking.noBookings')}</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">{filter ? t('myBookings.noFilterBookings', { filter: t(`status.${filter}`) }) : t('booking.startBooking')}</p>
            <Link to="/customer/workers" className="btn-primary mt-4 inline-block">{t('myBookings.findWorkers')}</Link>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* DESKTOP VIEW (lg and up) — matches uploaded design             */}
      {/* ============================================================= */}
      <div className="hidden lg:flex lg:flex-col gap-stack-lg">
        {/* Header */}
        <div>
          <h2 className="font-manrope text-headline-lg text-on-surface mb-2">{t('booking.myBookingsTitle')}</h2>
          <p className="font-hanken text-body-md text-on-surface-variant">{t('myBookings.manageSubtitle')}</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-outline-slate">
          <nav className="flex gap-8">
            {desktopTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setDesktopTab(tab.key)}
                className={`border-b-2 py-4 px-1 font-hanken text-label-md transition-colors ${
                  desktopTab === tab.key ? 'border-secondary text-primary font-bold' : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-stack-md">
            {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-surface-container-high rounded-xl animate-pulse" />)}
          </div>
        ) : desktopFiltered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-stack-md">
            {desktopFiltered.map((booking) => {
              const canCall = booking.status === 'accepted' || booking.status === 'in_progress';
              return (
                <div key={booking.booking_id || booking.id} className="bg-surface-container-lowest border border-outline-slate rounded-xl p-stack-md hover:shadow-level-1 transition-shadow flex flex-col h-full relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-surface-container rounded-bl-full -z-10 opacity-50 group-hover:scale-110 transition-transform" />
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {booking.booking_type === 'priority' && (
                        <span className="badge badge-priority">
                          <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                          Priority
                        </span>
                      )}
                      <StatusBadge status={booking.status} />
                      {booking.overdue_flag && !['completed', 'cancelled', 'rejected'].includes(booking.status) && (
                        <span className="badge badge-rejected">
                          <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                          {t('myBookings.overdue')}
                        </span>
                      )}
                    </div>
                    {booking.total_amount > 0 && <span className="font-manrope text-headline-sm text-on-surface">₹{booking.total_amount}</span>}
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-slate flex-shrink-0">
                      <span className="material-symbols-outlined text-primary">person</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-hanken text-label-md text-on-surface truncate">{booking.worker_name || t('myBookings.professional')}</h3>
                      <p className="font-hanken text-body-sm text-on-surface-variant truncate">{booking.service_name}</p>
                    </div>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-on-surface-variant">
                      <span className="material-symbols-outlined text-outline text-[20px]">event</span>
                      <span className="font-hanken text-body-sm">{booking.scheduled_date}{booking.scheduled_time && ` · ${booking.scheduled_time}`}</span>
                    </div>
                    {booking.address && (
                      <div className="flex items-center gap-3 text-on-surface-variant">
                        <span className="material-symbols-outlined text-outline text-[20px]">location_on</span>
                        <span className="font-hanken text-body-sm truncate">{booking.address}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-auto flex flex-col gap-3 pt-4 border-t border-surface-variant">
                    {renderPaymentRow(booking)}
                    {['accepted', 'in_progress'].includes(booking.status) && (
                      <Link to={`/customer/bookings/${booking.booking_id || booking.id}`} className="w-full bg-primary-container text-on-primary font-hanken text-label-md py-2 rounded-lg hover:bg-primary transition-colors text-center flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">near_me</span>
                        {t('booking.viewAndTrack')}
                      </Link>
                    )}
                    {booking.status === 'completed' && !reviewed.has(booking.booking_id || booking.id) && (
                      <button onClick={() => setRateBooking(booking)} className="w-full border border-outline-slate text-primary-container font-hanken text-label-md py-2 rounded-lg hover:bg-surface-container transition-colors flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">star</span>
                        {t('booking.rateService')}
                      </button>
                    )}
                    {canCall ? (
                      <div className="flex-1">
                        <CallButton bookingId={booking.booking_id || booking.id} status={booking.status} label={t('myBookings.contactPro')} />
                      </div>
                    ) : (
                      <Link to={`/customer/workers`} className="flex-1 bg-surface-container-lowest border border-outline-slate text-primary-container font-hanken text-label-md py-2 rounded-lg hover:bg-surface-container transition-colors text-center">
                        {t('myBookings.bookAgain')}
                      </Link>
                    )}
                    {['completed', 'cancelled', 'rejected'].includes(booking.status) && (
                      <Link to={`/customer/bookings/${booking.booking_id || booking.id}`} className="font-hanken text-label-sm text-secondary hover:underline text-center">
                        {t('common.viewDetails')}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-12 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">event_busy</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">{t('booking.noBookings')}</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">
              {desktopTab ? t('myBookings.noFilterBookings', { filter: desktopTabs.find((x) => x.key === desktopTab)?.label || desktopTab }) : t('booking.startBooking')}
            </p>
            <Link to="/customer/workers" className="btn-primary mt-4 inline-block">{t('myBookings.findWorkers')}</Link>
          </div>
        )}
      </div>

      {/* Payment receipt modal (opened from a paid booking's View Receipt) */}
      <PaymentReceiptModal
        open={!!receipt}
        booking={receipt?.booking}
        payment={receipt?.payment}
        onClose={() => setReceipt(null)}
      />

      {/* Rating modal (completed bookings) */}
      <RatingModal
        open={!!rateBooking}
        booking={rateBooking}
        onClose={() => setRateBooking(null)}
        onSubmitted={handleReviewed}
      />
    </DashboardLayout>
  );
}
