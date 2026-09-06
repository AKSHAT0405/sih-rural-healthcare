import uuid
from django.db import models
from django.conf import settings
from apps.patients.models import Patient
from apps.consultations.models import Consultation
from apps.facilities.models import Facility

class Referral(models.Model):
    PRIORITY_CHOICES = [
        ('NORMAL', 'Normal'),
        ('URGENT', 'Urgent'),
        ('EMERGENCY', 'Emergency'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='referrals')
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='referrals')
    from_facility = models.ForeignKey(Facility, on_delete=models.PROTECT, related_name='outgoing_referrals')
    to_facility = models.ForeignKey(Facility, on_delete=models.PROTECT, related_name='incoming_referrals')
    to_doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='incoming_doctor_referrals', null=True, blank=True)
    referred_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='referrals_created')
    
    reason = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    referral_notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Referral {self.id} for {self.patient.full_name} ({self.status})"
