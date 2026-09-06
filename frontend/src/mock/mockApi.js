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

// Helper to wrap response like axios
const resp = (data) => ({ data });

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
    listVerifications: async () => {
      await delay();
      return resp({ verifications: [] });
    },
    reviewVerification: async (id, payload) => {
      await delay();
      return resp({ message: 'Reviewed (mock)', id, ...payload });
    },
  },

  // --- AI Assistant (role-aware, rule-based in mock mode) ---
  assistant: {
    chat: async ({ message, role = 'customer' }) => {
      await delay(600);
      const msg = (message || '').toLowerCase();
      let answer;
      if (['complaint', 'escalate', 'support', 'human', 'refund'].some((w) => msg.includes(w))) {
        answer = 'I can help you escalate this. You can contact Connect360 support or raise a complaint from your bookings page.';
      } else if (['status', 'when', 'arrive', 'coming', 'reschedule', 'cancel', 'book'].some((w) => msg.includes(w))) {
        answer = 'Bookings move through: pending → accepted → in progress → completed. You can view the current status on your bookings page.';
      } else if (msg.includes('ac') || msg.includes('cool')) {
        answer = 'Here are some safe steps to try:\n- Set the thermostat to "cool" below room temperature.\n- Clean or replace the air filter.\n- Ensure the outdoor unit has airflow.\n- If it still doesn\'t cool, book an AC technician.';
      } else if (msg.includes('washing') || msg.includes('drain')) {
        answer = role === 'worker'
          ? 'Preparation checklist:\n- Bring drain-cleaning tools, spare filter, and multimeter.\n- Check the model number in the booking notes.'
          : 'Here are some safe steps to try:\n- Check the drain hose for kinks/blockage and clean the filter.\n- Confirm power, water supply, and that the door is latched.';
      } else if (['service', 'services', 'offer', 'provide', 'price', 'cost'].some((w) => msg.includes(w))) {
        answer = 'Connect360 offers plumbing, electrical, cleaning, AC/HVAC, painting, carpentry, and appliance repair. You can see each professional\'s hourly rate on their profile.';
      } else if (role === 'worker') {
        answer = 'I can help with your assigned jobs: understanding the requested service, preparation checklists, safe troubleshooting, and completion steps. What do you need?';
      } else {
        answer = 'I can help you troubleshoot a problem, choose the right service, understand your booking status, or prepare for your technician\'s visit. What would you like help with?';
      }
      return resp({ answer, role, source: 'fallback', has_booking_context: false });
    },
  },
};
