import { API_BASE_URL, getAuthHeaders } from './config';
import type {  Consultation  } from '../types';

export const consultationsApi = {
  getAll: async (token: string): Promise<Consultation[]> => {
    const res = await fetch(`${API_BASE_URL}/consultations/`, {
      headers: getAuthHeaders(token)
    });
    const data = await res.json();
    return data.results || data;
  },

  getDetails: async (token: string, id: string): Promise<Consultation> => {
    const res = await fetch(`${API_BASE_URL}/consultations/${id}/`, {
      headers: getAuthHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to fetch consultation details');
    return res.json();
  },

  create: async (token: string, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/consultations/`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
  },

  updateStatus: async (token: string, id: string, payload: { status: string; doctor?: string }) => {
    const res = await fetch(`${API_BASE_URL}/consultations/${id}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(JSON.stringify(err));
    }
    return res.json();
  },

  start: async (token: string, id: string) => {
    const res = await fetch(`${API_BASE_URL}/consultations/${id}/start/`, {
      method: 'POST',
      headers: getAuthHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to start consultation');
    return true;
  }
};
