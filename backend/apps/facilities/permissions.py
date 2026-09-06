from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    ADMIN: list, retrieve, create, update
    DOCTOR: list, retrieve
    HEALTH_WORKER: list, retrieve
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if view.action in ['list', 'retrieve']:
            return True

        if view.action in ['create', 'update', 'partial_update']:
            return request.user.role == 'ADMIN'
            
        return False
