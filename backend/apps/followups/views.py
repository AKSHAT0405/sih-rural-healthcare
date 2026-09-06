from rest_framework import viewsets, mixins
from django_filters import rest_framework as filters
from rest_framework.permissions import IsAuthenticated
from .models import FollowUp
from .serializers import FollowUpSerializer
from .permissions import CustomFollowUpPermissions

class FollowUpFilter(filters.FilterSet):
    class Meta:
        model = FollowUp
        fields = ['status', 'patient', 'consultation', 'created_by', 'consultation__doctor']

class FollowUpViewSet(mixins.CreateModelMixin,
                     mixins.RetrieveModelMixin,
                     mixins.UpdateModelMixin,
                     mixins.ListModelMixin,
                     viewsets.GenericViewSet):
    """
    API endpoint for FollowUps.
    Supports GET, POST, PATCH.
    """
    serializer_class = FollowUpSerializer
    permission_classes = [IsAuthenticated, CustomFollowUpPermissions]
    filter_backends = (filters.DjangoFilterBackend,)
    filterset_class = FollowUpFilter

    def get_queryset(self):
        user = self.request.user
        queryset = FollowUp.objects.select_related('patient', 'consultation', 'referral', 'created_by')

        if user.role == 'ADMIN':
            return queryset
            
        if user.role == 'DOCTOR':
            from django.db.models import Q
            return queryset.filter(
                Q(created_by=user) | 
                Q(consultation__doctor=user) | 
                Q(consultation__facility=user.facility)
            )
            
        if user.role == 'HEALTH_WORKER':
            return queryset.filter(consultation__facility=user.facility)
            
        if user.role == 'PATIENT':
            return queryset.filter(patient__user=user)
            
        return FollowUp.objects.none()

    def update(self, request, *args, **kwargs):
        if request.method == 'PUT':
            from rest_framework.response import Response
            from rest_framework import status
            return Response({"detail": "Method 'PUT' not allowed."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)
