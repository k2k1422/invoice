from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import SessionAuthentication
from .models import Business
from .middleware import BUSINESS_ID_SESSION_KEY


class JWTAuthenticationWithBusinessContext(JWTAuthentication):
    """
    Custom JWT authentication that also sets business context from session.
    """
    def authenticate(self, request):
        # First, authenticate using JWT
        result = super().authenticate(request)
        
        if result is not None:
            user, token = result
            
            # Now set business context from session
            if hasattr(request, 'session'):
                business_id = request.session.get(BUSINESS_ID_SESSION_KEY)
                if business_id:
                    try:
                        business = Business.objects.get(id=business_id)
                        # Verify user has access to this business
                        if business.memberships.filter(user=user).exists() or user.is_superuser:
                            request.business = business
                        else:
                            request.business = None
                    except Business.DoesNotExist:
                        request.business = None
                else:
                    request.business = None
            
            return result
        
        return None


class SessionAuthenticationWithBusinessContext(SessionAuthentication):
    """
    Custom session authentication that also sets business context from session.
    """
    def authenticate(self, request):
        # First, authenticate using session
        result = super().authenticate(request)
        
        if result is not None:
            user = result[0] if isinstance(result, tuple) else result
            
            # Now set business context from session
            if hasattr(request, 'session'):
                business_id = request.session.get(BUSINESS_ID_SESSION_KEY)
                if business_id:
                    try:
                        business = Business.objects.get(id=business_id)
                        # Verify user has access to this business
                        if business.memberships.filter(user=user).exists() or user.is_superuser:
                            request.business = business
                        else:
                            request.business = None
                    except Business.DoesNotExist:
                        request.business = None
                else:
                    request.business = None
            
            return result
        
        return None
