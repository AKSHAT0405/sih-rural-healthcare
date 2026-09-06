import { API_BASE_URL, getAuthHeaders } from './config';
import type {  MedicalRecord  } from '../types';

export const medicalRecordsApi = {
  getAll: async (token: string, consultationId?: string): Promise<MedicalRecord[]> => {
    let url = `${API_BASE_URL}/medical-records/`;
    if (consultationId) {
      url += `?consultation=${consultationId}`;
    }
    const res = await fetch(url, {
      headers: getAuthHeaders(token)
    });
    const data = await res.json();
    return data.results || data;
  },

  save: async (token: string, recordId: string, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/medical-records/${recordId}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
  }
};
