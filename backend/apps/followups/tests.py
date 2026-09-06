from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.facilities.models import Facility
from apps.patients.models import Patient
from apps.consultations.models import Consultation
from apps.referrals.models import Referral
from apps.followups.models import FollowUp
import datetime

User = get_user_model()

class FollowUpAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Facilities
        self.facility1 = Facility.objects.create(name="Clinic A", type="CLINIC")
        self.facility2 = Facility.objects.create(name="Hospital B", type="HOSPITAL")
        
        # Users
        self.admin = User.objects.create_user(email='admin@example.com', password='pw', role='ADMIN')
        self.doctor1 = User.objects.create_user(email='doc1@example.com', password='pw', role='DOCTOR', facility=self.facility1)
        self.doctor2 = User.objects.create_user(email='doc2@example.com', password='pw', role='DOCTOR', facility=self.facility2)
        self.hw = User.objects.create_user(email='hw@example.com', password='pw', role='HEALTH_WORKER', facility=self.facility1)
        
        # Patient
        self.patient1 = Patient.objects.create(
            full_name="John Doe", phone="+1234567890", gender="MALE", 
            date_of_birth="1990-01-01", facility=self.facility1, created_by=self.hw
        )
        
        # Consultations
        self.consultation1 = Consultation.objects.create(
            patient=self.patient1, doctor=self.doctor1, facility=self.facility1,
            chief_complaint="Fever", status="COMPLETED"
        )
        self.consultation2 = Consultation.objects.create(
            patient=self.patient1, doctor=self.doctor2, facility=self.facility2,
            chief_complaint="Headache", status="COMPLETED"
        )
        
        # Referral
        self.referral1 = Referral.objects.create(
            patient=self.patient1, consultation=self.consultation1,
            from_facility=self.facility1, to_facility=self.facility2,
            referred_by=self.doctor1, reason="Needs MRI", priority="NORMAL", status="PENDING"
        )

        self.valid_payload = {
            'patient': str(self.patient1.id),
            'consultation': str(self.consultation1.id),
            'scheduled_date': '2025-10-01',
            'notes': 'Follow up on fever'
        }
        
        self.url = reverse('followup-list')

    def test_unauthenticated_rejected(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        
        res = self.client.post(self.url, self.valid_payload)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_doctor_create_followup_for_own_consultation(self):
        self.client.force_authenticate(user=self.doctor1)
        res = self.client.post(self.url, self.valid_payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['status'], 'SCHEDULED')
        self.assertEqual(str(res.data['created_by']), str(self.doctor1.id))
        self.assertIsNone(res.data['completed_at'])

    def test_doctor_create_followup_for_other_consultation_rejected(self):
        # Doctor 2 tries to create follow up for Consultation 1 (done by Doctor 1)
        self.client.force_authenticate(user=self.doctor2)
        res = self.client.post(self.url, self.valid_payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('consultation', res.data)

    def test_spoof_created_by(self):
        self.client.force_authenticate(user=self.doctor1)
        payload = self.valid_payload.copy()
        payload['created_by'] = str(self.admin.id)
        res = self.client.post(self.url, payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(res.data['created_by']), str(self.doctor1.id)) # Ignores spoof

    def test_spoof_status_rejected(self):
        self.client.force_authenticate(user=self.doctor1)
        for s in ['COMPLETED', 'MISSED', 'CANCELLED']:
            payload = self.valid_payload.copy()
            payload['status'] = s
            res = self.client.post(self.url, payload)
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('status', res.data)

    def test_patient_consultation_mismatch(self):
        self.client.force_authenticate(user=self.admin)
        patient2 = Patient.objects.create(
            full_name="Jane Doe", phone="+1987654321", gender="FEMALE", 
            date_of_birth="1995-01-01", facility=self.facility1, created_by=self.admin
        )
        payload = self.valid_payload.copy()
        payload['patient'] = str(patient2.id) # Mismatch
        res = self.client.post(self.url, payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('consultation', res.data)

    def test_referral_patient_mismatch_and_different_consultation_allowed(self):
        self.client.force_authenticate(user=self.doctor1)
        
        # 1. Referral for a different patient is rejected
        patient2 = Patient.objects.create(
            full_name="Jane Doe", phone="+1987654321", gender="FEMALE", 
            date_of_birth="1995-01-01", facility=self.facility1, created_by=self.admin
        )
        ref_diff_patient = Referral.objects.create(
            patient=patient2, consultation=self.consultation1,
            from_facility=self.facility1, to_facility=self.facility2,
            referred_by=self.doctor1, reason="Test", priority="NORMAL", status="PENDING"
        )
        payload1 = self.valid_payload.copy()
        payload1['referral'] = str(ref_diff_patient.id)
        res1 = self.client.post(self.url, payload1)
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('referral', res1.data)

        # 2. Referral for the same patient but different consultation IS allowed
        # Let's use consultation2 for the patient (which belongs to doctor2)
        ref_diff_consultation = Referral.objects.create(
            patient=self.patient1, consultation=self.consultation2,
            from_facility=self.facility2, to_facility=self.facility1,
            referred_by=self.doctor2, reason="Test", priority="NORMAL", status="PENDING"
        )
        payload2 = self.valid_payload.copy()
        payload2['referral'] = str(ref_diff_consultation.id)
        res2 = self.client.post(self.url, payload2)
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(res2.data['referral']), str(ref_diff_consultation.id))

    def test_doctor_update_followup_for_other_consultation_rejected(self):
        # Admin creates a followup for consultation1 (Doctor 1)
        fu = FollowUp.objects.create(
            patient=self.patient1, consultation=self.consultation1,
            scheduled_date='2025-10-01', created_by=self.admin
        )
        # Doctor 2 (different doctor, different facility) tries to update it
        self.client.force_authenticate(user=self.doctor2)
        detail_url = reverse('followup-detail', args=[fu.id])
        res = self.client.patch(detail_url, {'notes': 'Hacked!'})
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])
        
        # Doctor 3 (same facility as patient, but not the consultation doctor) tries to update it
        doctor3 = User.objects.create_user(email='doc3@example.com', password='pw', role='DOCTOR', facility=self.facility1)
        self.client.force_authenticate(user=doctor3)
        res2 = self.client.patch(detail_url, {'notes': 'Hacked again!'})
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)

        # Doctor 1 (the consultation doctor) can update it
        self.client.force_authenticate(user=self.doctor1)
        res3 = self.client.patch(detail_url, {'notes': 'Legit update'})
        self.assertEqual(res3.status_code, status.HTTP_200_OK)

    def test_status_transitions(self):
        self.client.force_authenticate(user=self.doctor1)
        res = self.client.post(self.url, self.valid_payload)
        fu_id = res.data['id']
        detail_url = reverse('followup-detail', args=[fu_id])

        # Test SCHEDULED -> COMPLETED
        res_complete = self.client.patch(detail_url, {'status': 'COMPLETED'})
        self.assertEqual(res_complete.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(res_complete.data['completed_at'])

        # Test terminal COMPLETED -> SCHEDULED (rejected)
        res_revert = self.client.patch(detail_url, {'status': 'SCHEDULED'})
        self.assertEqual(res_revert.status_code, status.HTTP_400_BAD_REQUEST)

    def test_health_worker_permissions(self):
        # Create a FollowUp as admin first
        fu = FollowUp.objects.create(
            patient=self.patient1, consultation=self.consultation1,
            scheduled_date='2025-10-01', created_by=self.admin
        )
        
        self.client.force_authenticate(user=self.hw)
        
        # Read-only works
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['results']), 1)
        
        # Create rejected
        res2 = self.client.post(self.url, self.valid_payload)
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)
        
        # Update rejected
        res3 = self.client.patch(reverse('followup-detail', args=[fu.id]), {'status': 'COMPLETED'})
        self.assertEqual(res3.status_code, status.HTTP_403_FORBIDDEN)

    def test_disallowed_methods(self):
        self.client.force_authenticate(user=self.admin)
        fu = FollowUp.objects.create(
            patient=self.patient1, consultation=self.consultation1,
            scheduled_date='2025-10-01', created_by=self.admin
        )
        url = reverse('followup-detail', args=[fu.id])
        
        res_put = self.client.put(url, self.valid_payload)
        self.assertEqual(res_put.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        
        res_del = self.client.delete(url)
        self.assertEqual(res_del.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_filtering(self):
        self.client.force_authenticate(user=self.admin)
        FollowUp.objects.create(patient=self.patient1, consultation=self.consultation1, scheduled_date='2025-10-01', status='SCHEDULED')
        FollowUp.objects.create(patient=self.patient1, consultation=self.consultation1, scheduled_date='2025-10-02', status='COMPLETED')
        
        res1 = self.client.get(self.url + '?status=SCHEDULED')
        self.assertEqual(len(res1.data['results']), 1)
        self.assertEqual(res1.data['results'][0]['status'], 'SCHEDULED')
        
        res2 = self.client.get(self.url + f'?patient={self.patient1.id}')
        self.assertEqual(len(res2.data['results']), 2)
