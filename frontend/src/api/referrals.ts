import { API_BASE_URL, getAuthHeaders } from './config';
import type {  Referral  } from '../types';

export const referralsApi = {
  getAll: async (token: string, statusFilter?: string, toFacilityFilter?: string): Promise<Referral[]> => {
    let url = `${API_BASE_URL}/referrals/`;
    const params = new URLSearchParams();
    if (statusFilter) params.append('status', statusFilter);
    if (toFacilityFilter) params.append('to_facility', toFacilityFilter);
    
    if (params.toString()) {
      url += '?' + params.toString();
    }
    
    const res = await fetch(url, {
      headers: getAuthHeaders(token)
    });
    const data = await res.json();
    return data.results || data;
  },

  create: async (token: string, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/referrals/`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
  },

  update: async (token: string, id: string, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/referrals/${id}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
  }
};
