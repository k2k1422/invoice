from django.shortcuts import redirect
from django.urls import reverse
from django.contrib import messages


class PasswordChangeMiddleware:
    """Middleware to enforce password change for users with must_change_password flag"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Paths that don't require password change
        self.exempt_paths = [
            reverse('invoices:change_password'),
            reverse('invoices:logout'),
            reverse('login'),
            reverse('admin:login'),
            '/admin/logout/',
        ]
    
    def __call__(self, request):
        # Check if user is authenticated and has profile
        if request.user.is_authenticated and hasattr(request.user, 'profile'):
            # Check if user must change password
            if request.user.profile.must_change_password:
                # Allow access to exempt paths
                if not any(request.path.startswith(path) for path in self.exempt_paths):
                    # Don't redirect if already on change password page
                    if request.path != reverse('invoices:change_password'):
                        messages.warning(request, 'You must change your password before continuing.')
                        return redirect('invoices:change_password')
        
        response = self.get_response(request)
        return response
