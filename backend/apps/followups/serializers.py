from rest_framework import serializers
from django.utils import timezone
from .models import FollowUp

class FollowUpSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowUp
        fields = [
            'id', 'patient', 'consultation', 'referral', 'scheduled_date', 
            'status', 'reason', 'notes', 'created_by', 'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'completed_at']

    def validate(self, data):
        request = self.context.get('request')
        user = request.user if request else None
        is_create = self.instance is None
        initial_data = getattr(self, 'initial_data', {})

        if is_create:
            # Check created_by assignment
            if user:
                data['created_by'] = user

            # Validation Rules
            if 'patient' not in data or 'consultation' not in data:
                pass # Handled by standard validation

            if 'consultation' in data and user and user.role == 'DOCTOR':
                if data['consultation'].doctor != user:
                    raise serializers.ValidationError({"consultation": "Doctor can only create follow-ups for their own consultations."})

            # Ensure patient matches consultation.patient
            if 'patient' in data and 'consultation' in data:
                if data['consultation'].patient != data['patient']:
                    raise serializers.ValidationError({"consultation": "Consultation patient must match FollowUp patient."})

            # Ensure referral patient matches
            if data.get('referral'):
                if data['referral'].patient != data['patient']:
                    raise serializers.ValidationError({"referral": "Referral patient must match FollowUp patient."})

            # Ensure new followups start as SCHEDULED
            if 'status' in data and data['status'] != 'SCHEDULED':
                raise serializers.ValidationError({"status": "New follow-up must be created with SCHEDULED status."})
            data['status'] = 'SCHEDULED'
            data['completed_at'] = None
        else:
            # Update validation
            # Core relationships cannot be changed
            for field in ['patient', 'consultation', 'referral']:
                if field in initial_data:
                    raise serializers.ValidationError({field: f"Cannot modify {field} after creation."})

            if 'status' in data:
                old_status = self.instance.status
                new_status = data['status']
                
                terminal_states = ['COMPLETED', 'MISSED', 'CANCELLED']
                if old_status in terminal_states and new_status != old_status:
                    raise serializers.ValidationError({"status": f"Cannot change status from {old_status} to {new_status} as it is a terminal state."})
                
                if new_status == 'COMPLETED' and old_status != 'COMPLETED':
                    data['completed_at'] = timezone.now()
                elif old_status == 'COMPLETED' and new_status == 'COMPLETED':
                    pass
                else:
                    data['completed_at'] = None

        return data
