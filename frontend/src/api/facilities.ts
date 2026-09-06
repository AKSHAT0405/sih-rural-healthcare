import { API_BASE_URL, getAuthHeaders } from './config';
import type {  Facility  } from '../types';

export const facilitiesApi = {
  getAll: async (token: string): Promise<Facility[]> => {
    const res = await fetch(`${API_BASE_URL}/facilities/`, {
      headers: getAuthHeaders(token)
    });
    const data = await res.json();
    return data.results || data;
  }
};
