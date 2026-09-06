from rest_framework import serializers
from .models import Consultation, Appointment, MedicalRecord
from apps.accounts.models import DoctorAvailability

class ConsultationSerializer(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            if request.user.role == 'PATIENT':
                self.fields['patient'].read_only = True
                self.fields['facility'].read_only = True
                self.fields['doctor'].read_only = True
                self.fields['status'].read_only = True
                self.fields['triage_category'].read_only = True
                self.fields['triage_bypass_queue'].read_only = True
                self.fields['triage_notes'].read_only = True

    class Meta:
        model = Consultation
        fields = (
            'id', 'patient', 'doctor', 'facility', 
            'chief_complaint', 'clinical_notes', 'status', 'priority',
            'triage_category', 'triage_bypass_queue', 'triage_notes',
            'consulted_at', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
        extra_kwargs = {
            'doctor': {'required': False} # DOCTOR role won't provide this, ADMIN will
        }

    def validate(self, data):
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            return data

        user = request.user
        
        # We only do these complex cross-field validations on creation,
        # or we do them carefully on update.
        is_create = self.instance is None

        # Fetch the facility and patient (they might be in data for create, or on instance for update)
        facility = data.get('facility', self.instance.facility if self.instance else None)
        patient = data.get('patient', self.instance.patient if self.instance else None)
        
        # DOCTOR rules
        if user.role == 'DOCTOR':
            if 'doctor' in data and data['doctor'] and data['doctor'] != user:
                raise serializers.ValidationError({"doctor": "You cannot specify a different doctor."})
            
            if is_create:
                if not user.facility:
                    raise serializers.ValidationError("You must be assigned to a facility to create a consultation.")
                if facility != user.facility:
                    raise serializers.ValidationError({"facility": "You can only create consultations for your assigned facility."})
            
        # ADMIN rules
        elif user.role == 'ADMIN':
            if is_create:
                doctor = data.get('doctor')
                if not doctor:
                    raise serializers.ValidationError({"doctor": "Admin must explicitly select a doctor."})
                if doctor.role != 'DOCTOR':
                    raise serializers.ValidationError({"doctor": "The selected user must have the DOCTOR role."})
                if doctor.facility != facility:
                    raise serializers.ValidationError({"doctor": "The selected doctor must belong to the selected facility."})
                if facility and not facility.is_active:
                    raise serializers.ValidationError({"facility": "Cannot create consultation for an inactive facility."})
        # Invariant: A consultation must have a doctor if it is past PENDING_TRIAGE
        status_val = data.get('status', self.instance.status if self.instance else 'SCHEDULED')
        doc_val = data.get('doctor', self.instance.doctor if self.instance else None)
        
        if is_create and user.role == 'PATIENT':
            status_val = 'PENDING_TRIAGE'

        if is_create and user.role == 'DOCTOR':
            doc_val = user

        if status_val in ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] and not doc_val:
            raise serializers.ValidationError({"doctor": f"A doctor must be assigned when status is {status_val}."})

        return data

class AppointmentSerializer(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            if request.user.role == 'PATIENT':
                self.fields['patient'].read_only = True
                self.fields['facility'].read_only = True

    class Meta:
        model = Appointment
        fields = (
            'id', 'patient', 'doctor', 'facility', 'consultation',
            'scheduled_date', 'start_time', 'end_time',
            'status', 'mode', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate(self, data):
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            return data

        user = request.user
        is_create = self.instance is None

        scheduled_date = data.get('scheduled_date', self.instance.scheduled_date if self.instance else None)
        start_time = data.get('start_time', self.instance.start_time if self.instance else None)
        end_time = data.get('end_time', self.instance.end_time if self.instance else None)
        doctor = data.get('doctor', self.instance.doctor if self.instance else None)
        mode = data.get('mode', self.instance.mode if self.instance else 'IN_PERSON')
        status = data.get('status', self.instance.status if self.instance else 'SCHEDULED')

        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})

        if is_create or 'start_time' in data or 'end_time' in data or 'scheduled_date' in data or 'doctor' in data:
            if doctor and scheduled_date and start_time and end_time:
                day_of_week = scheduled_date.weekday()
                availability = DoctorAvailability.objects.filter(
                    doctor=doctor,
                    day_of_week=day_of_week,
                    start_time__lte=start_time,
                    end_time__gte=end_time,
                    is_active=True
                ).first()

                if not availability:
                    raise serializers.ValidationError({"non_field_errors": "The doctor is not available at this time."})
                
                if mode == 'TELEMEDICINE' and not availability.is_online:
                    raise serializers.ValidationError({"mode": "This time slot does not support telemedicine."})

        # Add Patient IDOR and Emergency validation
        if 'consultation' in data:
            consultation = data['consultation']
            if user.role == 'PATIENT':
                if not hasattr(user, 'patient_profile'):
                    raise serializers.ValidationError({"non_field_errors": "You do not have a patient profile."})
                if consultation.patient != user.patient_profile:
                    raise serializers.ValidationError({"consultation": "You cannot book an appointment for another patient's consultation."})
            
            # Emergency Block
            if is_create and consultation.priority == 'EMERGENCY':
                raise serializers.ValidationError({"non_field_errors": "Emergency consultations cannot be booked via standard appointments."})

            # Check if doctor is already assigned and changing
            if 'doctor' in data and consultation.doctor:
                if consultation.doctor != data['doctor']:
                    raise serializers.ValidationError({"doctor": "This consultation is already assigned to another doctor."})

        if user.role == 'PATIENT':
            if not is_create and ('doctor' in data or 'scheduled_date' in data or 'start_time' in data or 'facility' in data):
                raise serializers.ValidationError({"non_field_errors": "You cannot modify appointment details. Cancel and rebook."})

        return data

class MedicalRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalRecord
        fields = (
            'id', 'consultation', 'chief_complaint', 'examination_notes', 
            'diagnosis', 'treatment_plan', 'medications', 'doctor_notes',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate(self, data):
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            return data
            
        user = request.user
        is_create = self.instance is None
        consultation = data.get('consultation', self.instance.consultation if self.instance else None)

        if user.role != 'DOCTOR':
            raise serializers.ValidationError({"non_field_errors": "Only doctors can modify medical records."})
            
        if consultation:
            if consultation.doctor != user:
                raise serializers.ValidationError({"consultation": "You can only create/edit records for your own consultations."})
            
            if is_create:
                if consultation.status != 'IN_PROGRESS':
                    raise serializers.ValidationError({"consultation": "Consultation must be IN_PROGRESS to create a record."})
            else:
                if consultation.status == 'COMPLETED':
                    raise serializers.ValidationError({"non_field_errors": "Cannot modify a completed medical record."})
                    
        if not is_create and 'consultation' in data and data['consultation'] != self.instance.consultation:
            raise serializers.ValidationError({"consultation": "Cannot change the consultation of an existing medical record."})

        return data
