import { API_BASE_URL, getAuthHeaders } from './config';
import type {  Patient  } from '../types';

export const patientsApi = {
  getAll: async (token: string): Promise<Patient[]> => {
    const res = await fetch(`${API_BASE_URL}/patients/`, {
      headers: getAuthHeaders(token)
    });
    const data = await res.json();
    return data.results || data;
  },

  getHistory: async (token: string, patientId: string) => {
    const res = await fetch(`${API_BASE_URL}/patients/${patientId}/history/`, {
      headers: getAuthHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  },

  create: async (token: string, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/patients/`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
  },

  createAccount: async (token: string, patientId: string, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/patients/${patientId}/create_account/`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || JSON.stringify(data));
    return data;
  }
};
