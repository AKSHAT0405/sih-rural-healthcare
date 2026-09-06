from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.consultations.models import Consultation
from apps.patients.models import Patient
from apps.facilities.models import Facility
from apps.consultations.triage_engine import evaluate_triage

User = get_user_model()

class TriageEngineTests(APITestCase):
    def test_emergency_keywords(self):
        result = evaluate_triage("I am having terrible chest pain and sweating")
        self.assertEqual(result['priority'], 'EMERGENCY')
        self.assertEqual(result['category'], 'EMERGENCY_CARE')
        self.assertTrue(result['bypass_queue'])
        
    def test_urgent_keywords(self):
        result = evaluate_triage("I have a high fever and a fracture")
        self.assertEqual(result['priority'], 'URGENT')
        self.assertEqual(result['category'], 'PRIORITY_APPOINTMENT')
        self.assertFalse(result['bypass_queue'])

    def test_normal_keywords(self):
        result = evaluate_triage("Just a regular checkup, maybe a mild cold")
        self.assertEqual(result['priority'], 'NORMAL')
        self.assertEqual(result['category'], 'ROUTINE_OUTPATIENT')
        self.assertFalse(result['bypass_queue'])

    def test_empty_complaint(self):
        result = evaluate_triage("")
        self.assertEqual(result['priority'], 'NORMAL')

class ConsultationAPITests(APITestCase):
    def setUp(self):
        # Facilities
        self.facility_a = Facility.objects.create(name='Facility A', type='PHC')
        self.facility_b = Facility.objects.create(name='Facility B', type='SUB_CENTER')
        self.inactive_facility = Facility.objects.create(name='Inactive', type='PHC', is_active=False)

        # Users
        self.admin = User.objects.create_user(email='admin@example.com', password='password', role='ADMIN')
        self.doctor_a = User.objects.create_user(email='doca@example.com', password='password', role='DOCTOR', facility=self.facility_a)
        self.doctor_b = User.objects.create_user(email='docb@example.com', password='password', role='DOCTOR', facility=self.facility_b)
        self.doctor_none = User.objects.create_user(email='docnone@example.com', password='password', role='DOCTOR')
        self.health_worker_a = User.objects.create_user(email='hwa@example.com', password='password', role='HEALTH_WORKER', facility=self.facility_a)

        # Patients
        self.patient_a = User.objects.create_user(email='patienta@example.com', password='password', role='PATIENT')
        self.patient_b = User.objects.create_user(email='patientb@example.com', password='password', role='PATIENT')
        
        self.patient_profile_a = Patient.objects.create(user=self.patient_a, full_name='Patient A', gender='MALE', facility=self.facility_a, created_by=self.admin)
        self.patient_profile_b = Patient.objects.create(user=self.patient_b, full_name='Patient B', gender='FEMALE', facility=self.facility_b, created_by=self.admin)
        self.patient_inactive = Patient.objects.create(full_name='Patient Inactive', gender='MALE', facility=self.inactive_facility, created_by=self.admin)

        self.valid_consultation_data = {
            'patient': str(self.patient_profile_a.id),
            'facility': str(self.facility_a.id),
            'chief_complaint': 'Fever and chills',
            'status': 'SCHEDULED'
        }

    # --- DOCTOR CREATE TESTS ---
    def test_doctor_can_create_consultation(self):
        self.client.force_authenticate(user=self.doctor_a)
        response = self.client.post('/api/v1/consultations/', self.valid_consultation_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data['doctor']), str(self.doctor_a.id))

    def test_doctor_cannot_spoof_another_doctor(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = self.valid_consultation_data.copy()
        data['doctor'] = str(self.doctor_b.id)
        response = self.client.post('/api/v1/consultations/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('doctor', response.data)

    def test_doctor_cannot_create_consultation_without_facility(self):
        self.client.force_authenticate(user=self.doctor_none)
        response = self.client.post('/api/v1/consultations/', self.valid_consultation_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_doctor_cannot_create_consultation_for_another_facility(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = self.valid_consultation_data.copy()
        data['facility'] = str(self.facility_b.id)
        response = self.client.post('/api/v1/consultations/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_can_create_consultation_for_patient_of_another_facility(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = self.valid_consultation_data.copy()
        data['patient'] = str(self.patient_profile_b.id) # Patient B belongs to Facility B
        response = self.client.post('/api/v1/consultations/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data['facility']), str(self.facility_a.id))

    # --- ADMIN CREATE TESTS ---
    def test_admin_can_create_consultation(self):
        self.client.force_authenticate(user=self.admin)
        data = self.valid_consultation_data.copy()
        data['doctor'] = str(self.doctor_a.id)
        response = self.client.post('/api/v1/consultations/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_cannot_create_consultation_without_doctor(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/consultations/', self.valid_consultation_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_cannot_select_non_doctor_user(self):
        self.client.force_authenticate(user=self.admin)
        data = self.valid_consultation_data.copy()
        data['doctor'] = str(self.health_worker_a.id)
        response = self.client.post('/api/v1/consultations/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_create_consultation_with_mismatched_patient_facility(self):
        self.client.force_authenticate(user=self.admin)
        data = self.valid_consultation_data.copy()
        data['doctor'] = str(self.doctor_a.id)
        data['patient'] = str(self.patient_profile_b.id) # Mismatch
        response = self.client.post('/api/v1/consultations/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_cannot_assign_doctor_from_another_facility(self):
        self.client.force_authenticate(user=self.admin)
        data = self.valid_consultation_data.copy()
        data['doctor'] = str(self.doctor_b.id) # Mismatch
        response = self.client.post('/api/v1/consultations/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_admin_cannot_create_for_inactive_facility(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'patient': str(self.patient_inactive.id),
            'facility': str(self.inactive_facility.id),
            'doctor': str(self.doctor_a.id),
            'chief_complaint': 'Test'
        }
        response = self.client.post('/api/v1/consultations/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- HEALTH WORKER CREATE TESTS ---
    def test_health_worker_can_create_consultation(self):
        self.client.force_authenticate(user=self.health_worker_a)
        # Needs a doctor since status defaults to SCHEDULED
        data = self.valid_consultation_data.copy()
        data['doctor'] = str(self.doctor_a.id)
        response = self.client.post('/api/v1/consultations/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # --- LIST / RETRIEVE TESTS ---
    def test_doctor_can_list_and_retrieve_consultations(self):
        c = Consultation.objects.create(patient=self.patient_profile_a, doctor=self.doctor_a, facility=self.facility_a)
        self.client.force_authenticate(user=self.doctor_a)
        
        r1 = self.client.get('/api/v1/consultations/')
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r1.data['results']), 1)
        
        r2 = self.client.get(f'/api/v1/consultations/{c.id}/')
        self.assertEqual(r2.status_code, status.HTTP_200_OK)

    def test_health_worker_can_list_and_retrieve_consultations(self):
        c = Consultation.objects.create(patient=self.patient_profile_a, doctor=self.doctor_a, facility=self.facility_a)
        self.client.force_authenticate(user=self.health_worker_a)
        
        r1 = self.client.get('/api/v1/consultations/')
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        
        r2 = self.client.get(f'/api/v1/consultations/{c.id}/')
        self.assertEqual(r2.status_code, status.HTTP_200_OK)

    def test_unauthenticated_users_cannot_access(self):
        response = self.client.get('/api/v1/consultations/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- UPDATE TESTS ---
    def test_doctor_can_update_their_consultation(self):
        c = Consultation.objects.create(patient=self.patient_profile_a, doctor=self.doctor_a, facility=self.facility_a, status='IN_PROGRESS')
        self.client.force_authenticate(user=self.doctor_a)
        response = self.client.patch(f'/api/v1/consultations/{c.id}/', {'clinical_notes': 'Updated notes'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['clinical_notes'], 'Updated notes')
        self.assertEqual(response.data['status'], 'IN_PROGRESS')

    def test_doctor_cannot_update_another_doctors_consultation(self):
        c = Consultation.objects.create(patient=self.patient_profile_a, doctor=self.doctor_a, facility=self.facility_a, status='IN_PROGRESS')
        self.client.force_authenticate(user=self.doctor_b)
        response = self.client.patch(f'/api/v1/consultations/{c.id}/', {'clinical_notes': 'Hacked'})
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_doctor_cannot_change_patient_or_facility(self):
        c = Consultation.objects.create(patient=self.patient_profile_a, doctor=self.doctor_a, facility=self.facility_a)
        self.client.force_authenticate(user=self.doctor_a)
        response = self.client.patch(f'/api/v1/consultations/{c.id}/', {'patient': str(self.patient_profile_b.id)})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        response = self.client.patch(f'/api/v1/consultations/{c.id}/', {'facility': str(self.facility_b.id)})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_update_consultations(self):
        c = Consultation.objects.create(patient=self.patient_profile_a, doctor=self.doctor_a, facility=self.facility_a)
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/v1/consultations/{c.id}/', {'status': 'COMPLETED'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_health_worker_can_update_consultations(self):
        c = Consultation.objects.create(patient=self.patient_profile_a, doctor=self.doctor_a, facility=self.facility_a)
        self.client.force_authenticate(user=self.health_worker_a)
        response = self.client.patch(f'/api/v1/consultations/{c.id}/', {'status': 'COMPLETED', 'doctor': str(self.doctor_a.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- METHOD TESTS ---
    def test_delete_returns_405(self):
        c = Consultation.objects.create(patient=self.patient_profile_a, doctor=self.doctor_a, facility=self.facility_a)
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/v1/consultations/{c.id}/')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_put_returns_405(self):
        c = Consultation.objects.create(patient=self.patient_profile_a, doctor=self.doctor_a, facility=self.facility_a)
        self.client.force_authenticate(user=self.admin)
        response = self.client.put(f'/api/v1/consultations/{c.id}/', self.valid_consultation_data)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    # --- FILTERING TESTS ---
    def test_patient_filter_works(self):
        c1 = Consultation.objects.create(patient=self.patient_profile_a, doctor=self.doctor_a, facility=self.facility_a)
        Consultation.objects.create(patient=self.patient_profile_b, doctor=self.doctor_b, facility=self.facility_b)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/v1/consultations/?patient={self.patient_profile_a.id}')
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], str(c1.id))

    def test_status_filter_works(self):
        c1 = Consultation.objects.create(patient=self.patient_profile_a, doctor=self.doctor_a, facility=self.facility_a, status='IN_PROGRESS')
        Consultation.objects.create(patient=self.patient_profile_b, doctor=self.doctor_b, facility=self.facility_b, status='COMPLETED')
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/consultations/?status=IN_PROGRESS')
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], str(c1.id))

    def test_invalid_status_rejected(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = self.valid_consultation_data.copy()
        data['status'] = 'HACKED_STATUS'
        response = self.client.post('/api/v1/consultations/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- TRIAGE & INVARIANT TESTS ---
    def test_patient_can_create_triage_request_without_sending_ids(self):
        self.client.force_authenticate(user=self.patient_a)
        data = {
            'chief_complaint': 'I am having chest pain',
            # Patient doesn't need to send priority anymore
        }
        response = self.client.post('/api/v1/consultations/', data)
        if response.status_code != 201:
            print("test_patient_can_create_triage_request_without_sending_ids FAIL:", response.data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'PENDING_TRIAGE')
        self.assertIsNone(response.data['doctor'])
        self.assertEqual(str(response.data['patient']), str(self.patient_profile_a.id))
        self.assertEqual(str(response.data['facility']), str(self.facility_a.id))
        
        # Verify triage engine ran automatically!
        self.assertEqual(response.data['priority'], 'EMERGENCY')
        self.assertEqual(response.data['triage_category'], 'EMERGENCY_CARE')
        self.assertTrue(response.data['triage_bypass_queue'])
        self.assertIn("chest pain", response.data['triage_notes'])

    def test_patient_cannot_override_patient_or_facility_ids(self):
        self.client.force_authenticate(user=self.patient_a)
        data = {
            'patient': str(self.patient_profile_b.id),
            'facility': str(self.facility_b.id),
            'chief_complaint': 'Headache',
            'priority': 'URGENT',
            'status': 'SCHEDULED',
            'doctor': str(self.doctor_b.id)
        }
        response = self.client.post('/api/v1/consultations/', data)
        if response.status_code != 201:
            print("test_patient_cannot_override_patient_or_facility_ids FAIL:", response.data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'PENDING_TRIAGE')
        self.assertIsNone(response.data['doctor'])
        self.assertEqual(str(response.data['patient']), str(self.patient_profile_a.id))
        self.assertEqual(str(response.data['facility']), str(self.facility_a.id))

    def test_scheduling_triage_requires_doctor(self):
        # Admin tries to schedule a triage request without a doctor
        triage = Consultation.objects.create(patient=self.patient_profile_a, facility=self.facility_a, status='PENDING_TRIAGE')
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/v1/consultations/{triage.id}/', {'status': 'SCHEDULED'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('doctor', response.data)

    def test_doctor_can_take_ownership_of_triage(self):
        triage = Consultation.objects.create(patient=self.patient_profile_a, facility=self.facility_a, status='PENDING_TRIAGE')
        self.client.force_authenticate(user=self.doctor_a)
        response = self.client.patch(f'/api/v1/consultations/{triage.id}/', {'doctor': str(self.doctor_a.id), 'status': 'SCHEDULED'})
        if response.status_code != 200:
            print("test_doctor_can_take_ownership_of_triage FAIL:", response.data)
        # Should be allowed to take ownership
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(response.data['doctor']), str(self.doctor_a.id))
        self.assertEqual(response.data['status'], 'SCHEDULED')

from apps.consultations.models import Appointment
from apps.accounts.models import DoctorAvailability
import datetime

class AppointmentAPITests(APITestCase):
    def setUp(self):
        self.facility = Facility.objects.create(name='Clinic', type='PHC')
        self.admin = User.objects.create_user(email='admin@ex.com', password='password', role='ADMIN')
        self.doctor = User.objects.create_user(email='doc@ex.com', password='password', role='DOCTOR', facility=self.facility)
        self.patient_user = User.objects.create_user(email='pat@ex.com', password='password', role='PATIENT')
        self.patient = Patient.objects.create(user=self.patient_user, full_name='Pat', facility=self.facility, created_by=self.admin)
        
        self.patient_user2 = User.objects.create_user(email='pat2@ex.com', password='password', role='PATIENT')
        self.patient2 = Patient.objects.create(user=self.patient_user2, full_name='Pat2', facility=self.facility, created_by=self.admin)

        self.consultation = Consultation.objects.create(patient=self.patient, facility=self.facility, status='PENDING_TRIAGE')
        
        self.monday = datetime.date(2026, 10, 19)
        self.tuesday = datetime.date(2026, 10, 20)
        
        DoctorAvailability.objects.create(
            doctor=self.doctor, day_of_week=0, start_time='09:00', end_time='13:00', is_online=True, is_active=True
        )
        DoctorAvailability.objects.create(
            doctor=self.doctor, day_of_week=1, start_time='14:00', end_time='17:00', is_online=False, is_active=True
        )

    def test_patient_can_create_appointment(self):
        self.client.force_authenticate(user=self.patient_user)
        data = {
            'consultation': str(self.consultation.id),
            'doctor': str(self.doctor.id),
            'scheduled_date': str(self.monday),
            'start_time': '09:00:00',
            'end_time': '09:30:00',
            'mode': 'TELEMEDICINE'
        }
        res = self.client.post('/api/v1/appointments/', data)
        if res.status_code != 201:
            print("test_patient_can_create_appointment FAIL:", res.data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Appointment.objects.count(), 1)
        appt = Appointment.objects.first()
        self.assertEqual(appt.patient, self.patient)
        self.assertEqual(appt.facility, self.facility)
        
    def test_telemedicine_validation(self):
        self.client.force_authenticate(user=self.patient_user)
        data = {
            'consultation': str(self.consultation.id),
            'doctor': str(self.doctor.id),
            'scheduled_date': str(self.tuesday),
            'start_time': '14:00:00',
            'end_time': '14:30:00',
            'mode': 'TELEMEDICINE'
        }
        res = self.client.post('/api/v1/appointments/', data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('mode', res.data)
        
    def test_doctor_availability_validation(self):
        self.client.force_authenticate(user=self.patient_user)
        data = {
            'consultation': str(self.consultation.id),
            'doctor': str(self.doctor.id),
            'scheduled_date': str(self.monday),
            'start_time': '14:00:00',
            'end_time': '14:30:00',
            'mode': 'IN_PERSON'
        }
        res = self.client.post('/api/v1/appointments/', data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non_field_errors', res.data)

    def test_double_booking_prevention(self):
        Appointment.objects.create(
            patient=self.patient2,
            doctor=self.doctor,
            facility=self.facility,
            consultation=Consultation.objects.create(patient=self.patient2, facility=self.facility),
            scheduled_date=self.monday,
            start_time='09:30:00',
            end_time='10:00:00',
            status='SCHEDULED'
        )
        
        self.client.force_authenticate(user=self.patient_user)
        data = {
            'consultation': str(self.consultation.id),
            'doctor': str(self.doctor.id),
            'scheduled_date': str(self.monday),
            'start_time': '09:15:00',
            'end_time': '09:45:00',
            'mode': 'IN_PERSON'
        }
        res = self.client.post('/api/v1/appointments/', data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non_field_errors', res.data)

    def test_dynamic_slot_generator(self):
        Appointment.objects.create(
            patient=self.patient2,
            doctor=self.doctor,
            facility=self.facility,
            consultation=Consultation.objects.create(patient=self.patient2, facility=self.facility),
            scheduled_date=self.monday,
            start_time='09:30:00',
            end_time='10:00:00',
            status='SCHEDULED'
        )
        
        self.client.force_authenticate(user=self.patient_user)
        res = self.client.get(f'/api/v1/doctors/{self.doctor.id}/slots/?date={self.monday}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slots = res.data['slots']
        
        self.assertEqual(len(slots), 7)
        self.assertEqual(slots[0]['start_time'], '09:00:00')
        self.assertEqual(slots[0]['end_time'], '09:30:00')
        self.assertEqual(slots[1]['start_time'], '10:00:00')


class AppointmentSecurityTests(APITestCase):
    def setUp(self):
        self.facility_a = Facility.objects.create(name='Clinic A', type='PHC')
        self.facility_b = Facility.objects.create(name='Clinic B', type='PHC')
        
        self.admin = User.objects.create_user(email='admin@ex.com', password='password', role='ADMIN')
        self.doctor = User.objects.create_user(email='doc@ex.com', password='password', role='DOCTOR', facility=self.facility_b)
        
        self.patient_user_a = User.objects.create_user(email='pat_a@ex.com', password='password', role='PATIENT')
        self.patient_a = Patient.objects.create(user=self.patient_user_a, full_name='Pat A', facility=self.facility_a, created_by=self.admin)

        self.patient_user_b = User.objects.create_user(email='pat_b@ex.com', password='password', role='PATIENT')
        self.patient_b = Patient.objects.create(user=self.patient_user_b, full_name='Pat B', facility=self.facility_b, created_by=self.admin)

        self.consultation_a = Consultation.objects.create(patient=self.patient_a, facility=self.facility_a, status='PENDING_TRIAGE')
        self.consultation_b = Consultation.objects.create(patient=self.patient_b, facility=self.facility_b, status='PENDING_TRIAGE')
        
        # EMERGENCY consultation
        self.consultation_emg = Consultation.objects.create(patient=self.patient_a, facility=self.facility_a, status='PENDING_TRIAGE', priority='EMERGENCY')

        self.monday = datetime.date(2026, 10, 19)
        DoctorAvailability.objects.create(
            doctor=self.doctor, day_of_week=0, start_time='09:00', end_time='17:00', is_online=True, is_active=True
        )

    def test_idor_prevent_booking_other_patient_consultation(self):
        self.client.force_authenticate(user=self.patient_user_a)
        data = {
            'consultation': str(self.consultation_b.id), # Patient B's consultation
            'doctor': str(self.doctor.id),
            'scheduled_date': str(self.monday),
            'start_time': '09:00:00',
            'end_time': '09:30:00',
            'mode': 'IN_PERSON'
        }
        res = self.client.post('/api/v1/appointments/', data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('consultation', res.data)

    def test_emergency_consultation_blocked_from_normal_booking(self):
        self.client.force_authenticate(user=self.patient_user_a)
        data = {
            'consultation': str(self.consultation_emg.id),
            'doctor': str(self.doctor.id),
            'scheduled_date': str(self.monday),
            'start_time': '09:00:00',
            'end_time': '09:30:00',
            'mode': 'IN_PERSON'
        }
        res = self.client.post('/api/v1/appointments/', data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non_field_errors', res.data)
        
        # Ensure consultation status is unchanged
        self.consultation_emg.refresh_from_db()
        self.assertEqual(self.consultation_emg.status, 'PENDING_TRIAGE')

    def test_state_synchronization_on_successful_booking(self):
        self.client.force_authenticate(user=self.patient_user_a)
        data = {
            'consultation': str(self.consultation_a.id),
            'doctor': str(self.doctor.id),
            'scheduled_date': str(self.monday),
            'start_time': '09:00:00',
            'end_time': '09:30:00',
            'mode': 'IN_PERSON'
        }
        res = self.client.post('/api/v1/appointments/', data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        
        # Verify state synchronization
        self.consultation_a.refresh_from_db()
        self.assertEqual(self.consultation_a.status, 'SCHEDULED')
        self.assertEqual(self.consultation_a.doctor, self.doctor)
        
        # Verify cross-facility correctness
        appt = Appointment.objects.get(id=res.data['id'])
        self.assertEqual(appt.facility, self.facility_b) # Appt is at doctor's facility
        self.assertEqual(self.consultation_a.facility, self.facility_a) # Patient's home facility remains
        
    def test_overlapping_intervals_blocked(self):
        # Create 09:15 - 09:45
        Appointment.objects.create(
            patient=self.patient_b,
            doctor=self.doctor,
            facility=self.facility_b,
            consultation=self.consultation_b,
            scheduled_date=self.monday,
            start_time='09:15:00',
            end_time='09:45:00',
            status='SCHEDULED'
        )
        
        # Patient A tries to book 09:00 - 09:30 (overlaps with 09:15-09:45)
        self.client.force_authenticate(user=self.patient_user_a)
        data = {
            'consultation': str(self.consultation_a.id),
            'doctor': str(self.doctor.id),
            'scheduled_date': str(self.monday),
            'start_time': '09:00:00',
            'end_time': '09:30:00',
            'mode': 'IN_PERSON'
        }
        res = self.client.post('/api/v1/appointments/', data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non_field_errors', res.data)


class DoctorConsultationWorkflowTests(APITestCase):
    def setUp(self):
        self.facility = Facility.objects.create(name='Clinic', type='PHC')
        
        self.doctor_a = User.objects.create_user(email='doca@ex.com', password='password', role='DOCTOR', facility=self.facility)
        self.doctor_b = User.objects.create_user(email='docb@ex.com', password='password', role='DOCTOR', facility=self.facility)
        self.patient_user = User.objects.create_user(email='pat@ex.com', password='password', role='PATIENT')
        
        self.patient = Patient.objects.create(user=self.patient_user, full_name='Pat', facility=self.facility, created_by=self.doctor_a)

        # Scheduled Consultation and Appointment
        self.consultation = Consultation.objects.create(
            patient=self.patient, doctor=self.doctor_a, facility=self.facility, status='SCHEDULED'
        )
        self.appointment = Appointment.objects.create(
            patient=self.patient, doctor=self.doctor_a, facility=self.facility,
            consultation=self.consultation, scheduled_date=datetime.date(2026, 10, 19),
            start_time='09:00:00', end_time='09:30:00', status='SCHEDULED'
        )
        
    def test_start_consultation(self):
        self.client.force_authenticate(user=self.doctor_a)
        res = self.client.post(f'/api/v1/consultations/{self.consultation.id}/start/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        self.consultation.refresh_from_db()
        self.assertEqual(self.consultation.status, 'IN_PROGRESS')
        # Appointment should remain SCHEDULED
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.status, 'SCHEDULED')
        
    def test_unassigned_doctor_cannot_start(self):
        self.client.force_authenticate(user=self.doctor_b)
        res = self.client.post(f'/api/v1/consultations/{self.consultation.id}/start/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        
    def test_patient_cannot_start(self):
        self.client.force_authenticate(user=self.patient_user)
        res = self.client.post(f'/api/v1/consultations/{self.consultation.id}/start/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        
    def test_cannot_start_if_appointment_cancelled(self):
        self.appointment.status = 'CANCELLED'
        self.appointment.save()
        
        self.client.force_authenticate(user=self.doctor_a)
        res = self.client.post(f'/api/v1/consultations/{self.consultation.id}/start/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_update_clinical_notes_only_when_in_progress(self):
        self.client.force_authenticate(user=self.doctor_a)
        
        # Try to edit when SCHEDULED (should fail)
        res = self.client.patch(f'/api/v1/consultations/{self.consultation.id}/', {'clinical_notes': 'Test notes'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        
        # Start consultation
        self.client.post(f'/api/v1/consultations/{self.consultation.id}/start/')
        
        # Now edit should succeed
        res2 = self.client.patch(f'/api/v1/consultations/{self.consultation.id}/', {'clinical_notes': 'Test notes'})
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.consultation.refresh_from_db()
        self.assertEqual(self.consultation.clinical_notes, 'Test notes')
        
        # Complete consultation requires Medical Record (now created automatically on start)
        from apps.consultations.models import MedicalRecord
        self.client.post(f'/api/v1/consultations/{self.consultation.id}/complete/')
        
        # Try to edit when COMPLETED (should fail)
        res3 = self.client.patch(f'/api/v1/consultations/{self.consultation.id}/', {'clinical_notes': 'More notes'})
        self.assertEqual(res3.status_code, status.HTTP_403_FORBIDDEN)

    def test_complete_consultation(self):
        self.consultation.status = 'IN_PROGRESS'
        self.consultation.save()
        
        from apps.consultations.models import MedicalRecord
        MedicalRecord.objects.create(consultation=self.consultation)
        
        self.client.force_authenticate(user=self.doctor_a)
        res = self.client.post(f'/api/v1/consultations/{self.consultation.id}/complete/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        self.consultation.refresh_from_db()
        self.assertEqual(self.consultation.status, 'COMPLETED')
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.status, 'COMPLETED')

class MedicalRecordTests(APITestCase):
    def setUp(self):
        from apps.consultations.models import Consultation, Appointment
        from apps.patients.models import Patient
        from apps.facilities.models import Facility
        import datetime
        
        self.facility = Facility.objects.create(name='MedRec Facility', type='PHC')
        self.doctor_a = User.objects.create_user(email='docm_a@ex.com', password='password', role='DOCTOR', facility=self.facility)
        self.doctor_b = User.objects.create_user(email='docm_b@ex.com', password='password', role='DOCTOR', facility=self.facility)
        
        self.patient_a_user = User.objects.create_user(email='patm_a@ex.com', password='password', role='PATIENT')
        self.patient_a = Patient.objects.create(user=self.patient_a_user, full_name='Pat A', facility=self.facility, created_by=self.doctor_a)
        
        self.patient_b_user = User.objects.create_user(email='patm_b@ex.com', password='password', role='PATIENT')
        self.patient_b = Patient.objects.create(user=self.patient_b_user, full_name='Pat B', facility=self.facility, created_by=self.doctor_a)

        self.consultation = Consultation.objects.create(
            patient=self.patient_a, doctor=self.doctor_a, facility=self.facility,
            status='IN_PROGRESS', priority='NORMAL'
        )
        self.appointment = Appointment.objects.create(
            patient=self.patient_a, doctor=self.doctor_a, facility=self.facility,
            consultation=self.consultation,
            scheduled_date=datetime.date(2026, 9, 3), start_time=datetime.time(10,0), end_time=datetime.time(10,30),
            status='SCHEDULED'
        )

    # A. Creation
    def test_assigned_doctor_can_create_medical_record(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = {'consultation': str(self.consultation.id), 'chief_complaint': 'Headache'}
        res = self.client.post('/api/v1/medical-records/', data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_patient_cannot_create_medical_record(self):
        self.client.force_authenticate(user=self.patient_a_user)
        data = {'consultation': str(self.consultation.id), 'chief_complaint': 'Headache'}
        res = self.client.post('/api/v1/medical-records/', data)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unassigned_doctor_cannot_create_record(self):
        self.client.force_authenticate(user=self.doctor_b)
        data = {'consultation': str(self.consultation.id), 'chief_complaint': 'Headache'}
        res = self.client.post('/api/v1/medical-records/', data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('consultation', res.data)

    def test_duplicate_medical_record_rejected(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = {'consultation': str(self.consultation.id), 'chief_complaint': 'Headache'}
        res1 = self.client.post('/api/v1/medical-records/', data)
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        res2 = self.client.post('/api/v1/medical-records/', data)
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_create_if_not_in_progress(self):
        self.consultation.status = 'SCHEDULED'
        self.consultation.save()
        self.client.force_authenticate(user=self.doctor_a)
        data = {'consultation': str(self.consultation.id), 'chief_complaint': 'Headache'}
        res = self.client.post('/api/v1/medical-records/', data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # B. Editing
    def test_assigned_doctor_can_edit_while_in_progress(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = {'consultation': str(self.consultation.id), 'chief_complaint': 'Headache'}
        res1 = self.client.post('/api/v1/medical-records/', data)
        record_id = res1.data['id']
        
        res2 = self.client.patch(f'/api/v1/medical-records/{record_id}/', {'diagnosis': 'Migraine'})
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

    def test_unassigned_doctor_cannot_edit(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = {'consultation': str(self.consultation.id), 'chief_complaint': 'Headache'}
        res1 = self.client.post('/api/v1/medical-records/', data)
        record_id = res1.data['id']
        
        self.client.force_authenticate(user=self.doctor_b)
        res2 = self.client.patch(f'/api/v1/medical-records/{record_id}/', {'diagnosis': 'Hacked'})
        self.assertIn(res2.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_patient_cannot_edit(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = {'consultation': str(self.consultation.id), 'chief_complaint': 'Headache'}
        res1 = self.client.post('/api/v1/medical-records/', data)
        record_id = res1.data['id']
        
        self.client.force_authenticate(user=self.patient_a_user)
        res2 = self.client.patch(f'/api/v1/medical-records/{record_id}/', {'diagnosis': 'Hacked'})
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_edit_completed_record(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = {'consultation': str(self.consultation.id), 'chief_complaint': 'Headache'}
        res1 = self.client.post('/api/v1/medical-records/', data)
        record_id = res1.data['id']
        
        # Complete consultation
        self.client.post(f'/api/v1/consultations/{self.consultation.id}/complete/')
        
        res2 = self.client.patch(f'/api/v1/medical-records/{record_id}/', {'diagnosis': 'Post-edit'})
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    # C. Ownership / IDOR
    def test_patient_cannot_access_another_patients_record(self):
        self.client.force_authenticate(user=self.doctor_a)
        res1 = self.client.post('/api/v1/medical-records/', {'consultation': str(self.consultation.id)})
        record_id = res1.data['id']
        
        self.client.force_authenticate(user=self.patient_b_user)
        res2 = self.client.get(f'/api/v1/medical-records/{record_id}/')
        self.assertEqual(res2.status_code, status.HTTP_404_NOT_FOUND)

    # D. Completion
    def test_cannot_complete_without_medical_record(self):
        self.client.force_authenticate(user=self.doctor_a)
        res = self.client.post(f'/api/v1/consultations/{self.consultation.id}/complete/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('medical_record', res.data)

    # E. Patient Access
    def test_patient_can_read_own_record(self):
        self.client.force_authenticate(user=self.doctor_a)
        res1 = self.client.post('/api/v1/medical-records/', {'consultation': str(self.consultation.id), 'diagnosis': 'Flu'})
        record_id = res1.data['id']
        
        self.client.force_authenticate(user=self.patient_a_user)
        res2 = self.client.get(f'/api/v1/medical-records/{record_id}/')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['diagnosis'], 'Flu')
