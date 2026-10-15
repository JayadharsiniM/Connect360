import api from '../config/api';
import { mockApi } from '../mock/mockApi';

const isMock = import.meta.env.VITE_MOCK_MODE === 'true';

/**
 * Payments service (Razorpay, TEST MODE).
 *
 * The backend owns all trust: it computes the amount from the booking, creates
 * the Razorpay order, and verifies the signature. The frontend only opens
 * Checkout with the public test key_id + order_id returned by create-order, and
 * forwards the Checkout response to /verify. No secret ever reaches the client.
 */
export const paymentsService = isMock
  ? mockApi.payments
  : {
      createOrder: (bookingId) => api.post('/payments/create-order', { booking_id: bookingId }),
      verify: (payload) => api.post('/payments/verify', payload),
      getStatus: (bookingId) => api.get(`/payments/${bookingId}`),
      listAdmin: (status) => api.get('/admin/payments', { params: { status } }),
      listWorker: () => api.get('/worker/payments'),
    };

const RAZORPAY_CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let _scriptPromise = null;

/**
 * Load the Razorpay Checkout script once, safely. Resolves true when available
 * (or already present), rejects if the script fails to load.
 */
export function loadRazorpayScript() {
  if (isMock) return Promise.resolve(true);
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve(true);
  if (_scriptPromise) return _scriptPromise;

  _scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => reject(new Error('Razorpay script failed to load')));
      if (window.Razorpay) resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      _scriptPromise = null; // allow retry
      reject(new Error('Razorpay script failed to load'));
    };
    document.body.appendChild(script);
  });
  return _scriptPromise;
}
