import api from '../config/api';
import { mockApi } from '../mock/mockApi';

const isMock = import.meta.env.VITE_MOCK_MODE === 'true';

/**
 * Notifications service (Enhancement).
 *
 * Surfaces the NOTIF#{user_id} items the backend already writes (priority
 * alerts + overdue booking reminders). The backend owns all authorization and
 * de-duplication; the frontend only lists and marks-as-read.
 */
export const notificationsService = isMock
  ? mockApi.notifications
  : {
      list: (unread = false) => api.get('/notifications', { params: { unread } }),
      // notificationId is the backend SK (e.g. "NOTIF#OVERDUE#<booking_id>").
      markRead: (notificationId) =>
        api.put('/notifications/placeholder/read', { notification_id: notificationId }),
    };
