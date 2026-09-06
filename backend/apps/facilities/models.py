import uuid
from django.db import models
from django.utils import timezone

class Facility(models.Model):
    TYPE_CHOICES = (
        ('SUB_CENTER', 'Sub Center'),
        ('PHC', 'Primary Health Center'),
        ('RURAL_HOSPITAL', 'Rural Hospital'),
        ('DISTRICT_HOSPITAL', 'District Hospital'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Facilities'
