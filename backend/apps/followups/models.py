from django.db import models
from django.conf import settings
import uuid

class FollowUp(models.Model):
    STATUS_CHOICES = (
        ('SCHEDULED', 'Scheduled'),
        ('COMPLETED', 'Completed'),
        ('MISSED', 'Missed'),
        ('CANCELLED', 'Cancelled'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey('patients.Patient', on_delete=models.CASCADE, related_name='followups')
    consultation = models.ForeignKey('consultations.Consultation', on_delete=models.CASCADE, related_name='followups')
    referral = models.ForeignKey('referrals.Referral', on_delete=models.SET_NULL, null=True, blank=True, related_name='followups')
    
    scheduled_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    reason = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_followups')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"FollowUp {self.id} for {self.patient}"

    class Meta:
        ordering = ['-scheduled_date', '-created_at']
