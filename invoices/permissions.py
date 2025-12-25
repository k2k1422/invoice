from rest_framework import permissions


class IsStaffUser(permissions.BasePermission):
    """
    Permission to only allow staff users to access the view.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff


class IsOwnerOrStaff(permissions.BasePermission):
    """
    Permission to only allow owners of an object or staff to access it.
    """
    def has_object_permission(self, request, view, obj):
        # Staff users have full access
        if request.user.is_staff:
            return True
        
        # Check if object has a user field (for invoices)
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        return False


class CannotModifySelf(permissions.BasePermission):
    """
    Permission to prevent users from deleting or disabling themselves.
    """
    def has_object_permission(self, request, view, obj):
        # For delete and disable actions, prevent self-modification
        if view.action in ['destroy', 'toggle_status'] and request.user == obj:
            return False
        return True
