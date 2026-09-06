from rest_framework import generics, permissions, viewsets
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import UserSerializer, CustomTokenObtainPairSerializer, DoctorProfileSerializer, DoctorAvailabilitySerializer
from .models import DoctorProfile, DoctorAvailability

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class UserDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/auth/me/
    Returns the authenticated user's basic profile.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

from django.contrib.auth import get_user_model
User = get_user_model()

class DoctorListView(generics.ListAPIView):
    """
    GET /api/v1/auth/doctors/
    Returns a list of users with the DOCTOR role.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return User.objects.filter(role='DOCTOR', is_active=True).select_related('facility')

class DoctorProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for DoctorProfiles.
    Doctors can manage their own profile. Others can read.
    """
    queryset = DoctorProfile.objects.all()
    serializer_class = DoctorProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            if self.request.user.role == 'ADMIN':
                return DoctorProfile.objects.all()
            return DoctorProfile.objects.filter(user=self.request.user)
        return super().get_queryset()

    def perform_create(self, serializer):
        if self.request.user.role != 'DOCTOR':
            raise PermissionDenied("Only doctors can create a profile.")
        serializer.save(user=self.request.user)


class DoctorAvailabilityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for DoctorAvailability.
    Doctors can manage their own availability. Others can read.
    Supports filtering by doctor: /api/v1/availability/?doctor={id}
    """
    queryset = DoctorAvailability.objects.all()
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ['update', 'partial_update', 'destroy']:
            if self.request.user.role != 'ADMIN':
                qs = qs.filter(doctor=self.request.user)
            return qs
        
        doctor_id = self.request.query_params.get('doctor')
        if doctor_id:
            qs = qs.filter(doctor_id=doctor_id)
        return qs

    def perform_create(self, serializer):
        if self.request.user.role != 'DOCTOR':
            raise PermissionDenied("Only doctors can create availability.")
        serializer.save(doctor=self.request.user)
