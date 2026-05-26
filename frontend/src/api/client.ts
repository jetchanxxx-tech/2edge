const API_BASE = '/api/v1';

function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function clearToken(): void {
  localStorage.removeItem('token');
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  const token = getToken();

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = { method, headers };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, config);

  // Handle subscription endpoint (returns plain text)
  const ct = response.headers.get('Content-Type') || '';
  if (ct.includes('text/plain') || ct.includes('text/csv')) {
    if (!response.ok) throw new Error(await response.text());
    return (await response.text()) as unknown as T;
  }

  const data = await response.json();

  if (!response.ok) {
    const err = data as { error?: { code?: string; message?: string } };
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }

  return data as T;
}

// Auth API
export async function login(email: string, password: string) {
  const res = await apiRequest<{ data: { token: string; user: Record<string, unknown> } }>('/auth/login', {
    method: 'POST', body: { email, password },
  });
  setToken(res.data.token);
  return res.data;
}

export async function register(email: string, password: string) {
  const res = await apiRequest<{ data: { token: string; user: Record<string, unknown> } }>('/auth/register', {
    method: 'POST', body: { email, password },
  });
  setToken(res.data.token);
  return res.data;
}

export function logout() {
  clearToken();
  window.location.href = '/login';
}

// Re-export for convenience
export { getToken };
