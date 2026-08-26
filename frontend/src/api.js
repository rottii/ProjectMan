/**
 * Centralized API configuration.
 *
 * All API calls should use these helpers instead of hardcoding URLs.
 * The base URL is read from the VITE_API_URL environment variable,
 * falling back to http://localhost:5001 for local development.
 */
import { auth } from './config/firebase';

export const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : 'http://localhost:5001';

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  // Try to get fresh Firebase token
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      };
      localStorage.setItem('token', token);
    } catch (err) {
      console.error("Error getting Firebase token", err);
    }
  } else {
    // Fallback
    const localToken = localStorage.getItem('token');
    if (localToken && (!options.headers || !options.headers['Authorization'])) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${localToken}`
      };
    }
  }

  let response = await fetch(url, options);

  if (response.status === 401 && !path.includes('/api/auth/')) {
    window.dispatchEvent(new Event('auth-expired'));
  }

  return response;
}

export function assetUrl(path) {
  return `${API_BASE_URL}${path}`;
}
