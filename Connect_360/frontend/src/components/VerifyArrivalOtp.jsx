import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { bookingsService } from '../services/bookingsService';

/**
 * VerifyArrivalOtp (worker side)
 *
 * Replaces the direct "Start Work" action for an accepted booking. The worker
 * asks the customer for the 6-digit code shown in the customer's app, enters it
 * here, and the backend verifies it and moves the booking to in_progress. The
 * worker never sees the actual OTP; clicking the button alone does not start
 * the service — only a successful server-side verification does.
 */
export default function VerifyArrivalOtp({ booking, onVerified, compact = false }) {
  const { t } = useTranslation();
  const bookingId = booking.id || booking.booking_id;
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e?.preventDefault();
    if (code.length !== 6) {
      setError(t('otp.enter6Digit'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await bookingsService.verifyArrivalOtp(bookingId, code);
      setOpen(false);
      setCode('');
      if (onVerified) onVerified();
    } catch (err) {
      setError(err.response?.data?.error || t('otp.verificationFailed'));
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setError(''); }}
        className={`btn-primary flex items-center justify-center gap-1.5 ${compact ? '!py-2 !px-4' : ''}`}
      >
        <span className="material-symbols-outlined text-[16px]">vpn_key</span>
        {t('worker.verifyArrivalOtp')}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-lg border border-outline-slate bg-surface-container-lowest p-3 w-full">
      <label className="font-hanken text-label-sm text-on-surface-variant">
        {t('otp.enterCodeLabel')}
      </label>
      <input
        autoFocus
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="------"
        aria-label={t('otp.arrivalOtpAria')}
        className="w-full h-11 px-3 rounded-lg border border-outline-slate bg-surface font-manrope text-headline-sm tracking-[0.4em] text-center text-primary focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none"
      />
      {error && <p role="alert" className="font-hanken text-label-sm text-error">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={loading || code.length !== 6} className="btn-primary !py-2 !px-4 flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50">
          <span className="material-symbols-outlined text-[16px]">play_arrow</span>
          {loading ? t('otp.verifying') : t('otp.verifyAndStart')}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(''); setCode(''); }} disabled={loading} className="btn-secondary !py-2 !px-3">
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
