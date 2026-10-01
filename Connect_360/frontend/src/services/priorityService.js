import api from '../config/api';
import { mockApi } from '../mock/mockApi';

const isMock = import.meta.env.VITE_MOCK_MODE === 'true';

/**
 * Priority Booking service (Feature 3).
 *
 * The matching engine and all authorization run entirely on the backend. The
 * frontend only submits a request and polls status; it never decides which
 * worker is chosen and never receives worker contact details.
 */
export const priorityService = isMock
  ? {
      create: (data) => mockApi.priority.create(data),
      listCustomer: () => mockApi.priority.listCustomer(),
      listWorkerRequests: () => mockApi.priority.listWorkerRequests(),
      accept: (id) => mockApi.priority.accept(id),
      reject: (id) => mockApi.priority.reject(id),
      rematch: (id) => mockApi.priority.rematch(id),
      cancel: (id) => mockApi.priority.cancel(id),
    }
  : {
      // Customer
      create: (data) => api.post('/bookings/priority', data),
      listCustomer: () => api.get('/customer/priority-bookings'),
      rematch: (id) => api.post(`/priority/${id}/rematch`),
      cancel: (id) => api.put(`/priority/${id}/cancel`),

      // Worker
      listWorkerRequests: () => api.get('/worker/priority-requests'),
      accept: (id) => api.post(`/priority/${id}/accept`),
      reject: (id) => api.post(`/priority/${id}/reject`),
    };
