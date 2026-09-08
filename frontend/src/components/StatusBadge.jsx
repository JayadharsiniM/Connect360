const statusConfig = {
  pending: { label: 'Pending', className: 'badge-pending', icon: 'schedule' },
  accepted: { label: 'Accepted', className: 'badge-accepted', icon: 'check_circle' },
  in_progress: { label: 'In Progress', className: 'badge-in_progress', icon: 'sync' },
  completed: { label: 'Completed', className: 'badge-completed', icon: 'task_alt' },
  rejected: { label: 'Rejected', className: 'badge-rejected', icon: 'cancel' },
  cancelled: { label: 'Cancelled', className: 'badge-cancelled', icon: 'block' },
  // Priority Booking lifecycle statuses
  matching: { label: 'Matching', className: 'badge-pending', icon: 'search' },
  worker_pending: { label: 'Awaiting Worker', className: 'badge-pending', icon: 'hourglass_top' },
  rematching: { label: 'Rematching', className: 'badge-pending', icon: 'autorenew' },
  no_worker_available: { label: 'No Worker', className: 'badge-rejected', icon: 'person_off' },
  expired: { label: 'Expired', className: 'badge-cancelled', icon: 'timer_off' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, className: 'badge-cancelled', icon: 'help' };

  return (
    <span className={`badge ${config.className}`}>
      <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>
        {config.icon}
      </span>
      {config.label}
    </span>
  );
}
