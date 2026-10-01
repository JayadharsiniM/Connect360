import api from '../config/api';
import { mockApi } from '../mock/mockApi';

const isMock = import.meta.env.VITE_MOCK_MODE === 'true';

export const customerService = isMock ? mockApi.customer : {
  getProfile: () => api.get('/customer/profile'),
  updateProfile: (data) => api.put('/customer/profile', data),
};
