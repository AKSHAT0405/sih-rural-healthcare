import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class Consultation(models.Model):
    STATUS_CHOICES = (
        ('PENDING_TRIAGE', 'Pending Triage'),
        ('SCHEDULED', 'Scheduled'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    PRIORITY_CHOICES = (
        ('NORMAL', 'Normal'),
        ('URGENT', 'Urgent'),
        ('EMERGENCY', 'Emergency'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey('patients.Patient', on_delete=models.PROTECT, related_name='consultations')
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='doctor_consultations', null=True, blank=True)
    facility = models.ForeignKey('facilities.Facility', on_delete=models.PROTECT, related_name='consultations')
    
    chief_complaint = models.TextField(blank=True)
    clinical_notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='NORMAL')
    
    # Triage Rule Engine Fields
    triage_category = models.CharField(max_length=50, blank=True, null=True)
    triage_bypass_queue = models.BooleanField(default=False)
    triage_notes = models.TextField(blank=True, null=True)
    
    consulted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        doctor_name = self.doctor.email if self.doctor else "Unassigned Doctor"
        return f"Consultation: {self.patient.full_name} with {doctor_name}"

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['patient']),
            models.Index(fields=['doctor']),
            models.Index(fields=['facility']),
            models.Index(fields=['status']),
        ]


class Appointment(models.Model):
    STATUS_CHOICES = (
        ('SCHEDULED', 'Scheduled'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
        ('NO_SHOW', 'No Show'),
    )

    MODE_CHOICES = (
        ('IN_PERSON', 'In Person'),
        ('TELEMEDICINE', 'Telemedicine'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey('patients.Patient', on_delete=models.PROTECT, related_name='appointments')
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='doctor_appointments')
    facility = models.ForeignKey('facilities.Facility', on_delete=models.PROTECT, related_name='appointments')
    consultation = models.OneToOneField(Consultation, on_delete=models.CASCADE, related_name='appointment')
    
    scheduled_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='IN_PERSON')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Appointment for {self.patient.full_name} on {self.scheduled_date} at {self.start_time}"

    class Meta:
        ordering = ['scheduled_date', 'start_time']
        constraints = [
            models.UniqueConstraint(
                fields=['doctor', 'scheduled_date', 'start_time'],
                condition=models.Q(status='SCHEDULED'),
                name='unique_doctor_active_appointment_slot'
            )
        ]

class MedicalRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.OneToOneField(Consultation, on_delete=models.CASCADE, related_name='medical_record')
    
    chief_complaint = models.TextField(blank=True)
    examination_notes = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)
    treatment_plan = models.TextField(blank=True)
    medications = models.TextField(blank=True)
    doctor_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Medical Record for Consultation {self.consultation_id}"

