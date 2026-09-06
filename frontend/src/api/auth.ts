import { API_BASE_URL, getAuthHeaders } from './config';

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || JSON.stringify(data));
    return data;
  },

  getMe: async (token: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/me/`, {
      headers: getAuthHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  }
};
