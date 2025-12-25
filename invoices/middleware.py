from django.shortcuts import redirect
from django.urls import reverse
from django.contrib import messages
from .models import Business


BUSINESS_ID_SESSION_KEY = 'current_business_id'


class BusinessContextMiddleware:
    """Middleware to inject business context into requests"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Only process for authenticated users
        if request.user.is_authenticated:
            # Get business ID from session
            business_id = request.session.get(BUSINESS_ID_SESSION_KEY)
            
            # Paths that don't require business context
            exempt_paths = [
                '/business/select/',
                '/logout/',
                '/accounts/login/',
                '/admin/',
                '/api/businesses/',
                '/api/',  # Let DRF permission classes handle API endpoints
                '/change-password/',
            ]
            
            # Check if path is exempt from business context requirement
            is_exempt = any(request.path.startswith(path) for path in exempt_paths)
            
            if business_id:
                # Try to load the business and verify user has access
                try:
                    business = Business.objects.get(id=business_id)
                    # Verify user has access to this business
                    if business.memberships.filter(user=request.user).exists():
                        request.business = business
                    else:
                        # User no longer has access to this business
                        del request.session[BUSINESS_ID_SESSION_KEY]
                        request.business = None
                        if not is_exempt:
                            messages.warning(request, 'You no longer have access to the selected business. Please select another.')
                            return redirect('invoices:business_selection')
                except Business.DoesNotExist:
                    # Business was deleted
                    del request.session[BUSINESS_ID_SESSION_KEY]
                    request.business = None
                    if not is_exempt:
                        messages.warning(request, 'The selected business no longer exists. Please select another.')
                        return redirect('invoices:business_selection')
            else:
                request.business = None
                # Redirect to business selection if not on exempt path
                if not is_exempt:
                    return redirect('invoices:business_selection')
        
        response = self.get_response(request)
        return response


class PasswordChangeMiddleware:
    """Middleware to enforce password change for users with must_change_password flag"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Check if user is authenticated and has profile
        if request.user.is_authenticated and hasattr(request.user, 'profile'):
            # Check if user must change password
            if request.user.profile.must_change_password:
                # Paths that don't require password change
                exempt_paths = [
                    '/change-password/',
                    '/logout/',
                    '/accounts/login/',
                    '/admin/login/',
                    '/admin/logout/',
                ]
                # Allow access to exempt paths
                if not any(request.path.startswith(path) for path in exempt_paths):
                    messages.warning(request, 'You must change your password before continuing.')
                    return redirect('invoices:change_password')
        
        response = self.get_response(request)
        return response
