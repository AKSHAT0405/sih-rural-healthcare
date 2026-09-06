from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Patient
from .serializers import PatientSerializer
from .permissions import CustomPatientPermissions

class PatientViewSet(mixins.CreateModelMixin,
                   mixins.RetrieveModelMixin,
                   mixins.UpdateModelMixin,
                   mixins.ListModelMixin,
                   viewsets.GenericViewSet):
    """
    API endpoint that allows patients to be viewed or edited.
    """
    queryset = Patient.objects.select_related('facility', 'created_by').all()
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated, CustomPatientPermissions]
    search_fields = ['full_name', 'phone']

    def get_queryset(self):
        queryset = self.queryset
        if self.request.user.role == 'PATIENT':
            return queryset.filter(user=self.request.user)
        return queryset

    def perform_create(self, serializer):
        facility = serializer.validated_data.get('facility')
        if not facility:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'facility': 'This field is required.'})

        if self.request.user.role == 'HEALTH_WORKER':
            if not self.request.user.facility:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You must be assigned to a facility to register patients.")
            if facility != self.request.user.facility:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only register patients for your own facility.")

        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        if self.request.user.role == 'HEALTH_WORKER':
            facility = serializer.validated_data.get('facility')
            if facility and facility != serializer.instance.facility:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You cannot move a patient to another facility.")
        
        serializer.save()

    @action(detail=True, methods=['post'])
    def create_account(self, request, pk=None):
        patient = self.get_object()
        
        if request.user.role not in ['ADMIN', 'HEALTH_WORKER']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to create patient accounts.")
            
        if patient.user is not None:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"detail": "This patient already has an account."})

        from .serializers import PatientAccountCreateSerializer
        serializer = PatientAccountCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Create the user and force PATIENT role
        name_parts = patient.full_name.split() if patient.full_name else []
        first_name = name_parts[0] if len(name_parts) > 0 else ''
        last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
        
        user = User(
            email=serializer.validated_data['email'],
            first_name=first_name,
            last_name=last_name,
            role='PATIENT',
            phone=patient.phone,
            facility=patient.facility
        )
        user.set_password(serializer.validated_data['password'])
        user.save()
        
        # Link the user to the patient
        patient.user = user
        patient.save()
        
        return Response({"detail": "Account created successfully."}, status=status.HTTP_201_CREATED)
