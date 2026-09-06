import uuid
from django.db import models
from django.core.exceptions import ValidationError

class InventoryItem(models.Model):
    ITEM_TYPE_CHOICES = (
        ('MEDICINE', 'Medicine'),
        ('EQUIPMENT', 'Equipment'),
    )

    STATUS_CHOICES = (
        ('AVAILABLE', 'Available'),
        ('LOW_STOCK', 'Low Stock'),
        ('OUT_OF_STOCK', 'Out of Stock'),
        ('AVAILABLE_EQUIPMENT', 'Available Equipment'),
        ('UNAVAILABLE_EQUIPMENT', 'Unavailable Equipment'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    facility = models.ForeignKey('facilities.Facility', on_delete=models.CASCADE, related_name='inventory')
    name = models.CharField(max_length=255)
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES)
    quantity = models.IntegerField(null=True, blank=True)
    availability_status = models.CharField(max_length=30, choices=STATUS_CHOICES)
    unit = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    def clean(self):
        super().clean()
        if self.quantity is not None and self.quantity < 0:
            raise ValidationError({'quantity': 'Quantity cannot be negative.'})

    def __str__(self):
        return f"{self.name} - {self.facility.name}"
