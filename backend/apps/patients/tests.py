from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from apps.patients.models import Patient
from apps.facilities.models import Facility
import datetime

User = get_user_model()

class PatientAPITests(APITestCase):
    def setUp(self):
        self.facility_a = Facility.objects.create(name='Facility A', type='PHC')
        self.facility_b = Facility.objects.create(name='Facility B', type='SUB_CENTER')
        self.inactive_facility = Facility.objects.create(name='Inactive', type='PHC', is_active=False)

        self.admin = User.objects.create_user(email='admin@example.com', password='password', role='ADMIN')
        self.doctor = User.objects.create_user(email='doctor@example.com', password='password', role='DOCTOR')
        
        self.health_worker_a = User.objects.create_user(email='hwa@example.com', password='password', role='HEALTH_WORKER', facility=self.facility_a)
        self.health_worker_b = User.objects.create_user(email='hwb@example.com', password='password', role='HEALTH_WORKER', facility=self.facility_b)
        self.health_worker_none = User.objects.create_user(email='hwnone@example.com', password='password', role='HEALTH_WORKER')
        
        self.patient_data = {
            'full_name': 'John Doe',
            'date_of_birth': '1990-01-01',
            'gender': 'MALE',
            'phone': '1234567890',
            'facility': str(self.facility_a.id)
        }

    def test_admin_can_create_patient_for_facility_a(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/patients/', self.patient_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data['facility']), str(self.facility_a.id))

    def test_admin_can_create_patient_for_facility_b(self):
        self.client.force_authenticate(user=self.admin)
        data = self.patient_data.copy()
        data['facility'] = str(self.facility_b.id)
        response = self.client.post('/api/v1/patients/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data['facility']), str(self.facility_b.id))

    def test_health_worker_a_can_create_patient_for_facility_a(self):
        self.client.force_authenticate(user=self.health_worker_a)
        response = self.client.post('/api/v1/patients/', self.patient_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_health_worker_a_cannot_create_patient_for_facility_b(self):
        self.client.force_authenticate(user=self.health_worker_a)
        data = self.patient_data.copy()
        data['facility'] = str(self.facility_b.id)
        response = self.client.post('/api/v1/patients/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_health_worker_none_cannot_create_patient(self):
        self.client.force_authenticate(user=self.health_worker_none)
        response = self.client.post('/api/v1/patients/', self.patient_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_created_by_is_automatically_assigned(self):
        self.client.force_authenticate(user=self.health_worker_a)
        response = self.client.post('/api/v1/patients/', self.patient_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data['created_by']), str(self.health_worker_a.id))

    def test_client_cannot_spoof_created_by(self):
        self.client.force_authenticate(user=self.health_worker_a)
        data = self.patient_data.copy()
        data['created_by'] = str(self.admin.id)
        response = self.client.post('/api/v1/patients/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data['created_by']), str(self.health_worker_a.id))

    def test_health_worker_cannot_move_patient_between_facilities(self):
        patient = Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name='Alice', gender='FEMALE')
        self.client.force_authenticate(user=self.health_worker_a)
        response = self.client.patch(f'/api/v1/patients/{patient.id}/', {'facility': str(self.facility_b.id)})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_health_worker_can_update_normal_patient_info_within_facility(self):
        patient = Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name='Alice', gender='FEMALE')
        self.client.force_authenticate(user=self.health_worker_a)
        response = self.client.patch(f'/api/v1/patients/{patient.id}/', {'full_name': 'Alice Updated'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['full_name'], 'Alice Updated')

    def test_admin_can_move_patient_between_facilities(self):
        patient = Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name='Alice', gender='FEMALE')
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/v1/patients/{patient.id}/', {'facility': str(self.facility_b.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(response.data['facility']), str(self.facility_b.id))

    def test_doctor_cannot_create_patient(self):
        self.client.force_authenticate(user=self.doctor)
        response = self.client.post('/api/v1/patients/', self.patient_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_cannot_update_patient(self):
        patient = Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name='Alice', gender='FEMALE')
        self.client.force_authenticate(user=self.doctor)
        response = self.client.patch(f'/api/v1/patients/{patient.id}/', {'full_name': 'Jane'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_can_retrieve_patient(self):
        patient = Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name='Alice', gender='FEMALE')
        self.client.force_authenticate(user=self.doctor)
        response = self.client.get(f'/api/v1/patients/{patient.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_doctor_can_list_patients(self):
        Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name='Alice', gender='FEMALE')
        self.client.force_authenticate(user=self.doctor)
        response = self.client.get('/api/v1/patients/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_unauthenticated_users_remain_blocked(self):
        response = self.client.get('/api/v1/patients/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        response = self.client.post('/api/v1/patients/', self.patient_data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_facility_id_rejected(self):
        self.client.force_authenticate(user=self.admin)
        data = self.patient_data.copy()
        data['facility'] = '00000000-0000-0000-0000-000000000000'
        response = self.client.post('/api/v1/patients/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inactive_facility_cannot_be_selected_when_creating_new_patient(self):
        self.client.force_authenticate(user=self.admin)
        data = self.patient_data.copy()
        data['facility'] = str(self.inactive_facility.id)
        response = self.client.post('/api/v1/patients/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_existing_patient_search_still_works(self):
        Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name='Alice Smith', gender='FEMALE')
        Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name='Bob Jones', gender='MALE')
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/patients/?search=Alice')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['full_name'], 'Alice Smith')

    def test_existing_pagination_still_works(self):
        for i in range(25):
            Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name=f'Patient {i}', gender='MALE')
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/patients/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 20)
        self.assertIsNotNone(response.data['next'])

    def test_health_worker_cannot_update_patient_from_other_facility(self):
        patient = Patient.objects.create(created_by=self.admin, facility=self.facility_b, full_name='Alice', gender='FEMALE')
        self.client.force_authenticate(user=self.health_worker_a)
        response = self.client.patch(f'/api/v1/patients/{patient.id}/', {'full_name': 'Jane'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_can_retrieve_own_profile(self):
        patient_user = User.objects.create_user(email='pat@example.com', password='pw', role='PATIENT')
        patient = Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name='Pat', gender='MALE', user=patient_user)
        self.client.force_authenticate(user=patient_user)
        response = self.client.get(f'/api/v1/patients/{patient.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_patient_cannot_retrieve_other_profile(self):
        patient_user = User.objects.create_user(email='pat2@example.com', password='pw', role='PATIENT')
        Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name='Pat', gender='MALE', user=patient_user)
        other_patient = Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name='Other', gender='MALE')
        self.client.force_authenticate(user=patient_user)
        response = self.client.get(f'/api/v1/patients/{other_patient.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
    def test_patient_list_only_shows_own_profile(self):
        patient_user = User.objects.create_user(email='pat3@example.com', password='pw', role='PATIENT')
        Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name='Pat', gender='MALE', user=patient_user)
        Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name='Other', gender='MALE')
        self.client.force_authenticate(user=patient_user)
        response = self.client.get('/api/v1/patients/')
        self.assertEqual(len(response.data['results']), 1)

    def test_admin_can_create_patient_account(self):
        patient = Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name='No Account', gender='MALE', phone='5551234')
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/patients/{patient.id}/create_account/', {
            'email': 'newpat@example.com',
            'password': 'securepassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        patient.refresh_from_db()
        self.assertIsNotNone(patient.user)
        self.assertEqual(patient.user.email, 'newpat@example.com')
        self.assertEqual(patient.user.role, 'PATIENT')

    def test_cannot_create_account_for_patient_twice(self):
        patient = Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name='Has Account', gender='MALE')
        user = User.objects.create_user(email='has@example.com', password='pw', role='PATIENT')
        patient.user = user
        patient.save()
        
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/patients/{patient.id}/create_account/', {
            'email': 'newemail@example.com',
            'password': 'securepassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_cannot_create_patient_account(self):
        patient = Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name='No Account', gender='MALE')
        self.client.force_authenticate(user=self.doctor)
        response = self.client.post(f'/api/v1/patients/{patient.id}/create_account/', {
            'email': 'docpat@example.com',
            'password': 'securepassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_health_worker_can_create_patient_account(self):
        patient = Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name='HW Account', gender='MALE')
        self.client.force_authenticate(user=self.health_worker_a)
        response = self.client.post(f'/api/v1/patients/{patient.id}/create_account/', {
            'email': 'hwpat@example.com',
            'password': 'securepassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_patient_cannot_create_patient_account(self):
        patient = Patient.objects.create(created_by=self.admin, facility=self.facility_a, full_name='Pat Account', gender='MALE')
        pat_user = User.objects.create_user(email='pat_actor@example.com', password='pw', role='PATIENT')
        self.client.force_authenticate(user=pat_user)
        response = self.client.post(f'/api/v1/patients/{patient.id}/create_account/', {
            'email': 'patpat@example.com',
            'password': 'securepassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
