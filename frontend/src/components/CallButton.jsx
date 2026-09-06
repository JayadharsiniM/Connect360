import { useState } from 'react';
import { bookingsService } from '../services/bookingsService';

/**
 * CallButton — masked in-app calling for an active booking.
 *
 * Number privacy: this component never receives or displays a phone number.
 * It only calls POST /api/bookings/{id}/call and reflects the returned status.
 *
 * Props:
 *   bookingId  - the booking to place the call for
 *   status     - current booking status (controls availability)
 *   label      - button text (e.g. "Call Technician" / "Call Customer")
 */
export default function CallButton({ bookingId, status, label }) {
  const [callState, setCallState] = useState('idle'); // idle | calling | success | unavailable | error
  const [message, setMessage] = useState('');

  const isActive = status === 'accepted' || status === 'in_progress';

  // Booking not active — calling not offered
  if (!isActive) return null;

  async function handleCall() {
    if (callState === 'calling') return;
    setCallState('calling');
    setMessage('');
    try {
      const res = await bookingsService.initiateCall(bookingId);
      setCallState('success');
      setMessage(res.data?.message || 'Connecting your call. Please answer your phone.');
    } catch (err) {
      const code = err.response?.status;
      if (code === 503) {
        setCallState('unavailable');
        setMessage('Calling is not available right now.');
      } else if (code === 422) {
        setCallState('error');
        setMessage(err.response?.data?.error || 'A phone number is required to call.');
      } else if (code === 409) {
        setCallState('unavailable');
        setMessage('Calling is only available for active bookings.');
      } else if (code === 403) {
        setCallState('error');
        setMessage('You are not allowed to call for this booking.');
      } else {
        setCallState('error');
        setMessage('Unable to connect the call. Please try again later.');
      }
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        onClick={handleCall}
        disabled={callState === 'calling' || callState === 'unavailable'}
        className={`!py-2 !px-4 text-center whitespace-nowrap flex items-center justify-center gap-1.5 rounded-lg font-hanken text-label-md transition-all ${
          callState === 'unavailable'
            ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
            : 'bg-secondary-container text-on-secondary hover:opacity-90 active:scale-[0.98]'
        }`}
        title="Your number stays private"
      >
        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          {callState === 'calling' ? 'ring_volume' : callState === 'success' ? 'phone_in_talk' : 'call'}
        </span>
        {callState === 'calling' ? 'Connecting…' : callState === 'success' ? 'Calling' : label}
      </button>

      {/* Status / privacy hint */}
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
          Number stays private
        </p>
      )}
    </div>
  );
}
