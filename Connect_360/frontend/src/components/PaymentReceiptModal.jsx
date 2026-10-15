import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PaymentStatusBadge from './PaymentStatusBadge';

/**
 * PaymentReceiptModal — read-only receipt / details panel.
 *
 * Shows ONLY fields the backend actually returns in _payment_public_view
 * (status, amount, razorpay_order_id, razorpay_payment_id, timestamps, refund).
 * Unavailable fields are hidden rather than shown as misleading placeholders.
 * No secrets or signatures are ever present in the payload, so none appear here.
 */
export default function PaymentReceiptModal({ open, booking, payment, onClose }) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !payment) return null;

  const amount = payment.amount_display != null
    ? payment.amount_display
    : (payment.amount != null ? payment.amount / 100 : null);

  const rows = [
    { label: t('payment.rowService'), value: booking?.service_name || payment.service_name },
    { label: t('payment.rowProfessional'), value: booking?.worker_name },
    { label: t('payment.rowBookingDate'), value: booking?.scheduled_date
      ? `${booking.scheduled_date}${booking.scheduled_time ? ` · ${booking.scheduled_time}` : ''}`
      : null },
    { label: t('payment.rowOrderId'), value: payment.razorpay_order_id, mono: true },
    { label: t('payment.rowPaymentId'), value: payment.razorpay_payment_id, mono: true },
    { label: t('payment.rowPaidOn'), value: payment.captured_at ? new Date(payment.captured_at).toLocaleString() : null },
    { label: t('payment.rowCreated'), value: payment.created_at ? new Date(payment.created_at).toLocaleString() : null },
  ].filter((r) => r.value); // hide unavailable fields

  const refunded = payment.refunded_amount > 0 ? payment.refunded_amount / 100 : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest rounded-xl border border-outline-slate shadow-level-3 max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-stack-md bg-surface-container border-b border-outline-slate flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary flex items-center justify-center">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
            </span>
            <div>
              <h3 id="receipt-title" className="font-manrope text-headline-sm text-primary">{t('payment.receiptTitle')}</h3>
              <div className="mt-1"><PaymentStatusBadge status={payment.status} /></div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="w-9 h-9 rounded-lg text-on-surface-variant hover:bg-surface-container-high flex items-center justify-center"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Amount */}
        <div className="px-stack-md pt-stack-md">
          <div className="rounded-xl border border-outline-slate bg-surface-container-low p-4 flex items-baseline justify-between">
            <span className="font-hanken text-label-sm text-on-surface-variant uppercase tracking-wider">{t('payment.amount')}</span>
            <span className="font-manrope text-headline-md text-primary">
              {payment.currency === 'INR' || !payment.currency ? '₹' : `${payment.currency} `}{amount}
            </span>
          </div>
          {refunded > 0 && (
            <div className="rounded-xl border border-outline-slate bg-surface-container-low p-4 mt-2 flex items-baseline justify-between">
              <span className="font-hanken text-label-sm text-on-surface-variant uppercase tracking-wider">{t('payment.refunded')}</span>
              <span className="font-manrope text-headline-sm text-on-surface">₹{refunded}</span>
            </div>
          )}
        </div>

        {/* Detail rows (only present fields) */}
        <dl className="p-stack-md flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-4">
              <dt className="font-hanken text-body-sm text-on-surface-variant flex-shrink-0">{row.label}</dt>
              <dd className={`font-hanken text-body-sm text-on-surface text-right break-all ${row.mono ? 'font-mono text-label-sm' : 'font-medium'}`}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="p-stack-md bg-surface-container-low border-t border-outline-slate flex justify-end">
          <button onClick={onClose} className="btn-primary !py-2.5 !px-5">{t('common.done')}</button>
        </div>
      </div>
    </div>
  );
}
