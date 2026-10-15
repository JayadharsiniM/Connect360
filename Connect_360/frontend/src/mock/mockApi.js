// =============================================================================
// Connect360 - Mock API that simulates backend responses
// Used when VITE_MOCK_MODE=true (no AWS needed)
// =============================================================================

import {
  mockServices,
  mockWorkers,
  mockBookings,
  mockReviews,
  mockVerifications,
  mockDashboardStats,
  mockUsers,
} from './mockData';

// Simulate network delay
const delay = (ms = 300) => new Promise((res) => setTimeout(res, ms));

// In-memory state (mutates during the session)
let services = [...mockServices];
let bookings = [...mockBookings];
let reviews = [...mockReviews];
let verifications = [...mockVerifications];
let trackingLocations = {};
// Tracks which overdue reminders the worker dismissed (mock-only, per session).
const readNotifications = new Set();
// In-memory payment records keyed by booking id (mock-only, per session).
const mockPayments = {};
// In-memory arrival-OTP records keyed by booking id (mock-only, per session).
const mockOtps = {};
function mockGenOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Helper to wrap response like axios
const resp = (data) => ({ data });

// Overdue = still owes work (pending/accepted/in_progress) AND scheduled time
// is in the past. Mirrors the backend reminders_handler._is_overdue logic.
const OVERDUE_STATUSES = ['pending', 'accepted', 'in_progress'];
function isOverdue(b) {
  if (!OVERDUE_STATUSES.includes(b.status)) return false;
  if (!b.scheduled_date) return false;
  const timePart = b.scheduled_time && /^\d{1,2}:\d{2}/.test(b.scheduled_time) ? b.scheduled_time : '23:59';
  const scheduled = new Date(`${String(b.scheduled_date).slice(0, 10)}T${timePart}:00Z`);
  if (Number.isNaN(scheduled.getTime())) return false;
  return Date.now() >= scheduled.getTime();
}

// =============================================================================
// Mock API handlers - match the real service layer interface
// =============================================================================

export const mockApi = {
  // --- Auth ---
  auth: {
    getMe: async () => {
      await delay();
      const role = localStorage.getItem('mock_role') || 'customer';
      const user = mockUsers[role];
      return resp({ user: { ...user, id: user.userId, phone: '+919876543210', city: 'Chennai' } });
    },
  },

  // --- Services ---
  services: {
    list: async () => {
      await delay();
      return resp({ services: services.filter((s) => s.is_active), count: services.length });
    },
    create: async (data) => {
      await delay(500);
      const newService = { id: `new-${Date.now()}`, ...data, is_active: true, created_at: new Date().toISOString() };
      services.push(newService);
      return resp({ service: newService });
    },
    update: async (id, data) => {
      await delay(500);
      const idx = services.findIndex((s) => s.id === id);
      if (idx >= 0) services[idx] = { ...services[idx], ...data };
      return resp({ service: services[idx] });
    },
    delete: async (id) => {
      await delay(500);
      const idx = services.findIndex((s) => s.id === id);
      if (idx >= 0) services[idx].is_active = false;
      return resp({ message: 'Service deleted successfully' });
    },
  },

  // --- Workers ---
  workers: {
    list: async (serviceId) => {
      await delay();
      let result = mockWorkers;
      if (serviceId) {
        result = result.filter((w) => w.services.some((s) => s.id === serviceId));
      }
      return resp({ workers: result, count: result.length });
    },
    getRecommended: async (serviceId, limit = 5) => {
      await delay();
      let result = [...mockWorkers].sort((a, b) => b.recommendation_score - a.recommendation_score);
      if (serviceId) {
        result = result.filter((w) => w.services.some((s) => s.id === serviceId));
      }
      result = result.slice(0, limit).map((w, i) => ({ ...w, rank: i + 1 }));
      return resp({
        workers: result,
        count: result.length,
        algorithm: 'rule_based_scoring_v1',
        scoring: { rating_weight: 40, experience_weight: 25, review_count_weight: 20, availability_bonus: 15 },
      });
    },
    getById: async (id) => {
      await delay();
      const worker = mockWorkers.find((w) => w.id === id);
      return resp({ worker });
    },
    getReviews: async (id) => {
      await delay();
      const workerReviews = reviews.filter((r) => r.worker_id === id);
      return resp({
        reviews: workerReviews,
        count: workerReviews.length,
        average_rating: workerReviews.length ? (workerReviews.reduce((s, r) => s + r.rating, 0) / workerReviews.length).toFixed(1) : 0,
        total_reviews: workerReviews.length,
      });
    },
    getProfile: async () => {
      await delay();
      const worker = mockWorkers[0];
      return resp({ profile: { ...worker, profile_id: 'wp1', phone: '+919876543213', address: '8 Adyar, Chennai' } });
    },
    updateProfile: async () => {
      await delay(500);
      return resp({ message: 'Profile updated successfully' });
    },
    getAvailability: async () => {
      await delay();
      return resp({ availability: mockWorkers[0].availability });
    },
    setAvailability: async () => {
      await delay(500);
      return resp({ message: 'Availability updated successfully' });
    },
    updateLocation: async (latitude, longitude, mode = 'live') => {
      await delay(300);
      return resp({ message: 'Location updated', mode });
    },
  },

  // --- Bookings ---
  bookings: {
    create: async (data) => {
      await delay(500);
      const worker = mockWorkers.find((w) => w.id === data.worker_id);
      const newBooking = {
        id: `new-${Date.now()}`,
        ...data,
        status: 'pending',
        worker_name: worker?.full_name || 'Worker',
        customer_name: 'Priya Sharma',
        service_name: services.find((s) => s.id === data.service_id)?.name || 'Service',
        total_amount: (worker?.hourly_rate || 500) * (data.duration_hours || 1),
        created_at: new Date().toISOString(),
      };
      bookings.unshift(newBooking);
      return resp({ message: 'Booking created successfully', total_amount: newBooking.total_amount });
    },
    listMine: async (status) => {
      await delay();
      let result = bookings.filter((b) => b.customer_id === 'c1000000-0000-0000-0000-000000000001');
      if (status) result = result.filter((b) => b.status === status);
      // Most recently booked first (match backend ordering).
      result = [...result].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      return resp({ bookings: result, count: result.length });
    },
    getById: async (id) => {
      await delay();
      return resp({ booking: bookings.find((b) => b.id === id) });
    },
    cancel: async (id) => {
      await delay(500);
      const b = bookings.find((b) => b.id === id);
      if (b) b.status = 'cancelled';
      return resp({ message: 'Booking cancelled successfully' });
    },
    listWorkerBookings: async (status) => {
      await delay();
      let result = bookings.filter((b) => b.worker_id === 'w1000000-0000-0000-0000-000000000001');
      if (status) result = result.filter((b) => b.status === status);
      return resp({ bookings: result, count: result.length });
    },
    getWorkerBooking: async (id) => {
      await delay();
      return resp({ booking: bookings.find((b) => b.id === id) });
    },
    respond: async (id, action) => {
      await delay(500);
      const b = bookings.find((b) => b.id === id);
      if (b) b.status = action === 'accept' ? 'accepted' : 'rejected';
      return resp({ message: `Booking ${b?.status}`, status: b?.status });
    },
    updateStatus: async (id, status) => {
      await delay(500);
      const b = bookings.find((b) => b.id === id);
      if (b) b.status = status;
      return resp({ message: `Booking status updated to ${status}`, status });
    },
    createReview: async (data) => {
      await delay(500);
      reviews.push({ id: `r-${Date.now()}`, ...data, customer_name: 'Priya Sharma', created_at: new Date().toISOString() });
      return resp({ message: 'Review submitted successfully' });
    },
    initiateCall: async (bookingId) => {
      await delay(500);
      const b = bookings.find((bk) => (bk.id === bookingId || bk.booking_id === bookingId));
      if (!b) {
        const err = new Error('Booking not found');
        err.response = { status: 404, data: { error: 'Booking not found' } };
        throw err;
      }
      if (!['accepted', 'in_progress'].includes(b.status)) {
        const err = new Error('Not active');
        err.response = { status: 409, data: { error: 'Calling is only available for active bookings' } };
        throw err;
      }
      // Mock mode simulates provider "not configured" so no numbers are involved
      return resp({ call_status: 'calling', masked: true, message: 'Connecting your call. Please answer your phone.' });
    },
    updateLocation: async (id, data) => {
      await delay(100);
      trackingLocations[id] = {
        booking_id: id,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        heading: parseFloat(data.heading || 0),
        speed: parseFloat(data.speed || 0),
        accuracy: data.accuracy != null ? parseFloat(data.accuracy) : null,
        timestamp: data.timestamp || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return resp({ message: 'Location updated', data: trackingLocations[id] });
    },
    getLocation: async (id) => {
      await delay(100);
      const b = bookings.find((bk) => (bk.id === id || bk.booking_id === id));
      return resp({
        booking_id: id,
        status: b?.status || 'unknown',
        location: trackingLocations[id] || null,
        address: b?.address || '',
        worker_id: b?.worker_id || null,
        worker_name: b?.worker_name || 'Assigned Specialist',
      });
    },
    // Arrival OTP (Ola/Uber-style) — mock implementation.
    getArrivalOtp: async (bookingId) => {
      await delay(200);
      const b = bookings.find((bk) => (bk.id === bookingId || bk.booking_id === bookingId));
      if (!b) { const e = new Error('nf'); e.response = { status: 404, data: { error: 'Booking not found' } }; throw e; }
      let rec = mockOtps[bookingId];
      if (b.status !== 'accepted') {
        if (rec && rec.verified) return resp({ otp: null, status: 'verified', verified: true, valid: false, message: 'Arrival already verified.' });
        return resp({ otp: null, status: b.status, valid: false, message: 'Arrival verification is no longer required.' });
      }
      const now = Date.now();
      if (!rec || now >= rec.expires) {
        rec = { code: mockGenOtp(), expires: now + 900000, attempts: 0, verified: false, lastRegen: now };
        mockOtps[bookingId] = rec;
      }
      return resp({
        otp: rec.verified ? null : rec.code,
        status: rec.verified ? 'verified' : 'active',
        valid: !rec.verified,
        verified: rec.verified,
        expires_at: new Date(rec.expires).toISOString(),
        seconds_remaining: Math.max(0, Math.round((rec.expires - now) / 1000)),
      });
    },
    regenerateArrivalOtp: async (bookingId) => {
      await delay(300);
      const now = Date.now();
      const prev = mockOtps[bookingId];
      if (prev && now - prev.lastRegen < 30000) {
        const e = new Error('cooldown');
        e.response = { status: 429, data: { error: `Please wait ${30 - Math.round((now - prev.lastRegen) / 1000)}s before requesting a new code.` } };
        throw e;
      }
      const rec = { code: mockGenOtp(), expires: now + 900000, attempts: 0, verified: false, lastRegen: now };
      mockOtps[bookingId] = rec;
      return resp({ otp: rec.code, status: 'active', valid: true, verified: false, expires_at: new Date(rec.expires).toISOString(), seconds_remaining: 900 });
    },
    verifyArrivalOtp: async (bookingId, otp) => {
      await delay(400);
      const b = bookings.find((bk) => (bk.id === bookingId || bk.booking_id === bookingId));
      if (!b) { const e = new Error('nf'); e.response = { status: 404, data: { error: 'Booking not found' } }; throw e; }
      if (b.status === 'in_progress') return resp({ verified: true, status: 'in_progress', message: 'Arrival already verified.' });
      if (b.status !== 'accepted') { const e = new Error('x'); e.response = { status: 409, data: { error: 'This booking is not awaiting arrival verification.' } }; throw e; }
      const rec = mockOtps[bookingId];
      if (!rec || Date.now() >= rec.expires) { const e = new Error('x'); e.response = { status: 410, data: { error: 'The code has expired. Ask the customer to regenerate it.' } }; throw e; }
      if (String(otp).trim() !== rec.code) {
        rec.attempts += 1;
        const e = new Error('x'); e.response = { status: 400, data: { error: `Incorrect code. ${Math.max(0, 5 - rec.attempts)} attempt(s) left.` } }; throw e;
      }
      rec.verified = true; rec.code = null;
      b.status = 'in_progress';
      return resp({ verified: true, status: 'in_progress', message: 'Arrival verified. You can start the service.' });
    },
    // Overdue monitoring (Enhancement). Computed dynamically so marking a job
    // complete immediately removes it from the overdue list in mock mode.
    listWorkerOverdue: async () => {
      await delay(200);
      const list = bookings
        .filter((b) => b.worker_id === 'w1000000-0000-0000-0000-000000000001')
        .filter(isOverdue)
        .map((b) => ({
          booking_id: b.id || b.booking_id,
          booking_type: b.booking_type || 'manual',
          customer_name: b.customer_name,
          service_name: b.service_name,
          scheduled_date: b.scheduled_date,
          scheduled_time: b.scheduled_time,
          status: b.status,
          address: b.address,
          total_amount: b.total_amount,
          overdue_since: b.overdue_since || `${b.scheduled_date}T${b.scheduled_time || '23:59'}:00Z`,
        }));
      return resp({ overdue_bookings: list, count: list.length });
    },
    listAdminOverdue: async () => {
      await delay(200);
      const list = bookings.filter(isOverdue).map((b) => ({
        id: b.id || b.booking_id,
        booking_type: b.booking_type || 'manual',
        service_name: b.service_name,
        customer_name: b.customer_name,
        worker_name: b.worker_name,
        scheduled_date: b.scheduled_date,
        scheduled_time: b.scheduled_time,
        status: b.status,
        total_amount: b.total_amount,
        overdue_since: b.overdue_since || `${b.scheduled_date}T${b.scheduled_time || '23:59'}:00Z`,
      }));
      return resp({ overdue_bookings: list, count: list.length });
    },
  },

  // --- Payments (Razorpay TEST MODE simulation) ---
  // Payment state is kept separate from booking state and persists in-memory
  // for the session so dashboards stay consistent.
  payments: {
    createOrder: async (bookingId) => {
      await delay(400);
      const b = bookings.find((bk) => (bk.id === bookingId || bk.booking_id === bookingId));
      if (!b) {
        const err = new Error('Booking not found');
        err.response = { status: 404, data: { error: 'Booking not found' } };
        throw err;
      }
      if (!['accepted', 'in_progress', 'completed'].includes(b.status)) {
        const err = new Error('Not payable');
        err.response = { status: 409, data: { error: 'This booking is not eligible for payment yet' } };
        throw err;
      }
      const existing = mockPayments[bookingId];
      if (existing && ['SUCCESSFUL', 'AUTHORIZED'].includes(existing.status)) {
        const err = new Error('Already paid');
        err.response = { status: 409, data: { error: 'This booking is already paid or being processed' } };
        throw err;
      }
      const amount = Math.round((b.total_amount || 0) * 100);
      const orderId = `order_mock_${Date.now()}`;
      mockPayments[bookingId] = {
        booking_id: bookingId,
        status: 'PENDING',
        amount,
        currency: 'INR',
        razorpay_order_id: orderId,
        attempt: existing ? (existing.attempt || 1) + 1 : 1,
        created_at: new Date().toISOString(),
      };
      return resp({
        key_id: 'rzp_test_mock',
        razorpay_order_id: orderId,
        amount,
        currency: 'INR',
        payment_id: `pay_rec_${Date.now()}`,
        booking: { booking_id: bookingId, service_name: b.service_name, amount_display: b.total_amount },
      });
    },
    verify: async (payload) => {
      await delay(400);
      const bookingId = payload.booking_id;
      const p = mockPayments[bookingId];
      if (!p) {
        const err = new Error('No payment');
        err.response = { status: 404, data: { error: 'No payment found for this booking' } };
        throw err;
      }
      // Mock: a non-"mock_signature" value simulates a signature failure.
      if (payload.razorpay_signature !== 'mock_signature') {
        p.status = 'FAILED';
        const err = new Error('Signature failed');
        err.response = { status: 400, data: { error: 'Payment signature verification failed' } };
        throw err;
      }
      p.status = 'SUCCESSFUL';
      p.razorpay_payment_id = payload.razorpay_payment_id;
      p.captured_at = new Date().toISOString();
      // Commission split (mirrors backend COMMISSION_RATE default 10%).
      const rate = 0.10;
      p.commission_rate = rate;
      p.commission_amount = Math.round(p.amount * rate);
      p.worker_payout = p.amount - p.commission_amount;
      p.settlement_status = 'settled';
      return resp({
        status: 'SUCCESSFUL',
        message: 'Payment successful',
        payment: { ...p, amount_display: p.amount / 100 },
      });
    },
    getStatus: async (bookingId) => {
      await delay(200);
      const p = mockPayments[bookingId];
      return resp({
        booking_id: bookingId,
        payment_status: p ? p.status : 'NONE',
        payment: p ? { ...p, amount_display: p.amount / 100 } : null,
      });
    },
    listAdmin: async (status) => {
      await delay(300);
      let list = Object.values(mockPayments);
      if (status) list = list.filter((p) => p.status === status);
      const withNames = list.map((p) => {
        const b = bookings.find((bk) => (bk.id === p.booking_id || bk.booking_id === p.booking_id)) || {};
        return {
          ...p,
          amount_display: p.amount / 100,
          customer_name: b.customer_name || 'Customer',
          worker_name: b.worker_name || '',
          service_name: b.service_name || '',
        };
      });
      return resp({ payments: withNames, count: withNames.length });
    },
    // Worker earnings dashboard (mock): payments for the mock worker's bookings.
    listWorker: async () => {
      await delay(300);
      const workerId = 'w1000000-0000-0000-0000-000000000001';
      const month = new Date().toISOString().slice(0, 7);
      let totalEarned = 0; let thisMonth = 0; let pending = 0; let completed = 0;
      const items = [];
      Object.values(mockPayments).forEach((p) => {
        const b = bookings.find((bk) => (bk.id === p.booking_id || bk.booking_id === p.booking_id));
        if (!b || b.worker_id !== workerId) return;
        const net = (p.amount - (p.refunded_amount || 0)) / 100;
        if (p.status === 'SUCCESSFUL') {
          totalEarned += net; completed += 1;
          if ((p.captured_at || '').slice(0, 7) === month) thisMonth += net;
        } else if (p.status === 'PENDING' || p.status === 'AUTHORIZED') {
          pending += p.amount / 100;
        }
        items.push({
          booking_id: p.booking_id,
          status: p.status,
          amount: p.amount,
          amount_display: p.amount / 100,
          currency: p.currency || 'INR',
          razorpay_order_id: p.razorpay_order_id,
          razorpay_payment_id: p.razorpay_payment_id,
          captured_at: p.captured_at,
          created_at: p.created_at,
          refunded_amount: p.refunded_amount || 0,
          service_name: b.service_name || '',
          customer_name: b.customer_name || 'Customer',
          scheduled_date: b.scheduled_date || '',
          scheduled_time: b.scheduled_time || '',
        });
      });
      return resp({
        payments: items,
        count: items.length,
        summary: {
          total_earned: totalEarned,
          this_month: thisMonth,
          pending,
          completed_payments: completed,
          currency: 'INR',
        },
      });
    },
  },

  // --- Notifications (Enhancement) ---
  // Overdue reminders are derived from overdue bookings so they stay in sync
  // with status changes; priority alerts are omitted in mock mode.
  notifications: {
    list: async () => {
      await delay(150);
      const notifs = bookings
        .filter((b) => b.worker_id === 'w1000000-0000-0000-0000-000000000001')
        .filter(isOverdue)
        .map((b) => ({
          notification_id: `NOTIF#OVERDUE#${b.id || b.booking_id}`,
          kind: 'booking_overdue',
          booking_id: b.id || b.booking_id,
          service_name: b.service_name,
          customer_name: b.customer_name,
          scheduled_date: b.scheduled_date,
          scheduled_time: b.scheduled_time,
          booking_status: b.status,
          message: `Booking for ${b.service_name} with ${b.customer_name} on ${b.scheduled_date} is overdue. Please update its status or mark it completed.`,
          read: readNotifications.has(`NOTIF#OVERDUE#${b.id || b.booking_id}`),
          created_at: b.overdue_since || `${b.scheduled_date}T${b.scheduled_time || '23:59'}:00Z`,
        }))
        .filter((n) => !n.read);
      return resp({ notifications: notifs, count: notifs.length, unread_count: notifs.length });
    },
    markRead: async (notificationId) => {
      await delay(100);
      readNotifications.add(notificationId);
      return resp({ message: 'Notification marked as read' });
    },
  },

  // --- Priority Booking (Feature 3) ---
  // Simulates the full matching lifecycle in-memory so the UI is fully usable
  // in mock mode without AWS.
  priority: {
    create: async (data) => {
      await delay(700);
      const service = services.find((s) => s.id === data.service_id);
      // Deterministic mock: pick the top-recommended worker as the match
      const worker = [...mockWorkers].sort((a, b) => b.recommendation_score - a.recommendation_score)[0];
      const id = `pri-${Date.now()}`;
      const booking = {
        id,
        booking_id: id,
        booking_type: 'priority',
        status: 'worker_pending',
        customer_id: 'c1000000-0000-0000-0000-000000000001',
        worker_id: worker?.id,
        worker_name: worker?.full_name || 'Worker',
        service_id: data.service_id,
        service_name: service?.name || 'Service',
        scheduled_date: data.scheduled_date || new Date().toISOString().slice(0, 10),
        scheduled_time: data.scheduled_time || '',
        address: data.address || '',
        notes: data.special_requirements || '',
        total_amount: (worker?.hourly_rate || 500) * (data.duration_hours || 1),
        match_score: 92,
        created_at: new Date().toISOString(),
      };
      bookings.unshift(booking);
      return resp({ message: 'Priority request created', booking_id: id, status: booking.status, match_score: 92 });
    },
    listCustomer: async () => {
      await delay();
      const result = bookings
        .filter((b) => b.booking_type === 'priority' && b.customer_id === 'c1000000-0000-0000-0000-000000000001')
        .map((b) => ({
          booking_id: b.id,
          booking_type: 'priority',
          status: b.status,
          service_name: b.service_name,
          scheduled_date: b.scheduled_date,
          scheduled_time: b.scheduled_time,
          total_amount: b.total_amount,
          match_score: b.match_score,
          created_at: b.created_at,
          worker: b.worker_id ? { worker_id: b.worker_id, full_name: b.worker_name, match_score: b.match_score } : undefined,
        }));
      return resp({ priority_bookings: result, count: result.length });
    },
    listWorkerRequests: async () => {
      await delay();
      const result = bookings
        .filter((b) => b.booking_type === 'priority' && b.status === 'worker_pending')
        .map((b) => ({
          booking_id: b.id,
          booking_type: 'priority',
          customer_name: b.customer_name || 'Customer',
          service_name: b.service_name,
          scheduled_date: b.scheduled_date,
          scheduled_time: b.scheduled_time,
          address: b.address || 'Chennai, Tamil Nadu',
          area: b.address ? b.address.split(',').pop().trim() : 'Chennai',
          estimated_earnings: b.total_amount,
          match_score: b.match_score,
          special_requirements: b.notes || 'Emergency service requested',
        }));
      return resp({ priority_requests: result, count: result.length });
    },
    accept: async (id) => {
      await delay(500);
      const b = bookings.find((bk) => bk.id === id);
      if (b) b.status = 'accepted';
      return resp({ message: 'Priority booking confirmed', status: 'accepted' });
    },
    reject: async (id) => {
      await delay(500);
      const b = bookings.find((bk) => bk.id === id);
      if (b) b.status = 'no_worker_available'; // mock: single candidate, so no more
      return resp({ message: 'Request declined; finding the next best worker', status: b?.status });
    },
    rematch: async (id) => {
      await delay(600);
      const b = bookings.find((bk) => bk.id === id);
      if (b) b.status = 'worker_pending';
      return resp({ message: 'Rematching', status: 'worker_pending' });
    },
    cancel: async (id) => {
      await delay(400);
      const b = bookings.find((bk) => bk.id === id);
      if (b) b.status = 'cancelled';
      return resp({ message: 'Priority request cancelled', status: 'cancelled' });
    },
  },

  // --- Verification ---
  verification: {
    getUploadUrl: async (fileName) => {
      await delay(500);
      return resp({ upload_url: 'https://mock-s3-url.example.com/upload', s3_key: `verifications/mock/${fileName}`, expires_in: 900 });
    },
    submit: async (data) => {
      await delay(500);
      verifications.push({ id: `v-${Date.now()}`, ...data, status: 'pending', worker_name: 'Suresh Kumar', created_at: new Date().toISOString() });
      return resp({ message: 'Verification document submitted successfully' });
    },
    getStatus: async () => {
      await delay();
      const workerDocs = verifications.filter((v) => v.worker_id === 'w1000000-0000-0000-0000-000000000001');
      return resp({
        documents: workerDocs,
        is_fully_verified: workerDocs.length > 0 && workerDocs.every((d) => d.status === 'approved'),
        has_pending: workerDocs.some((d) => d.status === 'pending'),
      });
    },
    listPending: async (status = 'pending') => {
      await delay();
      return resp({ verifications: verifications.filter((v) => v.status === status), count: verifications.filter((v) => v.status === status).length });
    },
    getDetail: async (id) => {
      await delay();
      const doc = verifications.find((v) => v.id === id);
      return resp({ verification: { ...doc, download_url: 'https://via.placeholder.com/600x400?text=Mock+Document' } });
    },
    review: async (id, action, notes) => {
      await delay(500);
      const doc = verifications.find((v) => v.id === id);
      if (doc) {
        doc.status = action === 'approve' ? 'approved' : 'rejected';
        doc.admin_notes = notes;
        doc.reviewed_at = new Date().toISOString();
      }
      return resp({ message: `Document ${doc?.status}`, status: doc?.status });
    },
    uploadToS3: async () => {
      await delay(1000);
      return resp({});
    },
  },

  // --- Customer ---
  customer: {
    getProfile: async () => {
      await delay();
      return resp({ profile: { id: 'c1', full_name: 'Priya Sharma', email: 'customer1@demo.com', phone: '+919876543211', address: '42 Anna Nagar, Chennai 600040', city: 'Chennai', total_bookings: 5 } });
    },
    updateProfile: async () => {
      await delay(500);
      return resp({ message: 'Profile updated successfully' });
    },
  },

  // --- Admin ---
  admin: {
    getDashboard: async () => {
      await delay();
      return resp(mockDashboardStats);
    },
    listUsers: async (params = {}) => {
      await delay();
      const all = [
        { id: 'c-001', full_name: 'Priya Sharma', email: 'customer1@demo.com', role: 'customer', status: 'active', city: 'Chennai', created_at: '2026-08-01T00:00:00Z' },
        { id: 'w-001', full_name: 'Suresh Kumar', email: 'worker1@demo.com', role: 'worker', status: 'active', city: 'Chennai', created_at: '2026-08-01T00:00:00Z' },
        { id: 'admin-001', full_name: 'Platform Admin', email: 'admin@connect360.com', role: 'admin', status: 'active', city: 'Chennai', created_at: '2026-08-01T00:00:00Z' },
      ];
      let users = all;
      if (params.role) users = users.filter((u) => u.role === params.role);
      if (params.status) users = users.filter((u) => u.status === params.status);
      if (params.q) {
        const q = params.q.toLowerCase();
        users = users.filter((u) => `${u.full_name} ${u.email}`.toLowerCase().includes(q));
      }
      return resp({
        users,
        counts: {
          total: all.length,
          customer: all.filter((u) => u.role === 'customer').length,
          worker: all.filter((u) => u.role === 'worker').length,
          admin: all.filter((u) => u.role === 'admin').length,
          suspended: all.filter((u) => u.status === 'suspended').length,
        },
      });
    },
    updateUser: async (id, changes) => {
      await delay();
      return resp({ message: 'User updated (mock)', user: { id, ...changes } });
    },
    listPayments: async (status) => {
      await delay(300);
      let list = Object.values(mockPayments);
      if (status) list = list.filter((p) => p.status === status);
      const withNames = list.map((p) => {
        const b = bookings.find((bk) => (bk.id === p.booking_id || bk.booking_id === p.booking_id)) || {};
        return {
          ...p,
          amount_display: p.amount / 100,
          commission_display: (p.commission_amount || 0) / 100,
          worker_payout_display: (p.worker_payout || 0) / 100,
          customer_name: b.customer_name || 'Customer',
          worker_name: b.worker_name || '',
          service_name: b.service_name || '',
        };
      });
      return resp({ payments: withNames, count: withNames.length });
    },
    getPaymentAnalytics: async () => {
      await delay(300);
      const captured = ['SUCCESSFUL', 'REFUNDED', 'PARTIALLY_REFUNDED'];
      let gmv = 0; let commission = 0; let payouts = 0; let pending = 0; let refunded = 0; let count = 0;
      const byCat = {}; const byMonth = {};
      Object.values(mockPayments).forEach((p) => {
        const b = bookings.find((bk) => (bk.id === p.booking_id || bk.booking_id === p.booking_id)) || {};
        if (captured.includes(p.status)) {
          gmv += p.amount;
          commission += p.commission_amount || 0;
          payouts += p.worker_payout != null ? p.worker_payout : p.amount;
          refunded += p.refunded_amount || 0;
          count += 1;
          const svc = b.service_name || 'Other';
          byCat[svc] = (byCat[svc] || 0) + p.amount;
          const m = (p.captured_at || p.created_at || '').slice(0, 7);
          if (m) byMonth[m] = (byMonth[m] || 0) + p.amount;
        } else if (['PENDING', 'AUTHORIZED'].includes(p.status)) {
          pending += p.amount;
        }
      });
      const rupees = (x) => Math.round(x) / 100;
      const by_category = Object.entries(byCat)
        .map(([name, v]) => ({ name, amount: rupees(v), pct: gmv ? Math.round((v / gmv) * 1000) / 10 : 0 }))
        .sort((a, b) => b.amount - a.amount);
      const trend = Object.entries(byMonth).sort().map(([m, v]) => ({ month: m, gmv: rupees(v) }));
      let growth_pct = null;
      if (trend.length >= 2 && trend[trend.length - 2].gmv > 0) {
        const prev = trend[trend.length - 2].gmv; const curr = trend[trend.length - 1].gmv;
        growth_pct = Math.round(((curr - prev) / prev) * 1000) / 10;
      }
      return resp({
        summary: {
          gmv: rupees(gmv), commission: rupees(commission), payouts: rupees(payouts),
          pending: rupees(pending), refunded: rupees(refunded), captured_count: count,
          effective_take_rate: gmv ? Math.round((commission / gmv) * 10000) / 100 : 0,
          growth_pct, currency: 'INR',
        },
        by_category,
        trend,
      });
    },
    listOverdueBookings: async () => {
      await delay();
      const list = bookings.filter(isOverdue).map((b) => ({
        id: b.id || b.booking_id,
        booking_type: b.booking_type || 'manual',
        service_name: b.service_name,
        customer_name: b.customer_name,
        worker_name: b.worker_name,
        scheduled_date: b.scheduled_date,
        scheduled_time: b.scheduled_time,
        status: b.status,
        total_amount: b.total_amount,
        overdue_since: b.overdue_since || `${b.scheduled_date}T${b.scheduled_time || '23:59'}:00Z`,
      }));
      return resp({ overdue_bookings: list, count: list.length });
    },
    getRevenue: async () => {
      await delay();
      const total = mockDashboardStats?.stats?.revenue?.total_revenue || 1000;
      return resp({
        summary: { total_revenue: total, completed_bookings: 1, avg_ticket: total },
        by_category: [{ name: 'Plumbing', amount: total, pct: 100 }],
        trend: [{ month: '2026-08', amount: total }],
        transactions: [],
      });
    },
    listVerifications: async (status = 'pending') => {
      await delay();
      // Mirror the backend: filter the shared verifications array by status.
      const list = status ? verifications.filter((v) => v.status === status) : verifications;
      return resp({ verifications: list, count: list.length });
    },
    reviewVerification: async (id, payload = {}) => {
      await delay();
      const doc = verifications.find((v) => v.id === id);
      if (doc) {
        doc.status = payload.action === 'approve' ? 'approved' : 'rejected';
        doc.admin_notes = payload.notes || '';
        doc.reviewed_at = new Date().toISOString();
      }
      return resp({ message: `Document ${doc?.status || 'reviewed'}`, status: doc?.status });
    },
  },

  // --- AI Assistant (role-aware, rule-based in mock mode) ---
  assistant: {
    chat: async ({ message, role = 'customer', history = [] }) => {
      await delay(600);
      const msg = (message || '').toLowerCase();
      // Build context from history to handle follow-ups like "still not working"
      const historyText = history.map((h) => h.content || '').join(' ').toLowerCase();
      const combined = `${historyText} ${msg}`;
      let answer;
      if (['complaint', 'escalate', 'support', 'human', 'refund'].some((w) => msg.includes(w))) {
        answer = 'I can help you escalate this. You can contact Connect360 support or raise a complaint from your bookings page.';
      } else if (['status', 'when', 'arrive', 'coming', 'reschedule', 'cancel'].some((w) => msg.includes(w))) {
        answer = 'Bookings move through: pending → accepted → in progress → completed. You can view the current status on your bookings page.';
      } else if (msg.includes('priority') || msg.includes('urgent')) {
        answer = '⚡ For urgent jobs, use Priority Booking — describe your requirement and our system will automatically match you with the best available worker. You can find it on the booking page.';
      } else if (msg.includes('ac') || msg.includes('cool') || msg.includes('hvac')) {
        answer = 'Here are some safe steps to try:\n- Set the thermostat to "cool" below room temperature.\n- Clean or replace the air filter.\n- Ensure the outdoor unit has airflow.\n- If it still doesn\'t cool, book an AC technician.';
      } else if (msg.includes('washing') || msg.includes('drain')) {
        answer = role === 'worker'
          ? 'Preparation checklist:\n- Bring drain-cleaning tools, spare filter, and multimeter.\n- Check the model number in the booking notes.'
          : 'Here are some safe steps to try:\n- Check the drain hose for kinks/blockage and clean the filter.\n- Confirm power, water supply, and that the door is latched.';
      } else if (combined.includes('tv') || combined.includes('television') || msg.includes('repair') || msg.includes('not working') || msg.includes('appliance')) {
        if (msg.includes('still') || msg.includes('not fixed') || msg.includes('same')) {
          answer = 'Since the basic steps didn\'t help, it\'s best to get a professional to look at it. Would you like me to help you book a TV/appliance repair technician?';
        } else {
          answer = 'Here are some safe steps to try:\n- Unplug the TV, wait 60 seconds, and plug it back in.\n- Check all cable connections (power, HDMI, antenna).\n- Try a different power outlet.\n- Replace the remote batteries.\n\nIf these don\'t help, I can help you book a repair technician!';
        }
      } else if (msg.includes('clean') || msg.includes('household') || msg.includes('house') || msg.includes('sweep') || msg.includes('mop')) {
        answer = 'Connect360 offers professional home cleaning services including deep cleaning, regular housekeeping, and post-construction cleanup. You can browse available cleaners and book directly from the services page.';
      } else if (msg.includes('plumb') || msg.includes('pipe') || msg.includes('leak') || msg.includes('tap') || msg.includes('water')) {
        answer = 'Here are some safe steps to try:\n- For a leak: turn off the local shut-off valve to limit water damage.\n- For a clog: a plunger may help minor blockages.\n- Hidden leaks or no water usually need a plumber.';
      } else if (msg.includes('electric') || msg.includes('wiring') || msg.includes('switch') || msg.includes('power')) {
        answer = 'For electrical issues:\n- Check if a breaker has tripped and reset it once.\n- Never open outlets or panels yourself — electrical work is unsafe.\n- Repeated tripping or sparking needs a licensed electrician immediately.';
      } else if (['service', 'services', 'offer', 'provide', 'price', 'cost', 'book'].some((w) => msg.includes(w))) {
        answer = 'Connect360 offers plumbing, electrical, cleaning, AC/HVAC, painting, carpentry, and appliance repair. You can see each professional\'s hourly rate on their profile.';
      } else if (role === 'worker') {
        answer = 'I can help with your assigned jobs: understanding the requested service, preparation checklists, safe troubleshooting, and completion steps. What do you need?';
      } else {
        answer = 'I can help you troubleshoot a problem, choose the right service, understand your booking status, or prepare for your technician\'s visit. What would you like help with?';
      }
      return resp({ answer, role, source: 'fallback', has_booking_context: false });
    },
  },

  // --- Priority Booking (matching engine + dispatch simulation) ---
  priority: {
    create: async (data) => {
      await delay(400);
      const bookingId = `pb-${Date.now()}`;
      const service = services.find((s) => s.id === data.service_id) || services[0] || { name: 'Emergency Service' };
      
      const eligible = mockWorkers.filter((w) => w.is_available && w.is_verified);
      const matchedWorker = eligible.find((w) => w.services?.some((s) => s.id === data.service_id)) || eligible[0] || mockWorkers[0];
      
      const newBooking = {
        id: bookingId,
        booking_id: bookingId,
        booking_type: 'priority',
        service_id: data.service_id,
        service_name: service.name,
        address: data.address || '1204 E Pine St, Capitol Hill',
        city: data.city || 'Chennai',
        scheduled_date: data.scheduled_date || new Date().toISOString().slice(0, 10),
        scheduled_time: data.scheduled_time || '10:00',
        urgency: data.urgency || 'asap',
        special_requirements: data.special_requirements || data.notes || '',
        notes: data.special_requirements || data.notes || '',
        total_amount: data.total_amount || 125,
        status: 'worker_pending',
        match_score: 96,
        worker_id: matchedWorker.id,
        worker_name: matchedWorker.full_name,
        customer_id: 'c1000000-0000-0000-0000-000000000001',
        customer_name: 'Priya Sharma',
        customer_phone: '+919876543210',
        offer_expires_at: new Date(Date.now() + 120000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        attempted_worker_ids: [matchedWorker.id],
        worker: {
          worker_id: matchedWorker.id,
          full_name: matchedWorker.full_name,
          rating_avg: matchedWorker.rating_avg || 4.9,
          match_score: 96,
          city: matchedWorker.city || 'Chennai',
        },
      };
      bookings.unshift(newBooking);
      return resp({
        message: 'Priority request created',
        booking_id: bookingId,
        status: 'worker_pending',
        match_score: 96,
        booking: newBooking,
      });
    },

    listCustomer: async () => {
      await delay(200);
      const list = bookings.filter((b) => b.booking_type === 'priority');
      return resp({
        priority_bookings: list.map((b) => ({
          booking_id: b.id || b.booking_id,
          id: b.id || b.booking_id,
          booking_type: 'priority',
          status: b.status,
          service_name: b.service_name,
          scheduled_date: b.scheduled_date,
          scheduled_time: b.scheduled_time,
          address: b.address,
          total_amount: b.total_amount,
          match_score: b.match_score || 95,
          created_at: b.created_at,
          worker: b.worker_id ? {
            worker_id: b.worker_id,
            full_name: b.worker_name,
            rating_avg: b.worker?.rating_avg || 4.9,
            match_score: b.match_score || 95,
          } : null,
        })),
        count: list.length,
      });
    },

    listWorkerRequests: async () => {
      await delay(200);
      const activeOffers = bookings.filter(
        (b) => b.booking_type === 'priority' && b.status === 'worker_pending'
      );
      return resp({
        priority_requests: activeOffers.map((r) => ({
          booking_id: r.id || r.booking_id,
          booking_type: 'priority',
          customer_name: r.customer_name || 'Client',
          service_name: r.service_name,
          scheduled_date: r.scheduled_date,
          scheduled_time: r.scheduled_time,
          area: r.address ? r.address.split(',').pop().trim() : 'Local Area',
          address: r.address,
          estimated_earnings: r.total_amount || 145,
          total_amount: r.total_amount || 145,
          match_score: r.match_score || 98,
          offer_expires_at: r.offer_expires_at || new Date(Date.now() + 60000).toISOString(),
          special_requirements: r.special_requirements || r.notes || '',
          notes: r.notes || '',
        })),
        count: activeOffers.length,
      });
    },

    accept: async (id) => {
      await delay(300);
      const idx = bookings.findIndex((b) => (b.id === id || b.booking_id === id));
      if (idx >= 0) {
        bookings[idx] = {
          ...bookings[idx],
          status: 'accepted',
          updated_at: new Date().toISOString(),
        };
      }
      return resp({ message: 'Priority booking confirmed', status: 'accepted' });
    },

    reject: async (id) => {
      await delay(300);
      const idx = bookings.findIndex((b) => (b.id === id || b.booking_id === id));
      if (idx >= 0) {
        const attempted = bookings[idx].attempted_worker_ids || [];
        const nextWorker = mockWorkers.find((w) => !attempted.includes(w.id));
        if (nextWorker) {
          bookings[idx] = {
            ...bookings[idx],
            worker_id: nextWorker.id,
            worker_name: nextWorker.full_name,
            attempted_worker_ids: [...attempted, nextWorker.id],
            offer_expires_at: new Date(Date.now() + 120000).toISOString(),
            status: 'worker_pending',
            updated_at: new Date().toISOString(),
          };
          return resp({ message: 'Offer rejected, rematched to next candidate', status: 'worker_pending' });
        } else {
          bookings[idx] = {
            ...bookings[idx],
            status: 'no_worker_available',
            updated_at: new Date().toISOString(),
          };
          return resp({ message: 'No more workers available', status: 'no_worker_available' });
        }
      }
      return resp({ message: 'Offer rejected' });
    },

    rematch: async (id) => {
      await delay(300);
      const idx = bookings.findIndex((b) => (b.id === id || b.booking_id === id));
      if (idx >= 0) {
        bookings[idx] = {
          ...bookings[idx],
          status: 'worker_pending',
          offer_expires_at: new Date(Date.now() + 120000).toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return resp({ message: 'Rematch initiated', status: 'worker_pending' });
    },

    cancel: async (id) => {
      await delay(300);
      const idx = bookings.findIndex((b) => (b.id === id || b.booking_id === id));
      if (idx >= 0) {
        bookings[idx] = {
          ...bookings[idx],
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        };
      }
      return resp({ message: 'Priority booking cancelled', status: 'cancelled' });
    },
  },
};
