from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User
from apps.facilities.models import Facility
from .models import InventoryItem

class InventoryAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create Facilities
        self.facility1 = Facility.objects.create(name="Facility 1", type="PHC")
        self.facility2 = Facility.objects.create(name="Facility 2", type="SUB_CENTER")
        
        # Create Users
        self.admin = User.objects.create_superuser('admin@example.com', 'pass123')
        self.hw1 = User.objects.create_user('hw1@example.com', 'pass123', role='HEALTH_WORKER', facility=self.facility1)
        self.hw2 = User.objects.create_user('hw2@example.com', 'pass123', role='HEALTH_WORKER', facility=self.facility2)
        self.patient = User.objects.create_user('patient@example.com', 'pass123', role='PATIENT')
        self.doctor = User.objects.create_user('doctor@example.com', 'pass123', role='DOCTOR', facility=self.facility1)
        
        # Create Initial Inventory
        self.item1 = InventoryItem.objects.create(
            facility=self.facility1, name="Paracetamol", item_type="MEDICINE", 
            quantity=100, availability_status="AVAILABLE"
        )
        self.item2 = InventoryItem.objects.create(
            facility=self.facility2, name="Bandages", item_type="MEDICINE", 
            quantity=50, availability_status="AVAILABLE"
        )

    def test_hw_can_list_own_facility_inventory(self):
        self.client.force_authenticate(user=self.hw1)
        res = self.client.get('/api/v1/inventory/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], "Paracetamol")

    def test_hw_can_create_for_own_facility(self):
        self.client.force_authenticate(user=self.hw1)
        data = {
            "name": "Ibuprofen",
            "item_type": "MEDICINE",
            "quantity": 200,
            "availability_status": "AVAILABLE"
        }
        # Attempt to create with NO facility provided (backend should inject it)
        res = self.client.post('/api/v1/inventory/', data)
        if res.status_code != 201:
            print("HW create error:", res.data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(res.data['facility']), str(self.facility1.id))
        
        # Attempt to create for ANOTHER facility (backend should ignore and force own)
        data['facility'] = str(self.facility2.id)
        res = self.client.post('/api/v1/inventory/', data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(res.data['facility']), str(self.facility1.id))

    def test_hw_cannot_update_other_facility_inventory(self):
        self.client.force_authenticate(user=self.hw1)
        # item2 belongs to facility2
        res = self.client.patch(f'/api/v1/inventory/{self.item2.id}/', {"quantity": 10})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND) # get_queryset hides it

    def test_patient_cannot_modify(self):
        self.client.force_authenticate(user=self.patient)
        data = {
            "name": "Syringe",
            "item_type": "EQUIPMENT",
            "availability_status": "AVAILABLE_EQUIPMENT"
        }
        res = self.client.post('/api/v1/inventory/', data)
        if res.status_code != 403:
            print("Patient modify error:", res.data)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        
        res = self.client.patch(f'/api/v1/inventory/{self.item1.id}/', {"quantity": 10})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_negative_quantity_rejected(self):
        self.client.force_authenticate(user=self.hw1)
        data = {
            "name": "Invalid Med",
            "item_type": "MEDICINE",
            "quantity": -5,
            "availability_status": "AVAILABLE"
        }
        res = self.client.post('/api/v1/inventory/', data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('quantity', res.data)

    def test_admin_can_view_all_and_modify(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/inventory/')
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 2)
        
        data = {
            "facility": str(self.facility2.id),
            "name": "Admin Med",
            "item_type": "MEDICINE",
            "quantity": 10,
            "availability_status": "AVAILABLE"
        }
        res = self.client.post('/api/v1/inventory/', data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(InventoryItem.objects.count(), 3)
