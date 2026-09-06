from rest_framework import permissions

class CustomPatientPermissions(permissions.BasePermission):
    """
    HEALTH_WORKER: create, list, retrieve, update
    DOCTOR: list, retrieve (create/update forbidden)
    ADMIN: create, list, retrieve, update
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        role = request.user.role

        if view.action in ['create', 'update', 'partial_update']:
            if role in ['HEALTH_WORKER', 'ADMIN']:
                return True
            return False
        
        if view.action in ['list', 'retrieve']:
            return True
            
        if view.action == 'create_account':
            if role in ['ADMIN', 'HEALTH_WORKER']:
                return True
            return False

        return False

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'PATIENT':
            if view.action in ['retrieve']:
                return obj.user == request.user
            return False

        if view.action in ['update', 'partial_update']:
            if request.user.role == 'HEALTH_WORKER':
                if not request.user.facility or request.user.facility != obj.facility:
                    return False
        return True
