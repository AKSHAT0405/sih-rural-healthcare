from rest_framework import permissions

class CustomConsultationPermissions(permissions.BasePermission):
    """
    ADMIN: list, retrieve, create, update
    DOCTOR: list, retrieve, create, update (restricted to own via object permissions)
    HEALTH_WORKER: list, retrieve (create/update forbidden)
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        role = request.user.role

        if view.action in ['create', 'update', 'partial_update', 'start', 'complete']:
            if view.action == 'create' and role == 'PATIENT':
                return True
            if view.action in ['start', 'complete']:
                return role == 'DOCTOR'
            if role in ['DOCTOR', 'ADMIN', 'HEALTH_WORKER']:
                return True
            return False
        
        if view.action in ['list', 'retrieve']:
            return True

        if getattr(view, 'action', None) is None:
            return True

        return False

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'PATIENT':
            if view.action in ['retrieve']:
                return obj.patient.user == request.user
            return False

        if view.action in ['update', 'partial_update', 'start', 'complete']:
            if request.user.role == 'DOCTOR':
                if obj.doctor != request.user and obj.doctor is not None:
                    return False
        return True

class CustomMedicalRecordPermissions(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if view.action in ['list', 'retrieve']:
            return True

        if view.action in ['create', 'update', 'partial_update']:
            return request.user.role == 'DOCTOR'

        return False

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'PATIENT':
            if view.action in ['retrieve']:
                return obj.consultation.patient.user == request.user
            return False

        if view.action in ['retrieve']:
            return True

        if view.action in ['update', 'partial_update']:
            if request.user.role == 'DOCTOR':
                return obj.consultation.doctor == request.user
        
        return False
