import { API_BASE_URL, getAuthHeaders } from './config';
import type {  Appointment  } from '../types';

export const appointmentsApi = {
  getAll: async (token: string): Promise<Appointment[]> => {
    const res = await fetch(`${API_BASE_URL}/appointments/`, {
      headers: getAuthHeaders(token)
    });
    const data = await res.json();
    return data.results || data;
  },

  create: async (token: string, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/appointments/`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
  },

  updateStatus: async (token: string, id: string, status: string) => {
    const res = await fetch(`${API_BASE_URL}/appointments/${id}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(JSON.stringify(err));
    }
    return res.json();
  }
};
