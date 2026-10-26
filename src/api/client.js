// Thin fetch wrapper around the backend's response envelope:
// { success, api_code, request_id, message, data, errors, meta }

const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const TOKEN_KEY = 'sms.access_token';
const PRE_AUTH_KEY = 'sms.pre_auth_token';

function safeGet(key) {
  try { return window.sessionStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try {
    if (value) window.sessionStorage.setItem(key, value);
    else window.sessionStorage.removeItem(key);
  } catch { /* storage unavailable: keep the token in memory only */ }
}

let accessToken = safeGet(TOKEN_KEY);
let preAuthToken = safeGet(PRE_AUTH_KEY);
let onUnauthorized = () => {};

export const tokens = {
  get access() { return accessToken; },
  get preAuth() { return preAuthToken; },
  setAccess(t) { accessToken = t; safeSet(TOKEN_KEY, t); },
  setPreAuth(t) { preAuthToken = t; safeSet(PRE_AUTH_KEY, t); },
  clear() { this.setAccess(null); this.setPreAuth(null); },
};

export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

export class ApiError extends Error {
  constructor(status, body) {
    const first = body?.errors?.[0];
    super(body?.message || first?.message || `Request failed (${status})`);
    this.status = status;
    this.code = first?.code || 'UNKNOWN_ERROR';
    this.details = first?.details || {};
    this.apiCode = body?.api_code;
    this.requestId = body?.request_id;
    if (this.code === 'CONCURRENT_UPDATE') {
      this.message = 'Someone else changed this request while you were working on it. Reload the page and try again.';
    }
  }
  // Field errors from marshmallow arrive as details.fields = { name: [msg] }
  get fieldErrors() { return this.details?.fields || {}; }
}

function buildUrl(path, params) {
  const url = new URL(BASE + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }
  return BASE.startsWith('http') ? url.toString() : url.pathname + url.search;
}

/**
 * request('POST', '/auth/login', { body, params, usePreAuth, raw })
 * Returns { data, meta, message } on success; throws ApiError otherwise.
 */
export async function request(method, path, { body, params, usePreAuth = false, form } = {}) {
  const headers = { Accept: 'application/json' };
  const token = usePreAuth ? preAuthToken : accessToken;
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form; // FormData: the browser sets the multipart boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(buildUrl(path, params), { method, headers, body: payload });
  } catch {
    throw new ApiError(0, { message: 'Cannot reach the server. Check your connection and try again.' });
  }
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON response */ }
  if (!res.ok || (json && json.success === false)) {
    const err = new ApiError(res.status, json);
    if (res.status === 401 && !usePreAuth && path !== '/auth/login') onUnauthorized(err);
    throw err;
  }
  return { data: json?.data ?? null, meta: json?.meta ?? null, message: json?.message ?? '' };
}

export const http = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body, opts) => request('POST', path, { body: body ?? {}, ...opts }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  upload: (path, formData) => request('POST', path, { form: formData }),
};
