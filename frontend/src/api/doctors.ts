// @ts-nocheck
import { API_BASE_URL, getAuthHeaders } from './config';
import type {  DoctorProfile, DoctorAvailability  } from '../types';

export const doctorsApi = {
  getAll: async (token: string) => {
    const res = await fetch(`${API_BASE_URL}/doctors/`, {
      headers: getAuthHeaders(token)
    });
    const data = await res.json();
    return data.results || data;
  },

  getProfile: async (token: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/doctor-profile/`, {
      headers: getAuthHeaders(token)
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch doctor profile');
    return res.json();
  },

  saveProfile: async (token: string, payload: any, isUpdate: boolean) => {
    const res = await fetch(`${API_BASE_URL}/auth/doctor-profile/`, {
      method: isUpdate ? 'PATCH' : 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
  },

  getAvailability: async (token: string, doctorId: string): Promise<DoctorAvailability[]> => {
    const res = await fetch(`${API_BASE_URL}/auth/doctor-availability/?doctor=${doctorId}`, {
      headers: getAuthHeaders(token)
    });
    const data = await res.json();
    return data.results || data;
  },

  createAvailability: async (token: string, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/auth/doctor-availability/`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
  },

  deleteAvailability: async (token: string, id: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/doctor-availability/${id}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to delete');
    return true;
  },

  getSlots: async (token: string, doctorId: string, date: string) => {
    const res = await fetch(`${API_BASE_URL}/doctors/${doctorId}/slots/?date=${date}`, {
      headers: getAuthHeaders(token)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data.slots || [];
  }
};
