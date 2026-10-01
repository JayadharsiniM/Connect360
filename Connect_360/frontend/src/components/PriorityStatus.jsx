/**
 * PriorityStatus — single reusable source of truth for rendering a Priority
 * Booking's lifecycle state (icon, label, description, progress, tone).
 *
 * Used by the customer status view and booking cards so status UI is never
 * hard-coded in multiple places.
 */

// step index drives the progress bar (0..4). Terminal/failure states use -1.
const CONFIG = {
  matching: {
    label: 'Finding the best worker…',
    description: 'We are matching your request with the most suitable available professional.',
    icon: 'search',
    tone: 'progress',
    step: 1,
  },
  rematching: {
    label: 'Finding another worker…',
    description: 'The previous professional was unavailable. We are matching you with the next best option.',
    icon: 'autorenew',
    tone: 'progress',
    step: 1,
  },
  worker_pending: {
    label: 'Worker found',
    description: 'Waiting for the professional to confirm your request.',
    icon: 'hourglass_top',
    tone: 'progress',
    step: 3,
  },
  accepted: {
    label: 'Booking confirmed',
    description: 'Your professional accepted. You are all set.',
    icon: 'check_circle',
    tone: 'success',
    step: 4,
  },
  no_worker_available: {
    label: "We couldn't find an available worker",
    description: 'No professional matching your requirements is available right now.',
    icon: 'person_off',
    tone: 'error',
    step: -1,
  },
  expired: {
    label: 'Offer expired',
    description: 'The professional did not respond in time. We can try another one.',
    icon: 'timer_off',
    tone: 'warning',
    step: -1,
  },
  cancelled: {
    label: 'Request cancelled',
    description: 'This priority request was cancelled.',
    icon: 'cancel',
    tone: 'neutral',
    step: -1,
  },
};

const TONE_CLASSES = {
  progress: 'text-secondary',
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  neutral: 'text-on-surface-variant',
};

const TOTAL_STEPS = 4;

export function priorityStatusMeta(status) {
  return CONFIG[status] || {
    label: status,
    description: '',
    icon: 'help',
    tone: 'neutral',
    step: -1,
  };
}

/**
 * @param {string} status - priority lifecycle status
 * @param {boolean} compact - condensed inline layout (for cards)
 */
export default function PriorityStatus({ status, compact = false }) {
  const meta = priorityStatusMeta(status);
  const toneClass = TONE_CLASSES[meta.tone] || TONE_CLASSES.neutral;
  const inProgress = meta.tone === 'progress';
  const progressPct = meta.step >= 0 ? Math.round((meta.step / TOTAL_STEPS) * 100) : 0;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-hanken text-label-sm ${toneClass}`}>
        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          {meta.icon}
        </span>
        {meta.label}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-stack-sm anim-rise" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined text-[24px] ${toneClass} ${inProgress ? 'anim-pulse-dot' : ''}`}
              style={{ fontVariationSettings: "'FILL' 1" }}>
          {meta.icon}
        </span>
        <div>
          <p className="font-manrope text-headline-sm text-primary">{meta.label}</p>
          {meta.description && (
            <p className="font-hanken text-body-sm text-on-surface-variant mt-0.5">{meta.description}</p>
          )}
        </div>
      </div>

      {/* Progress: indeterminate sweep while matching, determinate otherwise */}
      {meta.step >= 0 && (
        <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden mt-1">
          {inProgress && meta.step <= 1 ? (
            <div className="h-full w-1/3 bg-secondary rounded-full anim-sweep" />
          ) : (
            <div
              className="h-full bg-secondary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          )}
        </div>
      )}
    </div>
  );
}
