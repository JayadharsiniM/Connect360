import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { bookingsService } from '../services/bookingsService';

/**
 * ArrivalOtpCard (customer side)
 *
 * Shows the 6-digit arrival OTP for an accepted booking so the customer can
 * share it with the worker on arrival. The code comes from the backend; this
 * component only displays it, shows validity, and allows regenerate (with the
 * backend-enforced cooldown). It renders nothing once the booking is no longer
 * 'accepted' (i.e. after verification the service has started).
 */
export default function ArrivalOtpCard({ booking }) {
  const { t } = useTranslation();
  const bookingId = booking.booking_id || booking.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bookingsService.getArrivalOtp(bookingId);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || t('otp.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    // Only fetch the code while the booking is still awaiting arrival.
    if (booking.status === 'accepted') load();
    else setLoading(false);
  }, [load, booking.status]);

  async function regenerate() {
    setRegenerating(true);
    setError('');
    try {
      const res = await bookingsService.regenerateArrivalOtp(bookingId);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || t('otp.regenerateFailed'));
    } finally {
      setRegenerating(false);
    }
  }

  // Relevant while accepted (show code) and in_progress (show confirmation).
  if (booking.status !== 'accepted' && booking.status !== 'in_progress') return null;

  // Once the service has started, show a positive confirmation instead of a
  // blank space where the code used to be.
  if (booking.status === 'in_progress') {
    return (
      <div className="rounded-xl border border-l-4 border-l-success border-outline-slate bg-success-container/20 p-4 flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-success-container text-success flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
        </span>
        <div>
          <p className="font-manrope text-label-md text-primary">{t('otp.arrivalVerified')}</p>
          <p className="font-hanken text-body-sm text-on-surface-variant">{t('otp.proStartedService')}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="h-24 bg-surface-container-high rounded-xl animate-pulse" />;
  }

  const otp = data?.otp;
  const verified = data?.verified;

  return (
    <div className="rounded-xl border border-l-4 border-l-secondary border-outline-slate bg-secondary-container/10 p-4 flex flex-col gap-3" role="group" aria-label={t('otp.arrivalCodeAria')}>
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary flex items-center justify-center">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>vpn_key</span>
        </span>
        <h4 className="font-manrope text-label-md text-primary">{t('otp.arrivalVerification')}</h4>
      </div>

      {verified ? (
        <p className="font-hanken text-body-sm text-success flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          {t('otp.arrivalVerifiedInline')}
        </p>
      ) : otp ? (
        <>
          <p className="font-hanken text-body-sm text-on-surface-variant">
            {t('otp.shareCode')}
          </p>
          <div className="flex items-center gap-2" aria-label={t('otp.oneTimeCode')}>
            {otp.split('').map((d, i) => (
              <span key={i} className="w-10 h-12 rounded-lg bg-surface-container-lowest border border-outline-slate flex items-center justify-center font-manrope text-headline-sm text-primary tracking-wider">
                {d}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="font-hanken text-label-sm text-on-surface-variant">
              {data?.seconds_remaining > 0
                ? t('otp.validForMin', { min: Math.ceil(data.seconds_remaining / 60) })
                : t('otp.codeExpired')}
            </span>
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="font-hanken text-label-sm text-secondary flex items-center gap-1 hover:underline disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              {regenerating ? t('otp.generating') : t('otp.regenerate')}
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between">
          <p className="font-hanken text-body-sm text-on-surface-variant">
            {error || t('otp.codeExpiredLong')}
          </p>
          <button onClick={regenerate} disabled={regenerating} className="btn-secondary !py-2 !px-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            {regenerating ? t('otp.generating') : t('otp.getNewCode')}
          </button>
        </div>
      )}

      {error && otp && <p className="font-hanken text-body-sm text-error">{error}</p>}
    </div>
  );
}
