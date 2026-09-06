import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from apps.facilities.models import Facility
from apps.accounts.models import User, DoctorProfile, DoctorAvailability
from apps.patients.models import Patient
from apps.consultations.models import Consultation, Appointment, MedicalRecord
from apps.referrals.models import Referral
from apps.followups.models import FollowUp
from apps.inventory.models import InventoryItem

class Command(BaseCommand):
    help = 'Seeds the database with deterministic demo data for the Rural Healthcare prototype.'

    def handle(self, *args, **options):
        self.stdout.write('Starting demo data seeding...')
        
        counts = {
            'facilities': 0,
            'users': 0,
            'doctor_profiles': 0,
            'doctor_availabilities': 0,
            'patients': 0,
            'consultations': 0,
            'appointments': 0,
            'medical_records': 0,
            'referrals': 0,
            'followups': 0,
            'inventory_items': 0
        }

        with transaction.atomic():
            # 1. FACILITIES
            facility_a, created = Facility.objects.get_or_create(
                name='Shakti Rural Health Centre',
                defaults={
                    'type': 'PHYSICAL',
                    'address': 'Jaipur Rural',
                    'phone': '1800123456'
                }
            )
            if created: counts['facilities'] += 1

            facility_b, created = Facility.objects.get_or_create(
                name='Swasthya Community Clinic',
                defaults={
                    'type': 'PHYSICAL',
                    'address': 'Dausa Rural',
                    'phone': '1800654321'
                }
            )
            if created: counts['facilities'] += 1

            # 2. USERS
            demo_password = 'Demo@12345'
            
            # Admin
            admin_user, created = User.objects.get_or_create(
                email='admin.demo@example.com',
                defaults={
                    'first_name': 'Demo',
                    'last_name': 'Administrator',
                    'role': 'ADMIN',
                    'is_staff': True,
                    'is_superuser': True
                }
            )
            if created: 
                admin_user.set_password(demo_password)
                admin_user.save()
                counts['users'] += 1

            # Health Worker
            hw_user, created = User.objects.get_or_create(
                email='healthworker.demo@example.com',
                defaults={
                    'first_name': 'Demo',
                    'last_name': 'Health Worker',
                    'role': 'HEALTH_WORKER',
                    'facility': facility_a
                }
            )
            if created:
                hw_user.set_password(demo_password)
                hw_user.save()
                counts['users'] += 1

            # Doctor 1
            doctor_a, created = User.objects.get_or_create(
                email='doctor.ananya@example.com',
                defaults={
                    'first_name': 'Ananya',
                    'last_name': 'Sharma',
                    'role': 'DOCTOR',
                    'facility': facility_a,
                    'phone': '9876543210'
                }
            )
            if created:
                doctor_a.set_password(demo_password)
                doctor_a.save()
                counts['users'] += 1

                # Profile
                DoctorProfile.objects.create(
                    user=doctor_a,
                    specialization='General Medicine',
                    qualifications='MBBS, MD',
                    experience_years=8,
                    bio='Passionate about serving rural communities and providing comprehensive general care.'
                )
                counts['doctor_profiles'] += 1

                # Availability
                for day in range(5):  # Mon-Fri
                    DoctorAvailability.objects.create(
                        doctor=doctor_a,
                        day_of_week=day,
                        start_time=datetime.time(9, 0),
                        end_time=datetime.time(13, 0)
                    )
                counts['doctor_availabilities'] += 5

            # Doctor 2
            doctor_b, created = User.objects.get_or_create(
                email='doctor.rahul@example.com',
                defaults={
                    'first_name': 'Rahul',
                    'last_name': 'Mehta',
                    'role': 'DOCTOR',
                    'facility': facility_b,
                    'phone': '9123456789'
                }
            )
            if created:
                doctor_b.set_password(demo_password)
                doctor_b.save()
                counts['users'] += 1

                # Profile
                DoctorProfile.objects.create(
                    user=doctor_b,
                    specialization='Pediatrics',
                    qualifications='MBBS, DCH',
                    experience_years=6,
                    bio='Dedicated pediatrician focusing on child health and preventative care.'
                )
                counts['doctor_profiles'] += 1

                # Availability
                for day in range(5):  # Mon-Fri
                    DoctorAvailability.objects.create(
                        doctor=doctor_b,
                        day_of_week=day,
                        start_time=datetime.time(10, 0),
                        end_time=datetime.time(14, 0)
                    )
                counts['doctor_availabilities'] += 5

            # 3. PATIENTS
            # Patient 1: Priya Verma
            priya_user, created = User.objects.get_or_create(
                email='patient.priya@example.com',
                defaults={
                    'first_name': 'Priya',
                    'last_name': 'Verma',
                    'role': 'PATIENT',
                    'facility': facility_a
                }
            )
            if created:
                priya_user.set_password(demo_password)
                priya_user.save()
                counts['users'] += 1

            patient_priya, created = Patient.objects.get_or_create(
                phone='9876543211',
                defaults={
                    'full_name': 'Priya Verma',
                    'gender': 'FEMALE',
                    'date_of_birth': datetime.date(1990, 5, 14),
                    'facility': facility_a,
                    'created_by': hw_user,
                    'user': priya_user
                }
            )
            if created: counts['patients'] += 1

            # Patient 2: Arjun Singh
            arjun_user, created = User.objects.get_or_create(
                email='patient.arjun@example.com',
                defaults={
                    'first_name': 'Arjun',
                    'last_name': 'Singh',
                    'role': 'PATIENT',
                    'facility': facility_b
                }
            )
            if created:
                arjun_user.set_password(demo_password)
                arjun_user.save()
                counts['users'] += 1

            patient_arjun, created = Patient.objects.get_or_create(
                phone='9876543212',
                defaults={
                    'full_name': 'Arjun Singh',
                    'gender': 'MALE',
                    'date_of_birth': datetime.date(1985, 11, 20),
                    'facility': facility_b,
                    'created_by': hw_user,
                    'user': arjun_user
                }
            )
            if created: counts['patients'] += 1

            # Patient 3: Neha Kumari
            neha_user, created = User.objects.get_or_create(
                email='patient.neha@example.com',
                defaults={
                    'first_name': 'Neha',
                    'last_name': 'Kumari',
                    'role': 'PATIENT',
                    'facility': facility_a
                }
            )
            if created:
                neha_user.set_password(demo_password)
                neha_user.save()
                counts['users'] += 1

            patient_neha, created = Patient.objects.get_or_create(
                phone='9876543213',
                defaults={
                    'full_name': 'Neha Kumari',
                    'gender': 'FEMALE',
                    'date_of_birth': datetime.date(1995, 2, 28),
                    'facility': facility_a,
                    'created_by': hw_user,
                    'user': neha_user
                }
            )
            if created: counts['patients'] += 1

            # 4. PATIENT JOURNEYS
            now = timezone.now()
            today = now.date()

            # Priya: Completed Consultation, Med Record, Followup, Referral
            if not Consultation.objects.filter(patient=patient_priya, status='COMPLETED').exists():
                consultation_priya = Consultation.objects.create(
                    patient=patient_priya,
                    doctor=doctor_a,
                    facility=facility_a,
                    chief_complaint='Persistent fever and fatigue for 3 days',
                    clinical_notes='Patient presented with high temp. Prescribed rest and paracetamol.',
                    status='COMPLETED',
                    priority='NORMAL',
                    consulted_at=now - datetime.timedelta(days=1)
                )
                counts['consultations'] += 1

                Appointment.objects.create(
                    patient=patient_priya,
                    doctor=doctor_a,
                    facility=facility_a,
                    consultation=consultation_priya,
                    scheduled_date=today - datetime.timedelta(days=1),
                    start_time=datetime.time(9, 30),
                    end_time=datetime.time(10, 0),
                    status='COMPLETED',
                    mode='IN_PERSON'
                )
                counts['appointments'] += 1

                MedicalRecord.objects.create(
                    consultation=consultation_priya,
                    chief_complaint='Persistent fever and fatigue',
                    examination_notes='Temperature mildly elevated (100.2F). General examination otherwise stable. No signs of respiratory distress.',
                    diagnosis='Viral febrile illness',
                    treatment_plan='Rest, hydration, monitoring, return if symptoms worsen.',
                    medications='Paracetamol 500mg - 1 tab three times a day as needed for fever.',
                    doctor_notes='Patient advised to monitor temperature and return for worsening symptoms.'
                )
                counts['medical_records'] += 1

                FollowUp.objects.create(
                    patient=patient_priya,
                    consultation=consultation_priya,
                    scheduled_date=today + datetime.timedelta(days=7),
                    status='SCHEDULED',
                    reason='Fever review',
                    created_by=doctor_a
                )
                counts['followups'] += 1

                Referral.objects.create(
                    patient=patient_priya,
                    consultation=consultation_priya,
                    from_facility=facility_a,
                    to_facility=facility_b,
                    to_doctor=doctor_b,
                    referred_by=doctor_a,
                    reason='Specialist evaluation required for prolonged symptoms.',
                    priority='URGENT',
                    status='PENDING'
                )
                counts['referrals'] += 1

            # Arjun: Scheduled Consultation and Appointment
            if not Consultation.objects.filter(patient=patient_arjun, status='SCHEDULED').exists():
                consultation_arjun = Consultation.objects.create(
                    patient=patient_arjun,
                    doctor=doctor_b,
                    facility=facility_b,
                    chief_complaint='Child complaining of stomach ache',
                    status='SCHEDULED',
                    priority='NORMAL'
                )
                counts['consultations'] += 1

                Appointment.objects.create(
                    patient=patient_arjun,
                    doctor=doctor_b,
                    facility=facility_b,
                    consultation=consultation_arjun,
                    scheduled_date=today + datetime.timedelta(days=1),
                    start_time=datetime.time(10, 30),
                    end_time=datetime.time(11, 0),
                    status='SCHEDULED',
                    mode='IN_PERSON'
                )
                counts['appointments'] += 1

            # Neha: Pending Triage
            if not Consultation.objects.filter(patient=patient_neha, status='PENDING_TRIAGE').exists():
                Consultation.objects.create(
                    patient=patient_neha,
                    facility=facility_a,
                    chief_complaint='Severe headache and dizzy spells',
                    status='PENDING_TRIAGE',
                    priority='URGENT'
                )
                counts['consultations'] += 1

            # 5. INVENTORY
            inventory_data = [
                # Facility A
                {'name': 'Paracetamol 500mg', 'item_type': 'MEDICINE', 'quantity': 500, 'availability_status': 'AVAILABLE', 'unit': 'Tablets', 'facility': facility_a},
                {'name': 'ORS Sachets', 'item_type': 'MEDICINE', 'quantity': 50, 'availability_status': 'LOW_STOCK', 'unit': 'Sachets', 'facility': facility_a},
                {'name': 'Digital Thermometer', 'item_type': 'EQUIPMENT', 'quantity': 10, 'availability_status': 'AVAILABLE_EQUIPMENT', 'unit': 'Pieces', 'facility': facility_a},
                {'name': 'Blood Pressure Monitor', 'item_type': 'EQUIPMENT', 'quantity': 0, 'availability_status': 'UNAVAILABLE_EQUIPMENT', 'unit': 'Pieces', 'facility': facility_a},
                {'name': 'Azithromycin 500mg', 'item_type': 'MEDICINE', 'quantity': 200, 'availability_status': 'AVAILABLE', 'unit': 'Tablets', 'facility': facility_a},
                # Facility B
                {'name': 'Amoxicillin 500mg', 'item_type': 'MEDICINE', 'quantity': 0, 'availability_status': 'OUT_OF_STOCK', 'unit': 'Capsules', 'facility': facility_b},
                {'name': 'Cetirizine 10mg', 'item_type': 'MEDICINE', 'quantity': 300, 'availability_status': 'AVAILABLE', 'unit': 'Tablets', 'facility': facility_b},
                {'name': 'Pulse Oximeter', 'item_type': 'EQUIPMENT', 'quantity': 5, 'availability_status': 'AVAILABLE_EQUIPMENT', 'unit': 'Pieces', 'facility': facility_b},
                {'name': 'Glucometer', 'item_type': 'EQUIPMENT', 'quantity': 2, 'availability_status': 'AVAILABLE_EQUIPMENT', 'unit': 'Pieces', 'facility': facility_b},
                {'name': 'Nebulizer', 'item_type': 'EQUIPMENT', 'quantity': 1, 'availability_status': 'UNAVAILABLE_EQUIPMENT', 'unit': 'Pieces', 'facility': facility_b},
            ]

            for item_data in inventory_data:
                _, created = InventoryItem.objects.get_or_create(
                    name=item_data['name'],
                    facility=item_data['facility'],
                    defaults=item_data
                )
                if created: counts['inventory_items'] += 1

        self.stdout.write(self.style.SUCCESS('\nDemo Data Seeding Complete!'))
        self.stdout.write('Created:')
        for key, count in counts.items():
            self.stdout.write(f'  - {count} {key}')
        self.stdout.write('\nNote: Existing records were safely preserved. You can run this command again safely.')
