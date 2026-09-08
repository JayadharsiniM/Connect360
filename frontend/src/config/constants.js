// Role constants
export const ROLES = {
  CUSTOMER: 'customer',
  WORKER: 'worker',
  ADMIN: 'admin',
};

// Booking status
export const BOOKING_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Booking status display labels
export const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  // Priority Booking lifecycle
  matching: 'Matching',
  worker_pending: 'Awaiting Worker',
  rematching: 'Rematching',
  no_worker_available: 'No Worker Available',
  expired: 'Expired',
};

// Booking types
export const BOOKING_TYPE = {
  MANUAL: 'manual',
  PRIORITY: 'priority',
};

// Priority Booking lifecycle statuses (customer-facing)
export const PRIORITY_STATUS = {
  MATCHING: 'matching',
  WORKER_PENDING: 'worker_pending',
  REMATCHING: 'rematching',
  NO_WORKER: 'no_worker_available',
  EXPIRED: 'expired',
  ACCEPTED: 'accepted',
  CANCELLED: 'cancelled',
};

// Priority request "when" options
export const PRIORITY_URGENCY = {
  ASAP: 'asap',
  TODAY: 'today',
  TOMORROW: 'tomorrow',
  SCHEDULED: 'scheduled',
};

// Priority request "time window" options
export const PRIORITY_TIME_WINDOW = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
  SPECIFIC: 'specific',
};

// Days of week
export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// Document types for verification
export const DOCUMENT_TYPES = {
  id_proof: 'ID Proof',
  address_proof: 'Address Proof',
  certification: 'Certification',
  other: 'Other',
};
