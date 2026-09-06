from rest_framework import viewsets, mixins
from rest_framework.permissions import IsAuthenticated
from .models import Referral
from .serializers import ReferralSerializer
from .permissions import CustomReferralPermissions

class ReferralViewSet(mixins.CreateModelMixin,
                      mixins.RetrieveModelMixin,
                      mixins.UpdateModelMixin,
                      mixins.ListModelMixin,
                      viewsets.GenericViewSet):
    """
    API endpoint that allows referrals to be viewed or edited.
    """
    serializer_class = ReferralSerializer
    permission_classes = [IsAuthenticated, CustomReferralPermissions]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    
    def get_queryset(self):
        user = self.request.user
        queryset = Referral.objects.select_related(
            'patient', 'consultation', 'from_facility', 'to_facility', 'referred_by'
        ).all()
        
        # Enforce Role-based Security
        if user.role == 'DOCTOR':
            from django.db.models import Q
            queryset = queryset.filter(
                Q(referred_by=user) | 
                Q(from_facility=user.facility) | 
                Q(to_facility=user.facility)
            )
        elif user.role == 'HEALTH_WORKER':
            from django.db.models import Q
            queryset = queryset.filter(
                Q(from_facility=user.facility) | 
                Q(to_facility=user.facility)
            )
        elif user.role == 'PATIENT':
            queryset = queryset.filter(patient__user=user)
        
        # Filtering logic
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)

        patient_id = self.request.query_params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
            
        from_facility = self.request.query_params.get('from_facility')
        if from_facility:
            queryset = queryset.filter(from_facility_id=from_facility)
            
        to_facility = self.request.query_params.get('to_facility')
        if to_facility:
            queryset = queryset.filter(to_facility_id=to_facility)
            
        referred_by = self.request.query_params.get('referred_by')
        if referred_by:
            queryset = queryset.filter(referred_by_id=referred_by)
            
        return queryset
