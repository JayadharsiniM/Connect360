import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * PaymentSummaryModal — pre-checkout order summary shown before Razorpay opens.
 *
 * Presentation only. Everything shown comes from REAL data:
 *   - service_name, worker_name, scheduled date/time from the booking
 *   - amount from the backend (booking.total_amount) in ₹
 * No escrow / OTP / GST concepts are invented — the backend charges a single
 * total, so we show that total clearly and label it honestly.
 *
 * Follows the existing modal pattern (fixed inset-0, backdrop-blur, surface
 * card, outline-slate borders, Manrope/Hanken type, btn-primary action).
 */
export default function PaymentSummaryModal({ open, booking, amount, processing, onConfirm, onClose }) {
  const { t } = useTranslation();
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape' && !processing) onClose();
    }
    document.addEventListener('keydown', onKey);
    // Move focus into the dialog for keyboard users.
    const timer = setTimeout(() => confirmRef.current?.focus(), 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(timer);
    };
  }, [open, processing, onClose]);

  if (!open) return null;

  const total = typeof amount === 'number' ? amount : (booking?.total_amount || 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-summary-title"
      onClick={() => { if (!processing) onClose(); }}
    >
      <div
        className="bg-surface-container-lowest rounded-xl border border-outline-slate shadow-level-3 max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-stack-md bg-surface-container border-b border-outline-slate flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm bg-secondary-container text-on-secondary font-hanken mb-2">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              {t('payment.securePayment')}
            </span>
            <h3 id="pay-summary-title" className="font-manrope text-headline-sm text-primary">{t('payment.summaryTitle')}</h3>
            {booking?.service_name && (
              <p className="font-hanken text-body-sm text-on-surface-variant mt-0.5">{booking.service_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            aria-label={t('common.close')}
            className="w-9 h-9 rounded-lg text-on-surface-variant hover:bg-surface-container-high flex items-center justify-center disabled:opacity-50"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Booking details (real fields only) */}
        <div className="p-stack-md flex flex-col gap-3">
          {booking?.worker_name && (
            <Row icon="person" label={t('payment.rowProfessional')} value={booking.worker_name} />
          )}
          {booking?.service_name && (
            <Row icon="handyman" label={t('payment.rowService')} value={booking.service_name} />
          )}
          {(booking?.scheduled_date || booking?.scheduled_time) && (
            <Row
              icon="event"
              label={t('payment.rowScheduled')}
              value={`${booking.scheduled_date || ''}${booking.scheduled_time ? ` · ${booking.scheduled_time}` : ''}`}
            />
          )}

          {/* Amount — the backend charges a single trusted total. */}
          <div className="mt-1 pt-4 border-t border-outline-slate flex items-baseline justify-between">
            <div>
              <span className="font-manrope text-headline-sm text-primary">{t('payment.totalPayable')}</span>
              <p className="font-hanken text-label-sm text-on-surface-variant">{t('payment.chargedViaRazorpay')}</p>
            </div>
            <span className="font-manrope text-headline-lg text-secondary">₹{total}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-stack-md bg-surface-container-low border-t border-outline-slate flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={processing}
            className="btn-secondary !py-2.5 !px-4 disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={processing}
            className="btn-primary !py-2.5 !px-5 flex items-center gap-2 disabled:opacity-60"
          >
            {processing ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-on-primary/40 border-t-on-primary animate-spin motion-reduce:animate-none" />
                {t('payment.processing')}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">payments</span>
                {t('payment.payAmount', { amount: total })}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </span>
      <div className="min-w-0">
        <p className="font-hanken text-label-sm text-on-surface-variant leading-none">{label}</p>
        <p className="font-hanken text-body-sm text-on-surface font-medium mt-1 truncate">{value}</p>
      </div>
    </div>
  );
}
