import api from '../config/api';
import { mockApi } from '../mock/mockApi';

const isMock = import.meta.env.VITE_MOCK_MODE === 'true';

export const adminService = isMock ? mockApi.admin : {
  getDashboard: () => api.get('/admin/dashboard'),

  // User management
  listUsers: (params = {}) => api.get('/admin/users', { params }),
  updateUser: (id, changes) => api.patch(`/admin/users/${id}`, changes),

  // Revenue analytics
  getRevenue: () => api.get('/admin/revenue'),

  // Overdue bookings (Enhancement): scheduled time passed but not completed.
  listOverdueBookings: () => api.get('/admin/overdue-bookings'),

  // Payments (Razorpay): admin payment management view + analytics.
  listPayments: (status) => api.get('/admin/payments', { params: { status } }),
  getPaymentAnalytics: () => api.get('/admin/payments/analytics'),

  // Verification queue (reuses the verification lambda's admin routes)
  listVerifications: (status = 'pending') =>
    api.get('/admin/verifications', { params: { status } }),
  reviewVerification: (id, { action, notes }) =>
    api.put(`/admin/verifications/${id}`, { action, notes }),
};
