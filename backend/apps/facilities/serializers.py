from rest_framework import serializers
from .models import Facility

class BasicFacilitySerializer(serializers.ModelSerializer):
    """Used for nested serialization to avoid exposing too much data"""
    class Meta:
        model = Facility
        fields = ('id', 'name', 'type')
        read_only_fields = ('id',)

class FacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Facility
        fields = (
            'id', 'name', 'type', 'address', 'phone',
            'latitude', 'longitude', 'is_active', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_latitude(self, value):
        if value is not None:
            if value < -90 or value > 90:
                raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value):
        if value is not None:
            if value < -180 or value > 180:
                raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value
