import axios from 'axios';
import { clearToken, readToken } from './tokenStorage.js';

export const UNAUTHORIZED_EVENT = 'poultrystock:unauthorized';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: { Accept: 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export function fieldErrorsFrom(error) {
  const fields = error.response?.data?.errors;
  if (!fields || typeof fields !== 'object') return {};
  return Object.fromEntries(
    Object.entries(fields).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? messages[0] : String(messages),
    ])
  );
}

export function messageFrom(error, fallback = 'Something went wrong. Please try again.') {
  if (!error.response) {
    return error.isAxiosError
      ? 'Cannot reach the Laravel API. Check Laragon and php artisan serve.'
      : (error.message || fallback);
  }
  return error.response.data?.message || fallback;
}

export default api;
