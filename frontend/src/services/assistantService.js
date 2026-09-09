import api from '../config/api';
import { mockApi } from '../mock/mockApi';

const isMock = import.meta.env.VITE_MOCK_MODE === 'true';

/**
 * AI Assistant service.
 *
 * Real mode: POST /api/assistant/chat  { message, booking_id? }
 *   - Role + authorization are enforced entirely on the backend (from the JWT).
 *   - The frontend never decides access and never receives phone numbers.
 *
 * Mock mode: role is passed so the rule-based mock can tailor its reply. In real
 * mode role is ignored (the backend derives it from the token).
 */
export const assistantService = isMock
  ? {
      chat: ({ message, bookingId, role, history }) =>
        mockApi.assistant.chat({ message, role, history }),
    }
  : {
      chat: ({ message, bookingId, history }) =>
        api.post('/assistant/chat', {
          message,
          ...(bookingId ? { booking_id: bookingId } : {}),
          ...(history?.length ? { history } : {}),
        }),
    };
