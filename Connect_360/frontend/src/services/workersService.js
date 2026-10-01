import api from '../config/api';
import { mockApi } from '../mock/mockApi';

const isMock = import.meta.env.VITE_MOCK_MODE === 'true';

export const workersService = isMock ? mockApi.workers : {
  // Customer-facing
  list: (serviceId) => api.get('/workers', { params: { service_id: serviceId } }),
  getRecommended: (serviceId, limit = 5) =>
    api.get('/workers/recommended', { params: { service_id: serviceId, limit } }),
  getById: (id) => api.get(`/workers/${id}`),
  getReviews: (id) => api.get(`/workers/${id}/reviews`),

  // Worker's own profile
  getProfile: () => api.get('/worker/profile'),
  updateProfile: (data) => api.put('/worker/profile', data),

  // Worker availability
  getAvailability: () => api.get('/worker/availability'),
  setAvailability: (schedule) => api.put('/worker/availability', { schedule }),
};
