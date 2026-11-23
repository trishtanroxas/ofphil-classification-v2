export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

export function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...((options.headers as Record<string, string>) || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    console.warn(`API call error for ${url}:`, err.message);
    throw err;
  }
}
