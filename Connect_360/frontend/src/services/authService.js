import api from '../config/api';

export const authService = {
  // Get current user info from backend
  getMe: () => api.get('/auth/me'),
};
