/**
 * API Client untuk SIM RS
 *
 * Menggunakan native fetch dengan session cookie otomatis (credentials: 'include').
 * Vite dev server mem-proxy semua request /api ke Laravel backend (port 8000),
 * sehingga cookie session bekerja tanpa cross-origin issue.
 *
 * CATATAN: Laravel API routes TIDAK menggunakan VerifyCsrfToken middleware,
 * sehingga tidak perlu mengirim X-XSRF-TOKEN header untuk API calls.
 */

const BASE_URL = '/api';

async function handleResponse(response) {
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMessage = (data && data.message) || 'Terjadi kesalahan pada server';

    // Jika ada error validasi Laravel 422
    if (data && data.errors) {
      const errorList = Object.values(data.errors).flat();
      if (errorList.length > 0) {
        errorMessage = errorList[0];
      }
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  async get(endpoint, options = {}) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      },
      signal: options.signal,
    });
    return handleResponse(response);
  },

  async post(endpoint, payload) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  async put(endpoint, payload) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  async delete(endpoint) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      },
    });
    return handleResponse(response);
  },

  async postForm(endpoint, formData) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        // Content-Type tidak di-set manual agar browser menyertakan boundary multipart
      },
      body: formData,
    });
    return handleResponse(response);
  },
};

// In-Memory SWR Cache untuk data yang jarang berubah
const memoryCache = new Map();

export async function getCached(endpoint, ttlSeconds = 60) {
  const cached = memoryCache.get(endpoint);
  const now = Date.now();
  if (cached && (now - cached.time) < ttlSeconds * 1000) {
    return cached.data;
  }
  const data = await api.get(endpoint);
  memoryCache.set(endpoint, { time: now, data });
  return data;
}

export function clearCached(prefix = '') {
  if (!prefix) {
    memoryCache.clear();
  } else {
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }
  }
}
