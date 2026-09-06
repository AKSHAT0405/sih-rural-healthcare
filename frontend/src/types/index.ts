export interface Facility {
  id: string;
  name: string;
  type: string;
}

export interface Patient {
  id: string;
  full_name: string;
  phone: string;
  gender: string;
  facility: string;
  has_account?: boolean;
}

export interface Consultation {
  id: string;
  patient: string;
  doctor: string;
  facility: string;
  chief_complaint: string;
  clinical_notes: string;
  status: string;
  priority: string;
  triage_category?: string;
  triage_bypass_queue?: boolean;
  triage_notes?: string;
  consulted_at: string | null;
  created_at: string;
}

export interface Referral {
  id: string;
  patient: string;
  consultation: string;
  from_facility: string;
  to_facility: string;
  to_doctor?: string | null;
  referred_by: string;
  reason: string;
  priority: string;
  status: string;
  referral_notes: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface FollowUp {
  id: string;
  patient: string;
  consultation: string;
  referral: string | null;
  scheduled_date: string;
  status: string;
  reason: string;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface DoctorProfile {
  id: string;
  user: string;
  specialization: string;
  qualifications: string;
  experience_years: number;
  bio: string;
  is_telemedicine_enabled: boolean;
}

export interface DoctorAvailability {
  id: string;
  doctor: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_online: boolean;
  is_active: boolean;
}

export interface Appointment {
  id: string;
  patient: string;
  doctor: string;
  facility: string;
  consultation: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  mode: string;
}

export type MedicalRecord = {
  id: string;
  consultation: string;
  chief_complaint: string;
  examination_notes: string;
  diagnosis: string;
  treatment_plan: string;
  medications: string;
  doctor_notes: string;
  created_at: string;
  updated_at: string;
};

export type InventoryItem = {
  id: string;
  facility: string;
  name: string;
  item_type: 'MEDICINE' | 'EQUIPMENT';
  quantity: number | null;
  availability_status: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'AVAILABLE_EQUIPMENT' | 'UNAVAILABLE_EQUIPMENT';
  unit: string;
  notes: string;
  created_at: string;
  last_updated: string;
};
