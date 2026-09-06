from rest_framework import permissions

class CustomFollowUpPermissions(permissions.BasePermission):
    """
    Role-based permissions for FollowUps.
    ADMIN: All permissions.
    DOCTOR: View all, Create (restricted by serializer to own consultations), Update.
    HEALTH_WORKER: Read-only (view all).
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.role == 'ADMIN':
            return True
            
        if request.user.role == 'DOCTOR':
            if view.action in ['list', 'retrieve', 'create', 'update', 'partial_update']:
                return True

        if request.user.role in ['HEALTH_WORKER', 'PATIENT']:
            if view.action in ['list', 'retrieve']:
                return True

        if getattr(view, 'action', None) is None:
            return True

        return False

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
            
        if request.user.role == 'DOCTOR':
            if view.action in ['retrieve']:
                return True
            if view.action in ['update', 'partial_update']:
                # Allow doctors to update follow-ups ONLY for their own consultations.
                if obj.consultation.doctor == request.user:
                    return True
                return False

        if request.user.role == 'HEALTH_WORKER':
            if view.action in ['retrieve']:
                return True

        if request.user.role == 'PATIENT':
            if view.action in ['retrieve']:
                return obj.patient.user == request.user
            return False

        return False
