from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.referrals.models import Referral
from apps.consultations.models import Consultation
from apps.patients.models import Patient
from apps.facilities.models import Facility

User = get_user_model()

class ReferralAPITests(APITestCase):
    def setUp(self):
        # Facilities
        self.facility_a = Facility.objects.create(name='Facility A', type='PHC')
        self.facility_b = Facility.objects.create(name='Facility B', type='SUB_CENTER')
        self.facility_c = Facility.objects.create(name='Facility C', type='DISTRICT_HOSPITAL')
        self.inactive_facility = Facility.objects.create(name='Inactive', type='PHC', is_active=False)

        # Users
        self.admin = User.objects.create_user(email='admin@example.com', password='password', role='ADMIN')
        self.doctor_a = User.objects.create_user(email='doca@example.com', password='password', role='DOCTOR', facility=self.facility_a)
        self.doctor_b = User.objects.create_user(email='docb@example.com', password='password', role='DOCTOR', facility=self.facility_b)
        self.doctor_none = User.objects.create_user(email='docnone@example.com', password='password', role='DOCTOR')
        self.health_worker_a = User.objects.create_user(email='hwa@example.com', password='password', role='HEALTH_WORKER', facility=self.facility_a)

        # Patients
        self.patient_a = Patient.objects.create(full_name='Patient A', gender='MALE', facility=self.facility_a, created_by=self.admin)
        self.patient_b = Patient.objects.create(full_name='Patient B', gender='FEMALE', facility=self.facility_b, created_by=self.admin)

        # Consultations
        self.consultation_a = Consultation.objects.create(patient=self.patient_a, doctor=self.doctor_a, facility=self.facility_a, chief_complaint='Headache', status='COMPLETED')
        self.consultation_b = Consultation.objects.create(patient=self.patient_b, doctor=self.doctor_b, facility=self.facility_b, chief_complaint='Fever', status='COMPLETED')

        self.valid_referral_data = {
            'patient': str(self.patient_a.id),
            'consultation': str(self.consultation_a.id),
            'to_facility': str(self.facility_b.id),
            'reason': 'Needs specialist care',
            'priority': 'URGENT'
        }

    # --- CREATE TESTS ---
    def test_doctor_can_create_referral(self):
        self.client.force_authenticate(user=self.doctor_a)
        response = self.client.post('/api/v1/referrals/', self.valid_referral_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data['referred_by']), str(self.doctor_a.id))
        self.assertEqual(str(response.data['from_facility']), str(self.facility_a.id))

    def test_doctor_cannot_spoof_referred_by(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = self.valid_referral_data.copy()
        data['referred_by'] = str(self.doctor_b.id)
        response = self.client.post('/api/v1/referrals/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Even if provided, it should ignore and set to doctor_a
        self.assertEqual(str(response.data['referred_by']), str(self.doctor_a.id))

    def test_doctor_cannot_create_referral_without_facility(self):
        self.client.force_authenticate(user=self.doctor_none)
        response = self.client.post('/api/v1/referrals/', self.valid_referral_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_cannot_create_referral_from_another_facility(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = self.valid_referral_data.copy()
        data['from_facility'] = str(self.facility_b.id)
        response = self.client.post('/api/v1/referrals/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Should ignore the provided from_facility and use doctor's facility
        self.assertEqual(str(response.data['from_facility']), str(self.facility_a.id))

    def test_patient_can_belong_to_another_facility(self):
        # Create a consultation for patient_b at facility_a
        consultation_cross = Consultation.objects.create(
            patient=self.patient_b, doctor=self.doctor_a, facility=self.facility_a, chief_complaint='Fever', status='COMPLETED'
        )
        self.client.force_authenticate(user=self.doctor_a)
        data = self.valid_referral_data.copy()
        data['patient'] = str(self.patient_b.id)
        data['consultation'] = str(consultation_cross.id)
        response = self.client.post('/api/v1/referrals/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_consultation_must_belong_to_patient(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = self.valid_referral_data.copy()
        data['consultation'] = str(self.consultation_b.id)
        response = self.client.post('/api/v1/referrals/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_cannot_refer_from_another_doctors_consultation(self):
        # doctor_b trying to refer using doctor_a's consultation
        self.client.force_authenticate(user=self.doctor_b)
        data = self.valid_referral_data.copy() # belongs to patient_a / consultation_a
        data['from_facility'] = str(self.facility_b.id)
        data['to_facility'] = str(self.facility_c.id) # Prevent from == to error
        response = self.client.post('/api/v1/referrals/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('consultation', response.data)
        
    def test_to_doctor_must_belong_to_to_facility(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = self.valid_referral_data.copy()
        # facility_b is target, but we set doctor_c (or just doctor_a)
        data['to_doctor'] = str(self.doctor_a.id) # doc_a is at facility_a!
        response = self.client.post('/api/v1/referrals/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('to_doctor', response.data)
        
    def test_valid_to_doctor_accepted(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = self.valid_referral_data.copy()
        data['to_doctor'] = str(self.doctor_b.id) # doc_b is at facility_b, which matches to_facility
        response = self.client.post('/api/v1/referrals/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_from_and_to_facility_cannot_be_same(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = self.valid_referral_data.copy()
        data['to_facility'] = str(self.facility_a.id)
        response = self.client.post('/api/v1/referrals/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inactive_destination_facility_rejected(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = self.valid_referral_data.copy()
        data['to_facility'] = str(self.inactive_facility.id)
        response = self.client.post('/api/v1/referrals/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inactive_source_facility_rejected(self):
        self.facility_a.is_active = False
        self.facility_a.save()
        self.client.force_authenticate(user=self.doctor_a)
        response = self.client.post('/api/v1/referrals/', self.valid_referral_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.facility_a.is_active = True
        self.facility_a.save()

    def test_admin_can_create_referral(self):
        self.client.force_authenticate(user=self.admin)
        data = self.valid_referral_data.copy()
        data['from_facility'] = str(self.facility_a.id)
        data['referred_by'] = str(self.doctor_a.id)
        response = self.client.post('/api/v1/referrals/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_can_select_valid_referred_by(self):
        self.client.force_authenticate(user=self.admin)
        data = self.valid_referral_data.copy()
        data['from_facility'] = str(self.facility_a.id)
        data['referred_by'] = str(self.doctor_a.id)
        response = self.client.post('/api/v1/referrals/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_cannot_select_invalid_referred_by(self):
        self.client.force_authenticate(user=self.admin)
        data = self.valid_referral_data.copy()
        data['from_facility'] = str(self.facility_a.id)
        data['referred_by'] = str(self.health_worker_a.id)
        response = self.client.post('/api/v1/referrals/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_health_worker_cannot_create_referral(self):
        self.client.force_authenticate(user=self.health_worker_a)
        response = self.client.post('/api/v1/referrals/', self.valid_referral_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_create_referral_with_status_completed(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = self.valid_referral_data.copy()
        data['status'] = 'COMPLETED'
        response = self.client.post('/api/v1/referrals/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('status', response.data)

    def test_new_referral_starts_pending_and_completed_at_null(self):
        self.client.force_authenticate(user=self.doctor_a)
        response = self.client.post('/api/v1/referrals/', self.valid_referral_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'PENDING')
        self.assertIsNone(response.data['completed_at'])

    # --- VIEW TESTS ---
    def test_users_can_view_referrals(self):
        r = Referral.objects.create(patient=self.patient_a, consultation=self.consultation_a, from_facility=self.facility_a, to_facility=self.facility_b, referred_by=self.doctor_a, reason='Test', priority='NORMAL')
        
        self.client.force_authenticate(user=self.doctor_b)
        self.assertEqual(self.client.get('/api/v1/referrals/').status_code, status.HTTP_200_OK)
        
        self.client.force_authenticate(user=self.health_worker_a)
        self.assertEqual(self.client.get('/api/v1/referrals/').status_code, status.HTTP_200_OK)
        
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.get('/api/v1/referrals/').status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_access(self):
        self.assertEqual(self.client.get('/api/v1/referrals/').status_code, status.HTTP_401_UNAUTHORIZED)

    # --- UPDATE TESTS ---
    def test_doctor_can_update_their_referral(self):
        r = Referral.objects.create(patient=self.patient_a, consultation=self.consultation_a, from_facility=self.facility_a, to_facility=self.facility_b, referred_by=self.doctor_a, reason='Test', priority='NORMAL')
        self.client.force_authenticate(user=self.doctor_a)
        response = self.client.patch(f'/api/v1/referrals/{r.id}/', {'reason': 'Updated'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_doctor_cannot_update_another_doctors_referral(self):
        r = Referral.objects.create(patient=self.patient_a, consultation=self.consultation_a, from_facility=self.facility_a, to_facility=self.facility_c, referred_by=self.doctor_a, reason='Test', priority='NORMAL')
        self.client.force_authenticate(user=self.doctor_b) # Facility B doctor, referral is from A to C
        response = self.client.patch(f'/api/v1/referrals/{r.id}/', {'reason': 'Updated'})
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_destination_doctor_can_update_status(self):
        r = Referral.objects.create(patient=self.patient_a, consultation=self.consultation_a, from_facility=self.facility_a, to_facility=self.facility_b, referred_by=self.doctor_a, reason='Test', priority='NORMAL')
        self.client.force_authenticate(user=self.doctor_b) # Doctor at facility B
        response = self.client.patch(f'/api/v1/referrals/{r.id}/', {'status': 'ACCEPTED', 'referral_notes': 'OK'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'ACCEPTED')

    def test_destination_doctor_cannot_modify_core_fields(self):
        r = Referral.objects.create(patient=self.patient_a, consultation=self.consultation_a, from_facility=self.facility_a, to_facility=self.facility_b, referred_by=self.doctor_a, reason='Test', priority='NORMAL')
        self.client.force_authenticate(user=self.doctor_b)
        response = self.client.patch(f'/api/v1/referrals/{r.id}/', {'patient': str(self.patient_b.id), 'reason': 'Hacked'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_health_worker_cannot_update_referral(self):
        r = Referral.objects.create(patient=self.patient_a, consultation=self.consultation_a, from_facility=self.facility_a, to_facility=self.facility_b, referred_by=self.doctor_a, reason='Test', priority='NORMAL')
        self.client.force_authenticate(user=self.health_worker_a)
        response = self.client.patch(f'/api/v1/referrals/{r.id}/', {'status': 'ACCEPTED'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_update_referral(self):
        r = Referral.objects.create(patient=self.patient_a, consultation=self.consultation_a, from_facility=self.facility_a, to_facility=self.facility_b, referred_by=self.doctor_a, reason='Test', priority='NORMAL')
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/v1/referrals/{r.id}/', {'status': 'CANCELLED'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- STATUS TRANSITION TESTS ---
    def test_pending_to_accepted(self):
        r = Referral.objects.create(patient=self.patient_a, consultation=self.consultation_a, from_facility=self.facility_a, to_facility=self.facility_b, referred_by=self.doctor_a, status='PENDING', priority='NORMAL')
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/v1/referrals/{r.id}/', {'status': 'ACCEPTED'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_accepted_to_completed(self):
        r = Referral.objects.create(patient=self.patient_a, consultation=self.consultation_a, from_facility=self.facility_a, to_facility=self.facility_b, referred_by=self.doctor_a, status='ACCEPTED', priority='NORMAL')
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/v1/referrals/{r.id}/', {'status': 'COMPLETED'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data['completed_at'])

    def test_pending_to_cancelled(self):
        r = Referral.objects.create(patient=self.patient_a, consultation=self.consultation_a, from_facility=self.facility_a, to_facility=self.facility_b, referred_by=self.doctor_a, status='PENDING', priority='NORMAL')
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/v1/referrals/{r.id}/', {'status': 'CANCELLED'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_completed_cannot_return_to_pending(self):
        r = Referral.objects.create(patient=self.patient_a, consultation=self.consultation_a, from_facility=self.facility_a, to_facility=self.facility_b, referred_by=self.doctor_a, status='COMPLETED', priority='NORMAL')
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/v1/referrals/{r.id}/', {'status': 'PENDING'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancelled_cannot_return_to_pending(self):
        r = Referral.objects.create(patient=self.patient_a, consultation=self.consultation_a, from_facility=self.facility_a, to_facility=self.facility_b, referred_by=self.doctor_a, status='CANCELLED', priority='NORMAL')
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/v1/referrals/{r.id}/', {'status': 'PENDING'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_completed_at_remains_null_for_non_completed(self):
        r = Referral.objects.create(patient=self.patient_a, consultation=self.consultation_a, from_facility=self.facility_a, to_facility=self.facility_b, referred_by=self.doctor_a, status='PENDING', priority='NORMAL')
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/v1/referrals/{r.id}/', {'status': 'ACCEPTED'})
        self.assertIsNone(response.data['completed_at'])

    # --- INVALID FIELD TESTS ---
    def test_invalid_priority_rejected(self):
        self.client.force_authenticate(user=self.doctor_a)
        data = self.valid_referral_data.copy()
        data['priority'] = 'SUPER_URGENT'
        response = self.client.post('/api/v1/referrals/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_status_rejected(self):
        r = Referral.objects.create(patient=self.patient_a, consultation=self.consultation_a, from_facility=self.facility_a, to_facility=self.facility_b, referred_by=self.doctor_a, status='PENDING', priority='NORMAL')
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/v1/referrals/{r.id}/', {'status': 'FAKE_STATUS'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- FILTERING TESTS ---
    def test_filtering_works(self):
        r1 = Referral.objects.create(patient=self.patient_a, consultation=self.consultation_a, from_facility=self.facility_a, to_facility=self.facility_b, referred_by=self.doctor_a, status='PENDING', priority='NORMAL')
        r2 = Referral.objects.create(patient=self.patient_a, consultation=self.consultation_a, from_facility=self.facility_a, to_facility=self.facility_c, referred_by=self.doctor_a, status='ACCEPTED', priority='URGENT')
        
        self.client.force_authenticate(user=self.admin)
        
        # Status
        r = self.client.get('/api/v1/referrals/?status=ACCEPTED')
        self.assertEqual(len(r.data['results']), 1)
        self.assertEqual(r.data['results'][0]['id'], str(r2.id))
        
        # To Facility
        r = self.client.get(f'/api/v1/referrals/?to_facility={self.facility_b.id}')
        self.assertEqual(len(r.data['results']), 1)
        self.assertEqual(r.data['results'][0]['id'], str(r1.id))
        
        # Pagination check implicitly passing because 'results' key exists

    # --- METHOD TESTS ---
    def test_put_returns_405(self):
        r = Referral.objects.create(patient=self.patient_a, consultation=self.consultation_a, from_facility=self.facility_a, to_facility=self.facility_b, referred_by=self.doctor_a, status='PENDING', priority='NORMAL')
        self.client.force_authenticate(user=self.admin)
        response = self.client.put(f'/api/v1/referrals/{r.id}/', self.valid_referral_data)
        self.assertIn(response.status_code, [status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_403_FORBIDDEN])

    def test_delete_returns_405(self):
        r = Referral.objects.create(patient=self.patient_a, consultation=self.consultation_a, from_facility=self.facility_a, to_facility=self.facility_b, referred_by=self.doctor_a, status='PENDING', priority='NORMAL')
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/v1/referrals/{r.id}/')
        self.assertIn(response.status_code, [status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_403_FORBIDDEN])
