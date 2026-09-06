from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import DoctorProfile, DoctorAvailability
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from apps.facilities.serializers import BasicFacilitySerializer

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    facility = BasicFacilitySerializer(read_only=True)
    patient_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'role', 'facility', 'patient_id')

    def get_patient_id(self, obj):
        if hasattr(obj, 'patient_profile'):
            return str(obj.patient_profile.id)
        return None

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Add basic user information to the response
        user_data = UserSerializer(self.user).data
        data.update(user_data)
        return data


class DoctorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorProfile
        fields = ('id', 'user', 'specialization', 'qualifications', 'experience_years', 'bio', 'is_telemedicine_enabled')
        read_only_fields = ('user',)


class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorAvailability
        fields = ('id', 'doctor', 'day_of_week', 'start_time', 'end_time', 'is_online', 'is_active')
        read_only_fields = ('doctor',)

    def validate(self, data):
        if data.get('start_time') and data.get('end_time'):
            if data['start_time'] >= data['end_time']:
                raise serializers.ValidationError({"end_time": "End time must be after start time."})
            
            # Check for overlapping availability
            doctor = self.instance.doctor if self.instance else self.context['request'].user
            day = data.get('day_of_week', self.instance.day_of_week if self.instance else None)
            
            if doctor and day is not None:
                overlaps = DoctorAvailability.objects.filter(
                    doctor=doctor,
                    day_of_week=day,
                    start_time__lt=data['end_time'],
                    end_time__gt=data['start_time']
                )
                if self.instance:
                    overlaps = overlaps.exclude(pk=self.instance.pk)
                
                if overlaps.exists():
                    raise serializers.ValidationError({"non_field_errors": "This availability overlaps with an existing schedule for this day."})
        return data
