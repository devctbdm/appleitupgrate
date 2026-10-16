// src/lib/axios.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api-appleitzone-com.onrender.com/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // For HTTP-Only Cookies (Web)
});

// Optional: Interceptor to inject mobile token if stored in localStorage (for hybrid web/mobile)
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // If you want to support Bearer tokens on web too (for testing)
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('mobile_token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
