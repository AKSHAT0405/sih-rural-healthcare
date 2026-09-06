from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()

class AuthTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'email': 'doctor@example.com',
            'password': 'password123',
            'first_name': 'Doc',
            'last_name': 'Tor',
            'role': 'DOCTOR'
        }
        self.user = User.objects.create_user(**self.user_data)
        
        self.admin_user = User.objects.create_user(
            email='admin@example.com', password='password123', role='ADMIN'
        )

    def test_user_creation(self):
        self.assertEqual(User.objects.count(), 2)
        self.assertEqual(self.user.email, 'doctor@example.com')
        # Check password is hashed
        self.assertNotEqual(self.user.password, 'password123')
        self.assertTrue(self.user.check_password('password123'))

    def test_superuser_creation(self):
        super_user = User.objects.create_superuser(
            email='super@example.com', password='password123'
        )
        self.assertTrue(super_user.is_superuser)
        self.assertTrue(super_user.is_staff)
        self.assertEqual(super_user.role, 'ADMIN')

    def test_duplicate_email_rejected(self):
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                email='doctor@example.com', password='newpassword', role='HEALTH_WORKER'
            )

    def test_login_returns_tokens(self):
        response = self.client.post(reverse('token_obtain_pair'), {
            'email': 'doctor@example.com',
            'password': 'password123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        # Check basic user info is returned
        self.assertEqual(response.data['email'], 'doctor@example.com')
        self.assertEqual(response.data['role'], 'DOCTOR')
        self.assertNotIn('password', response.data)

    def test_invalid_login_rejected(self):
        response = self.client.post(reverse('token_obtain_pair'), {
            'email': 'doctor@example.com',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_endpoint_requires_auth(self):
        response = self.client.get(reverse('user_detail'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_endpoint_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse('user_detail'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'doctor@example.com')
        self.assertEqual(response.data['role'], 'DOCTOR')

    def test_role_permissions(self):
        from rest_framework.test import APIRequestFactory
        from apps.accounts.permissions import IsAdmin

        factory = APIRequestFactory()
        permission = IsAdmin()

        # Doctor must be denied
        request = factory.get('/test/')
        request.user = self.user

        self.assertFalse(
            permission.has_permission(request, None)
        )

        # Admin must be allowed
        request = factory.get('/test/')
        request.user = self.admin_user

        self.assertTrue(
            permission.has_permission(request, None)
        )

    def test_user_can_optionally_belong_to_facility(self):
        from apps.facilities.models import Facility
        facility = Facility.objects.create(name='Test Facility', type='PHC')
        self.user.facility = facility
        self.user.save()
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.facility.name, 'Test Facility')

    def test_user_can_exist_without_facility(self):
        # Already created without facility in setUp
        self.assertIsNone(self.admin_user.facility)
        self.assertIsNone(self.user.facility)

    def test_auth_me_returns_facility(self):
        from apps.facilities.models import Facility
        facility = Facility.objects.create(name='Test Facility', type='PHC')
        self.user.facility = facility
        self.user.save()
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse('user_detail'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check facility representation
        self.assertIn('facility', response.data)
        self.assertIsNotNone(response.data['facility'])
        self.assertEqual(response.data['facility']['name'], 'Test Facility')
        self.assertEqual(response.data['facility']['type'], 'PHC')
        
    def test_auth_me_returns_null_facility(self):
        # Admin has no facility
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(reverse('user_detail'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('facility', response.data)
        self.assertIsNone(response.data['facility'])


class DoctorProfileAndAvailabilityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.doctor = User.objects.create_user(
            email='testdoc@example.com', password='password123', role='DOCTOR'
        )
        self.patient = User.objects.create_user(
            email='patient@example.com', password='password123', role='PATIENT'
        )
        self.doctor_b = User.objects.create_user(
            email='doc_b@example.com', password='password123', role='DOCTOR'
        )
        self.admin = User.objects.create_user(
            email='admin2@example.com', password='password123', role='ADMIN'
        )

    def test_doctor_can_create_profile(self):
        self.client.force_authenticate(user=self.doctor)
        response = self.client.post('/api/v1/auth/doctor-profiles/', {
            'specialization': 'Cardiology',
            'qualifications': 'MD',
            'experience_years': 10
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['specialization'], 'Cardiology')
        self.assertEqual(str(response.data['user']), str(self.doctor.id))

    def test_patient_cannot_create_doctor_profile(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.post('/api/v1/auth/doctor-profiles/', {
            'specialization': 'Cardiology',
            'qualifications': 'MD',
            'experience_years': 5
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_can_create_availability(self):
        self.client.force_authenticate(user=self.doctor)
        response = self.client.post('/api/v1/auth/doctor-availability/', {
            'day_of_week': 0,
            'start_time': '09:00:00',
            'end_time': '17:00:00'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['day_of_week'], 0)
        self.assertEqual(str(response.data['doctor']), str(self.doctor.id))

    def test_invalid_availability_times(self):
        self.client.force_authenticate(user=self.doctor)
        response = self.client.post('/api/v1/auth/doctor-availability/', {
            'day_of_week': 0,
            'start_time': '17:00:00',
            'end_time': '09:00:00'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('end_time', response.data)

    def test_overlapping_availability_rejected(self):
        self.client.force_authenticate(user=self.doctor)
        self.client.post('/api/v1/auth/doctor-availability/', {
            'day_of_week': 1,
            'start_time': '09:00:00',
            'end_time': '13:00:00'
        })
        
        response = self.client.post('/api/v1/auth/doctor-availability/', {
            'day_of_week': 1,
            'start_time': '12:00:00',
            'end_time': '15:00:00'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non_field_errors', response.data)

    def test_cross_doctor_modification_prevented(self):
        from .models import DoctorProfile
        profile = DoctorProfile.objects.create(
            user=self.doctor, specialization='Test', qualifications='Test'
        )
        self.client.force_authenticate(user=self.doctor_b)
        response = self.client.patch(f'/api/v1/auth/doctor-profiles/{profile.id}/', {
            'specialization': 'Hacked'
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_modify_profiles(self):
        from .models import DoctorProfile
        profile = DoctorProfile.objects.create(
            user=self.doctor, specialization='Test', qualifications='Test'
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/v1/auth/doctor-profiles/{profile.id}/', {
            'specialization': 'Admin Updated'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['specialization'], 'Admin Updated')