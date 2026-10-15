import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { paymentsService, loadRazorpayScript } from '../services/paymentsService';
import PaymentSummaryModal from './PaymentSummaryModal';

const isMock = import.meta.env.VITE_MOCK_MODE === 'true';

/**
 * PayNowButton (Razorpay TEST MODE)
 *
 * Flow (UNCHANGED — presentation layer only):
 *   1. Open a pre-checkout summary modal (amount shown comes from create-order)
 *   2. POST /payments/create-order
 *   3. Open Razorpay Checkout
 *   4. On success -> POST /payments/verify ; show success only after backend confirms
 *
 * Result is surfaced as a small inline status block with subtle, reduced-motion
 * aware animation. Cancel/failure remain retriable with no duplicate charge.
 */
export default function PayNowButton({ booking, onPaid, label }) {
  const { t } = useTranslation();
  const buttonLabel = label || t('booking.payNow');
  const bookingId = booking.booking_id || booking.id;
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [orderData, setOrderData] = useState(null); // {amount(paise), ...} from create-order
  const [processing, setProcessing] = useState(false);
  // result: null | {state:'processing'|'success'|'pending'|'failed', text, ref}
  const [result, setResult] = useState(null);

  // Open the summary modal and fetch the real order (so the modal shows the
  // backend-computed amount, not a frontend guess).
  async function openSummary() {
    setResult(null);
    setSummaryOpen(true);
    setProcessing(true);
    try {
      const res = await paymentsService.createOrder(bookingId);
      setOrderData(res.data);
    } catch (err) {
      setSummaryOpen(false);
      setResult({ state: 'failed', text: err.response?.data?.error || t('payment.couldNotStart') });
    } finally {
      setProcessing(false);
    }
  }

  async function confirmAndPay() {
    if (!orderData) return;
    setProcessing(true);
    setResult({ state: 'processing', text: t('payment.securingPayment') });
    try {
      // Mock mode: simulate a verified payment without the SDK.
      if (isMock) {
        const verifyRes = await paymentsService.verify({
          booking_id: bookingId,
          razorpay_order_id: orderData.razorpay_order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: 'mock_signature',
        });
        setSummaryOpen(false);
        finish(verifyRes.data);
        return;
      }

      await loadRazorpayScript();
      if (!window.Razorpay) throw new Error(t('payment.razorpayUnavailable'));

      const options = {
        key: orderData.key_id,
        order_id: orderData.razorpay_order_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Connect360',
        description: orderData.booking?.service_name || t('payment.serviceBooking'),
        handler: async (response) => {
          setResult({ state: 'processing', text: t('payment.confirmingPayment') });
          try {
            const verifyRes = await paymentsService.verify({
              booking_id: bookingId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            finish(verifyRes.data);
          } catch (err) {
            setProcessing(false);
            setResult({ state: 'failed', text: err.response?.data?.error || t('payment.verificationFailedCharged') });
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            setResult({ state: 'pending', text: t('payment.paymentCancelled') });
          },
        },
        theme: { color: '#0058BE' },
      };
      setSummaryOpen(false);
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        setProcessing(false);
        setResult({ state: 'failed', text: resp.error?.description || t('payment.paymentFailedRetry') });
      });
      rzp.open();
    } catch (err) {
      setProcessing(false);
      setSummaryOpen(false);
      setResult({ state: 'failed', text: err.response?.data?.error || err.message || t('payment.couldNotStart') });
    }
  }

  function finish(verifyData) {
    setProcessing(false);
    const status = verifyData.status;
    const pay = verifyData.payment || {};
    if (status === 'SUCCESSFUL') {
      setResult({ state: 'success', text: t('payment.paymentSuccessful'), ref: pay.razorpay_payment_id });
      if (onPaid) onPaid(verifyData);
    } else if (status === 'AUTHORIZED' || status === 'PENDING') {
      setResult({ state: 'pending', text: t('payment.paymentBeingConfirmed') });
      if (onPaid) onPaid(verifyData);
    } else {
      setResult({ state: 'failed', text: t('payment.couldNotConfirm') });
    }
  }

  const amountRupees = orderData?.amount != null
    ? Math.round(orderData.amount) / 100
    : (booking.total_amount || 0);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Trigger — hidden once we have a terminal success to avoid double-pay */}
      {result?.state !== 'success' && (
        <button
          onClick={openSummary}
          disabled={processing && summaryOpen}
          className="btn-primary !py-2 !px-4 flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">payments</span>
          {buttonLabel}
        </button>
      )}

      {result && <ResultBlock result={result} onRetry={openSummary} />}

      <PaymentSummaryModal
        open={summaryOpen}
        booking={booking}
        amount={amountRupees}
        processing={processing}
        onConfirm={confirmAndPay}
        onClose={() => { if (!processing) setSummaryOpen(false); }}
      />
    </div>
  );
}

/**
 * Inline result block — polished states that reuse the app's color tokens.
 * Not communicated by color alone (each state has an icon + text label).
 */
function ResultBlock({ result, onRetry }) {
  const { t } = useTranslation();
  const map = {
    processing: {
      wrap: 'bg-surface-container-low border-outline-variant text-on-surface',
      icon: null,
      role: 'status',
    },
    success: {
      wrap: 'bg-success-container/40 border-success/40 text-success',
      icon: 'check_circle',
      role: 'status',
    },
    pending: {
      wrap: 'bg-warning-container/40 border-warning/40 text-warning',
      icon: 'hourglass_top',
      role: 'status',
    },
    failed: {
      wrap: 'bg-error-container/40 border-error/40 text-error',
      icon: 'error',
      role: 'alert',
    },
  };
  const cfg = map[result.state] || map.pending;

  return (
    <div
      role={cfg.role}
      aria-live="polite"
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${cfg.wrap}`}
    >
      {result.state === 'processing' ? (
        <span className="w-4 h-4 mt-0.5 rounded-full border-2 border-current/30 border-t-current animate-spin motion-reduce:animate-none flex-shrink-0" />
      ) : (
        <span className="material-symbols-outlined text-[18px] flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
          {cfg.icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="font-hanken text-body-sm">{result.text}</p>
        {result.ref && (
          <p className="font-mono text-label-sm text-on-surface-variant mt-0.5 break-all">{t('payment.ref', { ref: result.ref })}</p>
        )}
        {result.state === 'failed' && (
          <button onClick={onRetry} className="font-hanken text-label-sm underline mt-1 hover:no-underline">
            {t('booking.retryPayment')}
          </button>
        )}
      </div>
    </div>
  );
}
