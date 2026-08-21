import api from '../config/api';
import { mockApi } from '../mock/mockApi';

const isMock = import.meta.env.VITE_MOCK_MODE === 'true';

export const adminService = isMock ? mockApi.admin : {
  getDashboard: () => api.get('/admin/dashboard'),
};
