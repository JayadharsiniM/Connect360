import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { workersService } from '../services/workersService';

const STORAGE_KEY = 'c360_worker_online';
const REFRESH_MS = 120000; // re-share live location every 2 min while online

/**
 * OnlineToggle (worker) — Ola/Uber-style availability switch in the top bar.
 *
 * When ONLINE: captures the worker's GPS and pushes it to the backend
 * immediately, then refreshes it every couple of minutes so Priority matching
 * ranks the worker by their real live proximity. When OFFLINE: stops sharing.
 *
 * State persists across reloads (localStorage). Location permission denial
 * flips the worker back offline with a hint.
 */
export default function OnlineToggle({ compact = false }) {
  const { t } = useTranslation();
  const [online, setOnline] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');
  const timerRef = useRef(null);

  const shareOnce = useCallback(() => new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ ok: false, reason: 'unsupported' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await workersService.updateLocation(pos.coords.latitude, pos.coords.longitude, 'live');
          resolve({ ok: true });
        } catch {
          resolve({ ok: false, reason: 'network' });
        }
      },
      (err) => resolve({ ok: false, reason: err.code === err.PERMISSION_DENIED ? 'denied' : 'error' }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  }), []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // Keep sharing while online; clean up when offline/unmounted.
  useEffect(() => {
    if (!online) { stopTimer(); return undefined; }
    timerRef.current = setInterval(() => { shareOnce(); }, REFRESH_MS);
    return stopTimer;
  }, [online, shareOnce, stopTimer]);

  async function toggle() {
    setHint('');
    if (online) {
      // Going offline — just stop sharing.
      setOnline(false);
      localStorage.removeItem(STORAGE_KEY);
      stopTimer();
      return;
    }
    // Going online — require a successful first location share.
    setBusy(true);
    const res = await shareOnce();
    setBusy(false);
    if (res.ok) {
      setOnline(true);
      localStorage.setItem(STORAGE_KEY, '1');
    } else {
      setHint(
        res.reason === 'denied'
          ? t('components.onlineEnableLocation')
          : res.reason === 'unsupported'
            ? t('components.onlineNotSupported')
            : t('components.onlineCouldNotGoOnline')
      );
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        role="switch"
        aria-checked={online}
        aria-label={online ? t('components.goOffline') : t('components.goOnline')}
        className={`flex items-center gap-2 rounded-full border transition-colors disabled:opacity-60 ${compact ? 'px-2.5 py-1' : 'px-3 py-1.5'} ${
          online
            ? 'bg-success-container border-success/40 text-success'
            : 'bg-surface-container-high border-outline-slate text-on-surface-variant'
        }`}
      >
        <span className={`relative inline-flex h-2.5 w-2.5 ${online ? '' : ''}`}>
          {online && <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping motion-reduce:animate-none" />}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${online ? 'bg-success' : 'bg-outline'}`} />
        </span>
        <span className="font-hanken text-label-sm font-semibold">
          {busy ? t('worker.connecting') : online ? t('worker.online') : t('worker.offline')}
        </span>
        {/* track */}
        <span className={`ml-1 w-8 h-4 rounded-full relative transition-colors ${online ? 'bg-success/40' : 'bg-outline-variant'}`}>
          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${online ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </span>
      </button>
      {hint && <span className="font-hanken text-label-sm text-error mt-0.5">{hint}</span>}
    </div>
  );
}
