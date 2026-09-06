from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.facilities.models import Facility

User = get_user_model()

class FacilityAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(email='admin@example.com', password='password', role='ADMIN')
        self.doctor = User.objects.create_user(email='doctor@example.com', password='password', role='DOCTOR')
        self.health_worker = User.objects.create_user(email='hw@example.com', password='password', role='HEALTH_WORKER')
        
        self.facility_data = {
            'name': 'Central Clinic',
            'type': 'PHC',
            'address': '123 Main St',
            'latitude': '12.345678',
            'longitude': '98.765432'
        }

    def test_admin_can_create_facility(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/facilities/', self.facility_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Central Clinic')

    def test_admin_can_list_facilities(self):
        Facility.objects.create(**self.facility_data)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/facilities/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_admin_can_retrieve_facility(self):
        facility = Facility.objects.create(**self.facility_data)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/v1/facilities/{facility.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_update_facility(self):
        facility = Facility.objects.create(**self.facility_data)
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/v1/facilities/{facility.id}/', {'name': 'Updated Clinic'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Clinic')

    def test_doctor_can_list_facilities(self):
        Facility.objects.create(**self.facility_data)
        self.client.force_authenticate(user=self.doctor)
        response = self.client.get('/api/v1/facilities/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_doctor_can_retrieve_facility(self):
        facility = Facility.objects.create(**self.facility_data)
        self.client.force_authenticate(user=self.doctor)
        response = self.client.get(f'/api/v1/facilities/{facility.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_doctor_cannot_create_facility(self):
        self.client.force_authenticate(user=self.doctor)
        response = self.client.post('/api/v1/facilities/', self.facility_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_cannot_update_facility(self):
        facility = Facility.objects.create(**self.facility_data)
        self.client.force_authenticate(user=self.doctor)
        response = self.client.patch(f'/api/v1/facilities/{facility.id}/', {'name': 'Hack'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_health_worker_can_list_facilities(self):
        Facility.objects.create(**self.facility_data)
        self.client.force_authenticate(user=self.health_worker)
        response = self.client.get('/api/v1/facilities/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_health_worker_can_retrieve_facility(self):
        facility = Facility.objects.create(**self.facility_data)
        self.client.force_authenticate(user=self.health_worker)
        response = self.client.get(f'/api/v1/facilities/{facility.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_health_worker_cannot_create_facility(self):
        self.client.force_authenticate(user=self.health_worker)
        response = self.client.post('/api/v1/facilities/', self.facility_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_health_worker_cannot_update_facility(self):
        facility = Facility.objects.create(**self.facility_data)
        self.client.force_authenticate(user=self.health_worker)
        response = self.client.patch(f'/api/v1/facilities/{facility.id}/', {'name': 'Hack'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_users_cannot_access(self):
        response = self.client.get('/api/v1/facilities/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_facility_search_by_name(self):
        Facility.objects.create(name='Alpha Hospital', type='PHC')
        Facility.objects.create(name='Beta Clinic', type='SUB_CENTER')
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/facilities/?search=Alpha')
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Alpha Hospital')

    def test_facility_search_by_address(self):
        Facility.objects.create(name='A', type='PHC', address='100 North Way')
        Facility.objects.create(name='B', type='PHC', address='200 South Rd')
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/facilities/?search=North')
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'A')

    def test_pagination_works(self):
        for i in range(25):
            Facility.objects.create(name=f'Facility {i}', type='PHC')
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/facilities/')
        self.assertEqual(len(response.data['results']), 20)
        self.assertIsNotNone(response.data['next'])

    def test_invalid_latitude_rejected(self):
        self.client.force_authenticate(user=self.admin)
        bad_data = self.facility_data.copy()
        bad_data['latitude'] = '100.00'
        response = self.client.post('/api/v1/facilities/', bad_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_longitude_rejected(self):
        self.client.force_authenticate(user=self.admin)
        bad_data = self.facility_data.copy()
        bad_data['longitude'] = '200.00'
        response = self.client.post('/api/v1/facilities/', bad_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_facility_type_rejected(self):
        self.client.force_authenticate(user=self.admin)
        bad_data = self.facility_data.copy()
        bad_data['type'] = 'SPACE_STATION'
        response = self.client.post('/api/v1/facilities/', bad_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
