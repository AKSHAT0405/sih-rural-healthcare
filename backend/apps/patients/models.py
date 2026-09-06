import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class Patient(models.Model):
    GENDER_CHOICES = (
        ('MALE', 'Male'),
        ('FEMALE', 'Female'),
        ('OTHER', 'Other'),
        ('PREFER_NOT_TO_SAY', 'Prefer Not to Say'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    preferred_language = models.CharField(max_length=50, blank=True)
    emergency_contact_name = models.CharField(max_length=255, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    
    facility = models.ForeignKey('facilities.Facility', on_delete=models.PROTECT, null=True, blank=False, related_name='patients')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='registered_patients')
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='patient_profile')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.full_name

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['full_name']),
            models.Index(fields=['phone']),
        ]
