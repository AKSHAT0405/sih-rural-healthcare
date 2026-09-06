from rest_framework import viewsets, mixins
from rest_framework.permissions import IsAuthenticated
from .models import Facility
from .serializers import FacilitySerializer
from .permissions import IsAdminOrReadOnly

class FacilityViewSet(mixins.CreateModelMixin,
                      mixins.RetrieveModelMixin,
                      mixins.UpdateModelMixin,
                      mixins.ListModelMixin,
                      viewsets.GenericViewSet):
    """
    API endpoint for viewing and editing facilities.
    """
    queryset = Facility.objects.all()
    serializer_class = FacilitySerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    search_fields = ['name', 'address']
