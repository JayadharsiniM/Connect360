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
  },
};
