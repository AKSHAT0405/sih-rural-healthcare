from rest_framework import serializers
from .models import InventoryItem
from apps.facilities.models import Facility

class InventoryItemSerializer(serializers.ModelSerializer):
    facility = serializers.PrimaryKeyRelatedField(
        queryset=Facility.objects.all(),
        required=False
    )
    
    class Meta:
        model = InventoryItem
        fields = [
            'id', 'facility', 'name', 'item_type', 'quantity', 
            'availability_status', 'unit', 'notes', 'created_at', 'last_updated'
        ]
        read_only_fields = ['id', 'created_at', 'last_updated']

    def validate_quantity(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Quantity cannot be negative.")
        return value
