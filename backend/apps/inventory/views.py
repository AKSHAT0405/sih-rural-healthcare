from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from .models import InventoryItem
from .serializers import InventoryItemSerializer

class InventoryItemViewSet(viewsets.ModelViewSet):
    serializer_class = InventoryItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return InventoryItem.objects.all()
        elif user.role == 'HEALTH_WORKER':
            if user.facility:
                return InventoryItem.objects.filter(facility=user.facility)
            return InventoryItem.objects.none()
        else:
            # Patients and Doctors have read-only access to their facility's inventory
            # or all if they don't have a specific facility (e.g. for routing)
            if self.request.method in permissions.SAFE_METHODS:
                if user.facility:
                    return InventoryItem.objects.filter(facility=user.facility)
                return InventoryItem.objects.all()
            return InventoryItem.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'ADMIN':
            # Admin must provide facility in the request data, serializer handles it
            if 'facility' not in self.request.data:
                raise PermissionDenied("Admin must specify a facility.")
            serializer.save()
        elif user.role == 'HEALTH_WORKER':
            if not user.facility:
                raise PermissionDenied("Health worker is not assigned to a facility.")
            # Ignore any client-provided facility and force the user's facility
            serializer.save(facility=user.facility)
        else:
            raise PermissionDenied("You do not have permission to create inventory items.")

    def perform_update(self, serializer):
        user = self.request.user
        if user.role not in ['ADMIN', 'HEALTH_WORKER']:
            raise PermissionDenied("You do not have permission to update inventory items.")
        
        # Health worker's ability to update is implicitly restricted to their facility 
        # by get_queryset(). But we can enforce it explicitly just in case:
        instance = self.get_object()
        if user.role == 'HEALTH_WORKER' and instance.facility != user.facility:
            raise PermissionDenied("You cannot update inventory for another facility.")

        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == 'ADMIN':
            instance.delete()
        elif user.role == 'HEALTH_WORKER':
            if instance.facility == user.facility:
                instance.delete()
            else:
                raise PermissionDenied("You cannot delete inventory for another facility.")
        else:
            raise PermissionDenied("You do not have permission to delete inventory items.")
