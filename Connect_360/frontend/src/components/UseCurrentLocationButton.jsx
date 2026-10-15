import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reverseGeocode } from '../services/routingService';

/**
 * UseCurrentLocationButton
 *
 * A small "Use my current location" control for any address field. It reads the
 * device GPS via the browser Geolocation API, reverse-geocodes it to a readable
 * address, and calls onLocation({ address, lat, lng }). Degrades gracefully:
 * if permission is denied or geolocation is unavailable, it surfaces a hint.
 */
export default function UseCurrentLocationButton({ onLocation, className = '' }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function detect() {
    setError('');
    if (!('geolocation' in navigator)) {
      setError(t('priorityForm.locationNotSupported'));
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let address = '';
        try {
          const r = await reverseGeocode(latitude, longitude);
          address = r?.address || '';
        } catch {
          /* reverse geocode is best-effort; still return coords */
        }
        setLoading(false);
        if (onLocation) onLocation({ address, lat: latitude, lng: longitude });
      },
      (err) => {
        setLoading(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? t('components.locPermissionDenied')
            : t('components.locCouldNotGet')
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <button
        type="button"
        onClick={detect}
        disabled={loading}
        className="inline-flex items-center gap-1.5 font-hanken text-label-sm text-secondary hover:underline disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[16px]">{loading ? 'hourglass_top' : 'my_location'}</span>
        {loading ? t('components.locDetecting') : t('priorityForm.useCurrentLocation')}
      </button>
      {error && <span className="font-hanken text-label-sm text-error">{error}</span>}
    </div>
  );
}
