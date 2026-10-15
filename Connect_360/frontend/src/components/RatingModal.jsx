import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { bookingsService } from '../services/bookingsService';

/**
 * RatingModal — customer rates & reviews a COMPLETED booking.
 *
 * Posts to the existing POST /api/reviews ({ booking_id, rating, comment }),
 * which keys the review to the booking's worker and recomputes that worker's
 * rating_avg / rating_count — so the feedback maps to the worker automatically.
 *
 * Polished UX: large interactive star picker with hover preview, an optional
 * comment, success state, and reduced-motion-friendly animation. Shown as a
 * popup once a service is completed.
 */
const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export default function RatingModal({ open, booking, onClose, onSubmitted }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setRating(0); setHover(0); setComment(''); setError(''); setDone(false);
    }
  }, [open, booking?.id, booking?.booking_id]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  if (!open || !booking) return null;
  const bookingId = booking.booking_id || booking.id;
  const shown = hover || rating;

  async function submit() {
    if (rating < 1) { setError('Please select a star rating.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await bookingsService.createReview({ booking_id: bookingId, rating, comment: comment.trim() });
      setDone(true);
      if (onSubmitted) onSubmitted(bookingId, rating);
      setTimeout(() => onClose(), 1400);
    } catch (err) {
      // Backend returns an error if already reviewed / not completed.
      const msg = err.response?.data?.error || 'Could not submit your review.';
      if (/already/i.test(msg)) {
        setDone(true);
        if (onSubmitted) onSubmitted(bookingId, rating);
        setTimeout(() => onClose(), 1200);
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rating-title"
      onClick={() => { if (!submitting) onClose(); }}
    >
      <div
        className="bg-surface-container-lowest rounded-xl border border-outline-slate shadow-level-3 max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="p-8 flex flex-col items-center text-center gap-3">
            <span className="w-16 h-16 rounded-full bg-success-container text-success flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </span>
            <h3 className="font-manrope text-headline-sm text-primary">{t('rating.thanks')}</h3>
            <p className="font-hanken text-body-sm text-on-surface-variant">Your feedback helps {booking.worker_name || 'your professional'} and other customers.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-stack-md bg-surface-container border-b border-outline-slate flex items-start justify-between gap-3">
              <div>
                <h3 id="rating-title" className="font-manrope text-headline-sm text-primary">{t('rating.title')}</h3>
                <p className="font-hanken text-body-sm text-on-surface-variant mt-0.5">
                  {booking.service_name}{booking.worker_name && ` · ${booking.worker_name}`}
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={submitting}
                aria-label="Close"
                className="w-9 h-9 rounded-lg text-on-surface-variant hover:bg-surface-container-high flex items-center justify-center disabled:opacity-50"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Stars */}
            <div className="p-stack-md flex flex-col items-center gap-2">
              <div className="flex items-center gap-1" role="radiogroup" aria-label="Star rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onFocus={() => setHover(n)}
                    onBlur={() => setHover(0)}
                    onClick={() => { setRating(n); setError(''); }}
                    className="p-1 transition-transform hover:scale-110 motion-reduce:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-secondary/40 rounded"
                  >
                    <span
                      className={`material-symbols-outlined text-[40px] ${n <= shown ? 'text-warning' : 'text-outline-variant'}`}
                      style={{ fontVariationSettings: `'FILL' ${n <= shown ? 1 : 0}` }}
                    >
                      star
                    </span>
                  </button>
                ))}
              </div>
              <p className="font-hanken text-body-sm text-on-surface-variant h-5">{STAR_LABELS[shown] || 'Tap a star'}</p>
            </div>

            {/* Comment */}
            <div className="px-stack-md pb-stack-md">
              <label className="font-hanken text-label-sm text-on-surface-variant block mb-1.5">{t('rating.comment')}</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="How was the service?"
                className="w-full px-3 py-2 rounded-lg border border-outline-slate bg-surface font-hanken text-body-sm focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none resize-none"
              />
              {error && <p role="alert" className="font-hanken text-body-sm text-error mt-2">{error}</p>}
            </div>

            {/* Actions */}
            <div className="p-stack-md bg-surface-container-low border-t border-outline-slate flex items-center justify-end gap-3">
              <button onClick={onClose} disabled={submitting} className="btn-secondary !py-2.5 !px-4 disabled:opacity-50">
                {t('rating.later')}
              </button>
              <button onClick={submit} disabled={submitting || rating < 1} className="btn-primary !py-2.5 !px-5 flex items-center gap-2 disabled:opacity-60">
                {submitting ? t('common.loading') : t('rating.submit')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
