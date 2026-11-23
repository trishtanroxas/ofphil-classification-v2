export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== 'undefined' ? '/api/v1' : 'http://127.0.0.1:8000/api/v1');

export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  return `${API_BASE_URL}${cleanEndpoint}`;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = getApiUrl(endpoint);
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  // Retrieve current active role and user identity from client storage for RBAC enforcement
  let authHeaders: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    try {
      const activeRole = localStorage.getItem('ofphil_current_role');
      if (activeRole) {
        authHeaders['x-user-role'] = activeRole;
      }
      const token = localStorage.getItem('ofphil_token') || sessionStorage.getItem('ofphil_token');
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }
    } catch {}
  }

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...authHeaders,
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
    // If browser network layer throws (ERR_CONNECTION_REFUSED, CORS failure, or offline)
    const isNetworkError =
      err instanceof TypeError &&
      (err.message.includes('fetch') ||
        err.message.includes('NetworkError') ||
        err.message.includes('Failed to fetch'));

    if (isNetworkError) {
      const enrichedMsg = `Network connection error: Unable to reach backend service at ${url}. Please ensure the FastAPI backend is running (e.g. 'uvicorn app.main:app --port 8000') and CORS allows this origin. (${err.message})`;
      console.error(enrichedMsg);
      const networkErr = new Error(enrichedMsg);
      (networkErr as any).cause = err;
      throw networkErr;
    }

    console.warn(`API call error for ${url}:`, err.message);
    throw err;
  }
}
