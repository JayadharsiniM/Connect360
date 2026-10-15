import { useTranslation } from 'react-i18next';

const paymentConfig = {
  NONE: { labelKey: 'payment.statusNone', className: 'badge-pending', icon: 'schedule' },
  PENDING: { labelKey: 'payment.statusPending', className: 'badge-pending', icon: 'hourglass_top' },
  AUTHORIZED: { labelKey: 'payment.statusAuthorized', className: 'badge-accepted', icon: 'lock_clock' },
  SUCCESSFUL: { labelKey: 'payment.statusSuccessful', className: 'badge-completed', icon: 'verified' },
  FAILED: { labelKey: 'payment.statusFailed', className: 'badge-rejected', icon: 'error' },
  REFUNDED: { labelKey: 'payment.statusRefunded', className: 'badge-cancelled', icon: 'undo' },
  PARTIALLY_REFUNDED: { labelKey: 'payment.statusPartiallyRefunded', className: 'badge-cancelled', icon: 'undo' },
};

/**
 * Payment status badge (Razorpay). Mirrors StatusBadge styling but for the
 * payment lifecycle, which is kept SEPARATE from the booking status.
 */
export default function PaymentStatusBadge({ status }) {
  const { t } = useTranslation();
  const config = paymentConfig[status] || paymentConfig.NONE;
  return (
    <span className={`badge ${config.className}`}>
      <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>
        {config.icon}
      </span>
      {t(config.labelKey)}
    </span>
  );
}
