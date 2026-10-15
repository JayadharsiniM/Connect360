import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { bookingsService } from '../services/bookingsService';

/**
 * CallButton — direct-dial calling for an active booking.
 *
 * Privacy model:
 *   - This component NEVER displays a phone number. It shows only a label /
 *     the callee's name. The number is fetched only to hand it to the device's
 *     native dialer (tel:) so the user places the call from their own phone.
 *   - Note: the OS dialer / call history will still show the number (that is
 *     unavoidable for a self-dialed call). Our app UI never renders it.
 *
 * Props:
 *   bookingId  - the booking to place the call for
 *   status     - current booking status (controls availability)
 *   label      - fallback button text (e.g. "Call Technician" / "Call Customer")
 *   className  - optional extra classes
 */
export default function CallButton({ bookingId, status, label, className = '' }) {
  const { t } = useTranslation();
  const [callState, setCallState] = useState('idle'); // idle | connecting | error | unavailable
  const [message, setMessage] = useState('');
  const buttonLabel = label || t('components.callDefault');

  const isActive = status === 'accepted' || status === 'in_progress';

  // Booking not active — calling not offered
  if (!isActive) return null;

  async function handleCall() {
    if (callState === 'connecting') return;
    setCallState('connecting');
    setMessage('');
    try {
      const res = await bookingsService.initiateCall(bookingId);
      const phone = res.data?.phone;

      if (!phone) {
        setCallState('error');
        setMessage(t('components.callNoPhone'));
        return;
      }

      // Open the device's native dialer. The number is used here ONLY to place
      // the call; it is never shown anywhere in the app UI.
      setCallState('idle');
      window.location.href = `tel:${phone}`;
    } catch (err) {
      const code = err.response?.status;
      if (code === 422) {
        setCallState('error');
        setMessage(err.response?.data?.error || t('components.callNoPhoneYet'));
      } else if (code === 409) {
        setCallState('unavailable');
        setMessage(t('components.callOnlyActive'));
      } else if (code === 403) {
        setCallState('error');
        setMessage(t('components.callNotAllowed'));
      } else {
        setCallState('error');
        setMessage(t('components.callUnableStart'));
      }
    }
  }

  return (
    <div className={`flex flex-col items-stretch gap-1 ${className}`}>
      <button
        onClick={handleCall}
        disabled={callState === 'connecting' || callState === 'unavailable'}
        className={`!py-2 !px-4 text-center whitespace-nowrap flex items-center justify-center gap-1.5 rounded-lg font-hanken text-label-md transition-all ${
          callState === 'unavailable'
            ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
            : 'bg-secondary-container text-on-secondary hover:opacity-90 active:scale-[0.98]'
        }`}
        title={t('components.callTitle')}
      >
        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          {callState === 'connecting' ? 'ring_volume' : 'call'}
        </span>
        {callState === 'connecting' ? t('components.callOpeningDialer') : buttonLabel}
      </button>

      {/* Status / privacy hint — never shows a number */}
      {message ? (
        <p
          className={`font-hanken text-label-sm ${
            callState === 'error' ? 'text-error' : 'text-on-surface-variant'
          }`}
        >
          {message}
        </p>
      ) : (
        <p className="font-hanken text-label-sm text-on-surface-variant flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">lock</span>
          {t('components.callNumberHidden')}
        </p>
      )}
    </div>
  );
}
