import { API_BASE_URL, getAuthHeaders } from './config';
import type {  FollowUp  } from '../types';

export const followUpsApi = {
  getAll: async (token: string, statusFilter?: string): Promise<FollowUp[]> => {
    let url = `${API_BASE_URL}/followups/`;
    if (statusFilter) {
      url += `?status=${statusFilter}`;
    }
    const res = await fetch(url, {
      headers: getAuthHeaders(token)
    });
    const data = await res.json();
    return data.results || data;
  },

  create: async (token: string, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/followups/`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
  },

  update: async (token: string, id: string, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/followups/${id}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
  }
};
