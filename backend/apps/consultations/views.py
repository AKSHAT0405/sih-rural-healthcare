from rest_framework import viewsets, mixins, serializers
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
import datetime
from .models import Consultation, Appointment, MedicalRecord
from .serializers import ConsultationSerializer, AppointmentSerializer, MedicalRecordSerializer
from apps.accounts.models import DoctorAvailability
from .triage_engine import evaluate_triage
from .permissions import CustomConsultationPermissions, CustomMedicalRecordPermissions
from rest_framework.exceptions import PermissionDenied

class ConsultationViewSet(mixins.CreateModelMixin,
                          mixins.RetrieveModelMixin,
                          mixins.UpdateModelMixin,
                          mixins.ListModelMixin,
                          viewsets.GenericViewSet):
    """
    API endpoint that allows consultations to be viewed or edited.
    """
    serializer_class = ConsultationSerializer
    permission_classes = [IsAuthenticated, CustomConsultationPermissions]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    
    def get_queryset(self):
        user = self.request.user
        queryset = Consultation.objects.select_related('patient', 'doctor', 'facility').all()
        
        # Enforce Role-based Security
        if user.role == 'DOCTOR':
            # Doctor can only see their own consultations OR consultations at their facility
            from django.db.models import Q
            queryset = queryset.filter(Q(doctor=user) | Q(facility=user.facility))
        elif user.role == 'HEALTH_WORKER':
            # Health Worker can only see consultations at their facility
            queryset = queryset.filter(facility=user.facility)
        elif user.role == 'PATIENT':
            queryset = queryset.filter(patient__user=user)
        
        # API Filters
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
            
        status_val = self.request.query_params.get('status')
        if status_val:
            queryset = queryset.filter(status=status_val)

        priority_val = self.request.query_params.get('priority')
        if priority_val:
            queryset = queryset.filter(priority=priority_val)

        doctor_id = self.request.query_params.get('doctor')
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)

        return queryset

    def perform_create(self, serializer):
        if self.request.user.role == 'PATIENT':
            if hasattr(self.request.user, 'patient_profile'):
                # 1. Save initially
                instance = serializer.save(
                    patient=self.request.user.patient_profile, 
                    facility=self.request.user.patient_profile.facility,
                    status='PENDING_TRIAGE', 
                    doctor=None
                )
                # 2. Synchronous Triage Engine Evaluation
                triage_results = evaluate_triage(instance.chief_complaint)
                instance.priority = triage_results['priority']
                instance.triage_category = triage_results['category']
                instance.triage_bypass_queue = triage_results['bypass_queue']
                instance.triage_notes = triage_results['notes']
                instance.save(update_fields=['priority', 'triage_category', 'triage_bypass_queue', 'triage_notes', 'updated_at'])
            else:
                raise PermissionDenied("User does not have an associated patient profile.")
        elif self.request.user.role == 'DOCTOR':
            serializer.save(doctor=self.request.user)
        else:
            serializer.save()

    def perform_update(self, serializer):
        if self.request.user.role == 'DOCTOR':
            # DOCTOR cannot change patient or facility
            instance = serializer.instance
            validated_data = serializer.validated_data
            
            if 'doctor' in validated_data:
                # If picking up an unassigned triage request, it's allowed.
                # Otherwise, they cannot change it to someone else or reassign it from someone else.
                if instance.doctor is None and validated_data['doctor'] == self.request.user:
                    pass
                elif validated_data['doctor'] != instance.doctor:
                    raise PermissionDenied("You cannot change the doctor.")
            
            if 'patient' in validated_data and validated_data['patient'] != instance.patient:
                raise PermissionDenied("You cannot change the patient.")
            if 'facility' in validated_data and validated_data['facility'] != instance.facility:
                raise PermissionDenied("You cannot change the facility.")
                
        # Protect clinical notes
        if 'clinical_notes' in serializer.validated_data:
            instance = serializer.instance
            if self.request.user.role != 'DOCTOR' or instance.doctor != self.request.user:
                raise PermissionDenied("Only the assigned doctor can edit clinical notes.")
            if instance.status != 'IN_PROGRESS':
                raise PermissionDenied("Clinical notes can only be edited while the consultation is IN_PROGRESS.")
                
        serializer.save()

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        from django.db import transaction
        consultation = self.get_object()
        
        if request.user.role != 'DOCTOR' or consultation.doctor != request.user:
            raise PermissionDenied("Only the assigned doctor can start the consultation.")
            
        if consultation.status != 'SCHEDULED':
            raise serializers.ValidationError({"status": "Only SCHEDULED consultations can be started."})
            
        if not hasattr(consultation, 'appointment') or consultation.appointment.status != 'SCHEDULED':
            raise serializers.ValidationError({"appointment": "The related appointment is not SCHEDULED."})
            
        with transaction.atomic():
            consultation.status = 'IN_PROGRESS'
            consultation.save(update_fields=['status', 'updated_at'])
            
            # Audit #1 Fix: Create MedicalRecord atomically
            MedicalRecord.objects.get_or_create(
                consultation=consultation,
                defaults={'chief_complaint': consultation.chief_complaint or ''}
            )
            
        return Response({'status': 'Consultation started', 'consultation_status': consultation.status})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        from django.db import transaction
        consultation = self.get_object()
        
        if request.user.role != 'DOCTOR' or consultation.doctor != request.user:
            raise PermissionDenied("Only the assigned doctor can complete the consultation.")
            
        if consultation.status != 'IN_PROGRESS':
            raise serializers.ValidationError({"status": "Only IN_PROGRESS consultations can be completed."})
            
        if not hasattr(consultation, 'appointment') or consultation.appointment.status != 'SCHEDULED':
            raise serializers.ValidationError({"appointment": "The related appointment is not SCHEDULED."})

        if not hasattr(consultation, 'medical_record'):
            raise serializers.ValidationError({"medical_record": "A Medical Record must be created before completing the consultation."})
            
        with transaction.atomic():
            consultation.status = 'COMPLETED'
            consultation.save(update_fields=['status', 'updated_at'])
            
            appointment = consultation.appointment
            appointment.status = 'COMPLETED'
            appointment.save(update_fields=['status', 'updated_at'])
            
        return Response({'status': 'Consultation completed', 'consultation_status': consultation.status})

User = get_user_model()

class DoctorSlotView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, doctor_id):
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({"error": "date parameter is required"}, status=400)
        
        try:
            target_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "invalid date format, expected YYYY-MM-DD"}, status=400)

        doctor = get_object_or_404(User, id=doctor_id, role='DOCTOR')
        day_of_week = target_date.weekday()

        availability = DoctorAvailability.objects.filter(
            doctor=doctor, 
            day_of_week=day_of_week, 
            is_active=True
        ).first()

        if not availability:
            return Response({"slots": []})

        slots = []
        current_dt = datetime.datetime.combine(target_date, availability.start_time)
        end_dt = datetime.datetime.combine(target_date, availability.end_time)
        delta = datetime.timedelta(minutes=30)

        while current_dt + delta <= end_dt:
            slots.append({
                "start": current_dt.time(),
                "end": (current_dt + delta).time()
            })
            current_dt += delta

        appointments = Appointment.objects.filter(
            doctor=doctor,
            scheduled_date=target_date,
            status='SCHEDULED'
        )

        available_slots = []
        for slot in slots:
            slot_start = slot['start']
            slot_end = slot['end']
            
            overlap = False
            for appt in appointments:
                if appt.start_time < slot_end and appt.end_time > slot_start:
                    overlap = True
                    break
            
            if not overlap:
                available_slots.append({
                    "start_time": slot_start.strftime("%H:%M:%S"),
                    "end_time": slot_end.strftime("%H:%M:%S"),
                    "mode_supported": "TELEMEDICINE" if availability.is_online else "IN_PERSON"
                })

        return Response({"date": date_str, "slots": available_slots})


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        queryset = Appointment.objects.select_related('patient', 'doctor', 'facility', 'consultation').all()
        
        if user.role == 'PATIENT':
            queryset = queryset.filter(patient__user=user)
        elif user.role == 'DOCTOR':
            queryset = queryset.filter(doctor=user)
        elif user.role == 'HEALTH_WORKER':
            queryset = queryset.filter(facility=user.facility)
            
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
            
        doctor_id = self.request.query_params.get('doctor')
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
            
        status_val = self.request.query_params.get('status')
        if status_val:
            queryset = queryset.filter(status=status_val)

        return queryset

    def perform_create(self, serializer):
        from django.db import transaction
        from rest_framework.exceptions import ValidationError
        
        user = self.request.user
        
        with transaction.atomic():
            doctor = serializer.validated_data.get('doctor')
            scheduled_date = serializer.validated_data.get('scheduled_date')
            start_time = serializer.validated_data.get('start_time')
            end_time = serializer.validated_data.get('end_time')
            
            # Fetch and lock DoctorAvailability for this day
            if doctor and scheduled_date:
                day_of_week = scheduled_date.weekday()
                # Use select_for_update() to force serialized processing of overlapping booking requests
                # for this doctor on this day.
                availability = DoctorAvailability.objects.select_for_update().filter(
                    doctor=doctor,
                    day_of_week=day_of_week,
                    start_time__lte=start_time,
                    end_time__gte=end_time,
                    is_active=True
                ).first()
                
                if not availability:
                    raise ValidationError({"non_field_errors": "The doctor is not available at this time."})
            
            # Concurrency/Overlap Check inside the lock
            if doctor and scheduled_date and start_time and end_time:
                overlaps = Appointment.objects.filter(
                    doctor=doctor,
                    scheduled_date=scheduled_date,
                    start_time__lt=end_time,
                    end_time__gt=start_time,
                    status='SCHEDULED'
                )
                if overlaps.exists():
                    raise ValidationError({"non_field_errors": "This slot is already booked."})

            if user.role == 'PATIENT':
                if not hasattr(user, 'patient_profile'):
                    raise PermissionDenied("User does not have an associated patient profile.")
                
                if not doctor:
                    raise ValidationError({"doctor": "You must select a doctor."})
                    
                appointment = serializer.save(
                    patient=user.patient_profile,
                    facility=doctor.facility
                )
            else:
                facility = doctor.facility if doctor else None
                if facility:
                    appointment = serializer.save(facility=facility)
                else:
                    appointment = serializer.save()
            
            # Synchronize Consultation State
            consultation = appointment.consultation
            consultation.status = 'SCHEDULED'
            consultation.doctor = appointment.doctor
            consultation.save(update_fields=['status', 'doctor', 'updated_at'])

    def perform_update(self, serializer):
        user = self.request.user
        instance = serializer.instance
        if user.role == 'PATIENT':
            if 'status' in serializer.validated_data and serializer.validated_data['status'] == 'CANCELLED':
                pass
            else:
                for field in serializer.validated_data:
                    if field != 'status':
                        raise PermissionDenied(f"You cannot modify {field}. Cancel and rebook.")
        elif user.role == 'DOCTOR':
            allowed_statuses = ['COMPLETED', 'NO_SHOW', 'CANCELLED']
            if 'status' in serializer.validated_data and serializer.validated_data['status'] not in allowed_statuses:
                if serializer.validated_data['status'] != instance.status:
                     raise PermissionDenied("You can only change status to COMPLETED, NO_SHOW, or CANCELLED.")
        serializer.save()

class MedicalRecordViewSet(viewsets.ModelViewSet):
    serializer_class = MedicalRecordSerializer
    permission_classes = [IsAuthenticated, CustomMedicalRecordPermissions]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        queryset = MedicalRecord.objects.select_related('consultation__patient', 'consultation__doctor', 'consultation__facility').all()
        
        if user.role == 'PATIENT':
            queryset = queryset.filter(consultation__patient__user=user)
        elif user.role == 'DOCTOR':
            # Doctor can see records for their own consultations
            queryset = queryset.filter(consultation__doctor=user)
        elif user.role == 'HEALTH_WORKER':
            # Prototype constraints: HW read access if needed
            queryset = queryset.filter(consultation__facility=user.facility)
            
        consultation_id = self.request.query_params.get('consultation')
        if consultation_id:
            queryset = queryset.filter(consultation_id=consultation_id)
            
        return queryset

    def perform_create(self, serializer):
        serializer.save()
        
    def perform_update(self, serializer):
        serializer.save()
