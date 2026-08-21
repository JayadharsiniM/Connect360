import api from '../config/api';
import { mockApi } from '../mock/mockApi';

const isMock = import.meta.env.VITE_MOCK_MODE === 'true';

export const bookingsService = isMock ? mockApi.bookings : {
  // Customer
  create: (data) => api.post('/bookings', data),
  listMine: (status) => api.get('/bookings', { params: { status } }),
  getById: (id) => api.get(`/bookings/${id}`),
  cancel: (id, reason) => api.put(`/bookings/${id}/cancel`, { reason }),

  // Worker
  listWorkerBookings: (status) => api.get('/worker/bookings', { params: { status } }),
  getWorkerBooking: (id) => api.get(`/worker/bookings/${id}`),
  respond: (id, action) => api.put(`/worker/bookings/${id}/respond`, { action }),
  updateStatus: (id, status) => api.put(`/worker/bookings/${id}/status`, { status }),

  // Reviews
  createReview: (data) => api.post('/reviews', data),
};
