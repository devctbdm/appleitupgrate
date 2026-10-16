// src/lib/http.ts
// Centralized Fetch API client.
//
// - Appends `/api` exactly once via `buildApiUrl`.
// - Handles JSON and FormData bodies automatically.
// - Sends cookies (`credentials: 'include'`) and the mobile Bearer token.
// - Throws a typed `ApiError` on non-2xx responses.
import { buildApiUrl, getApiBase, API_ROOT } from './apiConfig';

export { getApiBase, API_ROOT };
export const API_BASE = API_ROOT;

export class ApiError extends Error {
  status: number;
  data: any;
  /** Axios-compatible shape so existing `err?.response?.data` call sites keep working. */
  response: { data: any; status: number; statusText: string };

  constructor(message: string, status: number, data: any, statusText = '') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.response = { data, status, statusText };
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, unknown>;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
};

export type ApiResponse<T = any> = { data: T; status: number; ok: boolean };

export async function request<T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const fullUrl = buildApiUrl(url, options.params);

  const headers: Record<string, string> = { ...(options.headers || {}) };

  let body: BodyInit | undefined;
  const raw = options.body;
  if (raw instanceof FormData) {
    // Let the browser set the multipart boundary.
    body = raw;
  } else if (raw instanceof Blob || raw instanceof ArrayBuffer || typeof raw === 'string') {
    body = raw;
  } else if (raw !== undefined && raw !== null) {
    body = JSON.stringify(raw);
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  }

  // Inject the mobile/hybrid Bearer token when present (mirrors the old interceptor).
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('mobile_token');
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(fullUrl, {
    method,
    headers,
    body,
    credentials: options.credentials || 'include',
    signal: options.signal,
  });

  let data: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (res.status !== 204 && res.status !== 205) {
    if (contentType.includes('application/json')) {
      data = await res.json().catch(() => null);
    } else {
      data = await res.text().catch(() => null);
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && (data.message || data.error)) ||
      res.statusText ||
      'Request failed';
    throw new ApiError(message, res.status, data, res.statusText);
  }

  return { data: data as T, status: res.status, ok: res.ok };
}

export const apiClient = {
  get: <T = any>(url: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(url, { ...opts, method: 'GET' }),
  post: <T = any>(url: string, body?: any, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(url, { ...opts, method: 'POST', body }),
  put: <T = any>(url: string, body?: any, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(url, { ...opts, method: 'PUT', body }),
  patch: <T = any>(url: string, body?: any, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(url, { ...opts, method: 'PATCH', body }),
  delete: <T = any>(url: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(url, { ...opts, method: 'DELETE' }),
};

export default apiClient;
