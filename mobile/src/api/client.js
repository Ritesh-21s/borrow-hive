import axios from 'axios';
import { storage } from '../utils/storage';
import { API_URL } from '../constants/config';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  try {
    const token = await storage.getItem('authToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (_) {}
  return config;
});

// Normalize error responses
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.message ||
      (err.request ? 'Network error. Check your connection.' : err.message);
    return Promise.reject({ ...err, userMessage: message });
  }
);

export default api;
