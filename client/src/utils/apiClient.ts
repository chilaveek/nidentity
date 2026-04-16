const TOKEN_KEY = 'nid_token';

function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (extra) Object.assign(headers, extra);
  return headers;
}

async function handleResponse<T = any>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMessage = `Ошибка сервера: ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) errorMessage = data.error;
      else if (data.errors) errorMessage = Object.values(data.errors).flat().join(', ');
      else if (data.message) errorMessage = data.message;
    } catch { /* response is not JSON */ }
    throw new Error(errorMessage);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

export const api = {
  async get<T = any>(url: string): Promise<T> {
    const res = await fetch(url, { headers: authHeaders() });
    return handleResponse<T>(res);
  },

  async post<T = any>(url: string, body?: unknown): Promise<T> {
    const headers = authHeaders(body !== undefined ? { 'Content-Type': 'application/json' } : undefined);
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async put<T = any>(url: string, body?: unknown): Promise<T> {
    const headers = authHeaders(body !== undefined ? { 'Content-Type': 'application/json' } : undefined);
    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async delete<T = any>(url: string): Promise<T> {
    const res = await fetch(url, { method: 'DELETE', headers: authHeaders() });
    return handleResponse<T>(res);
  },
};
