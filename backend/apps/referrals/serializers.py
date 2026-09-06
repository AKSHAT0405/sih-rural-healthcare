from rest_framework import serializers
from django.utils import timezone
from .models import Referral
from django.contrib.auth import get_user_model

User = get_user_model()

class ReferralSerializer(serializers.ModelSerializer):
    class Meta:
        model = Referral
        fields = [
            'id', 'patient', 'consultation', 'from_facility', 'to_facility', 
            'to_doctor', 'referred_by', 'reason', 'priority', 'status', 'referral_notes', 
            'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'completed_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        
        # Determine read-only fields dynamically
        if request:
            user = request.user
            is_create = self.instance is None
            
            if is_create:
                if user.role == 'DOCTOR':
                    self.fields['referred_by'].read_only = True
                    self.fields['from_facility'].read_only = True
            else:
                # On update, core fields cannot be changed
                for field in ['patient', 'consultation', 'from_facility', 'referred_by', 'to_facility', 'reason', 'priority']:
                    self.fields[field].read_only = True
                
                # If they are only a destination doctor (and didn't create it), they can only update status and notes
                # But we handled read_only for everything except status and notes above anyway.
                # Wait, priority is read_only now. Can source doctor change priority? Let's say no, it's safer.
                # Actually, the spec said "destination doctor cannot modify: patient, consultation, from_facility, referred_by, reason".
                # It didn't explicitly forbid priority for destination doctor, but let's lock it for destination.
                # For source doctor, maybe they can change priority? The spec says:
                # "can update appropriate clinical/referral information and status according to the rules."
                # So we can un-read-only 'reason', 'priority' for the source doctor and admin.
                if user.role == 'ADMIN' or getattr(self.instance, 'referred_by', None) == user:
                    self.fields['reason'].read_only = False
                    self.fields['priority'].read_only = False

    def validate(self, data):
        request = self.context.get('request')
        user = request.user if request else None
        is_create = self.instance is None
        initial_data = getattr(self, 'initial_data', {})

        if is_create:
            # DOCTOR validation
            if user and user.role == 'DOCTOR':
                data['referred_by'] = user
                
                if not user.facility:
                    raise serializers.ValidationError({"from_facility": "Doctor must be assigned to a facility."})
                data['from_facility'] = user.facility

            # ADMIN validation
            if user and user.role == 'ADMIN':
                if 'referred_by' not in data:
                    raise serializers.ValidationError({"referred_by": "Admin must specify referred_by."})
                if data['referred_by'].role not in ['DOCTOR', 'ADMIN']:
                    raise serializers.ValidationError({"referred_by": "referred_by must be DOCTOR or ADMIN."})
                if 'from_facility' not in data:
                    raise serializers.ValidationError({"from_facility": "Admin must specify from_facility."})
                    
            # Common Creation Rules
            if 'from_facility' in data and 'to_facility' in data:
                if data['from_facility'] == data['to_facility']:
                    raise serializers.ValidationError({"to_facility": "from_facility and to_facility must be different."})
                if not data['from_facility'].is_active:
                    raise serializers.ValidationError({"from_facility": "from_facility must be active."})
                if not data['to_facility'].is_active:
                    raise serializers.ValidationError({"to_facility": "to_facility must be active."})
                    
            if 'consultation' in data and 'patient' in data and 'from_facility' in data:
                if data['consultation'].patient != data['patient']:
                    raise serializers.ValidationError({"consultation": "Consultation patient must match referral patient."})
                if data['consultation'].facility != data['from_facility']:
                    raise serializers.ValidationError({"consultation": "Consultation facility must match from_facility."})
                    
                # Audit #3 Fix: Prevent doctor from referring from another doctor's consultation
                if user and user.role == 'DOCTOR' and getattr(data['consultation'], 'doctor', None) != user:
                    raise serializers.ValidationError({"consultation": "Doctor can only create referrals for their own consultations."})
                    
            if 'to_doctor' in data and data['to_doctor'] is not None:
                if 'to_facility' in data and data['to_doctor'].facility != data['to_facility']:
                    raise serializers.ValidationError({"to_doctor": "Destination doctor must belong to the destination facility."})
                if data['to_doctor'].role != 'DOCTOR':
                    raise serializers.ValidationError({"to_doctor": "Destination must be a doctor."})

            if 'status' in data and data['status'] != 'PENDING':
                raise serializers.ValidationError({"status": "Referral must be created with PENDING status."})
            data['status'] = 'PENDING'
            data['completed_at'] = None

        else:
            # Update Validation
            for field in ['patient', 'consultation', 'from_facility', 'referred_by']:
                if field in initial_data:
                    raise serializers.ValidationError({field: f"Cannot modify {field}."})
                    
            if 'to_facility' in initial_data:
                raise serializers.ValidationError({"to_facility": "Cannot arbitrarily change destination facility after creation."})
                
            # If destination doctor, prevent reason and priority
            if user and user.role == 'DOCTOR' and getattr(self.instance, 'referred_by', None) != user:
                for field in ['reason', 'priority']:
                    if field in initial_data:
                        raise serializers.ValidationError({field: f"Destination doctor cannot modify {field}."})

            # Check status transitions
            if 'status' in data:
                old_status = self.instance.status
                new_status = data['status']
                
                if old_status in ['COMPLETED', 'CANCELLED'] and new_status not in ['COMPLETED', 'CANCELLED']:
                    raise serializers.ValidationError({"status": f"Cannot change status from {old_status} back to {new_status}."})
                    
                if new_status == 'COMPLETED' and old_status != 'COMPLETED':
                    data['completed_at'] = timezone.now()
                elif old_status == 'COMPLETED' and new_status == 'COMPLETED':
                    pass # Just saving other fields while status remains COMPLETED
                else:
                    data['completed_at'] = None

        return data
