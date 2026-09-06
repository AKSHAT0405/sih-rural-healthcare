from rest_framework import serializers
from .models import Patient
from django.utils import timezone

class PatientSerializer(serializers.ModelSerializer):
    has_account = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = (
            'id', 'full_name', 'date_of_birth', 'gender', 'phone', 
            'address', 'preferred_language', 'emergency_contact_name', 
            'emergency_contact_phone', 'facility', 'created_by', 'created_at', 'updated_at',
            'has_account'
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at', 'has_account')

    def get_has_account(self, obj):
        return obj.user_id is not None

    def validate_date_of_birth(self, value):
        if value and value > timezone.now().date():
            raise serializers.ValidationError("Date of birth cannot be in the future.")
        return value

    def validate_facility(self, value):
        if self.instance is None and value and not value.is_active:
            raise serializers.ValidationError("Cannot register a new patient to an inactive facility.")
        return value

from django.contrib.auth import get_user_model
User = get_user_model()

class PatientAccountCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
