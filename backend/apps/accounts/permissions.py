from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    """
    Allows access only to admin users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'ADMIN')


class IsDoctor(permissions.BasePermission):
    """
    Allows access only to doctor users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'DOCTOR')


class IsHealthWorker(permissions.BasePermission):
    """
    Allows access only to health worker users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'HEALTH_WORKER')
