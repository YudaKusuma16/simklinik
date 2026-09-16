/**
 * API Client untuk SIM Klinik
 * Menggunakan native fetch dengan kredensial session cookie otomatis.
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
  async get(endpoint) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      },
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

  async postForm(endpoint, formData) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        // Note: Content-Type tidak boleh di-set manual saat multipart/form-data agar browser menyertakan boundary
      },
      body: formData,
    });
    return handleResponse(response);
  },
};
