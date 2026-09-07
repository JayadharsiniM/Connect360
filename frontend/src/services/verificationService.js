import api from '../config/api';
import axios from 'axios';
import { mockApi } from '../mock/mockApi';

const isMock = import.meta.env.VITE_MOCK_MODE === 'true';

export const verificationService = isMock ? mockApi.verification : {
  // Worker
  getUploadUrl: (data) =>
    api.post('/worker/verification/upload-url', { file_name: data.file_name, content_type: data.content_type }),
  submitDocument: (data) => api.post('/worker/verification', data),
  submit: (data) => api.post('/worker/verification', data),  // alias
  getStatus: () => api.get('/worker/verification'),

  // Admin
  listPending: (status = 'pending') =>
    api.get('/admin/verifications', { params: { status } }),
  listVerifications: (status = 'pending') =>
    api.get('/admin/verifications', { params: { status } }),  // alias
  getDetail: (id) => api.get(`/admin/verifications/${id}`),
  review: (id, action, notes) =>
    api.put(`/admin/verifications/${id}`, { action, notes }),
  reviewVerification: (id, data) =>
    api.put(`/admin/verifications/${id}`, data),  // alias

  // Upload file directly to S3 using pre-signed URL
  uploadToS3: (presignedUrl, file, contentType) =>
    axios.put(presignedUrl, file, {
      headers: { 'Content-Type': contentType },
    }),
};
