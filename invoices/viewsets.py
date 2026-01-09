from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.db.models import Sum, Q
from django_filters.rest_framework import DjangoFilterBackend
from datetime import datetime, timedelta
from decimal import Decimal

from .models import Product, StockMovement, Invoice, InvoiceItem, UserProfile, Business, BusinessMembership, Deposit
from .serializers import (
    ProductSerializer, StockMovementSerializer, InvoiceSerializer,
    UserSerializer, UserCreateSerializer, PasswordChangeSerializer,
    ProductStockHistorySerializer, BusinessSerializer, BusinessCreateSerializer,
    AddMemberSerializer, BusinessListSerializer, DepositSerializer
)
from .permissions import (
    IsStaffUser, IsOwnerOrStaff, CannotModifySelf, IsSuperUser, HasBusinessAccess, IsSuperuserOrBusinessAdmin
)
from .middleware import BUSINESS_ID_SESSION_KEY


class BusinessViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Business operations with role-based permissions.
    - Superusers can create businesses and manage all memberships
    - Business admins can manage members in their businesses
    - Normal users can only view businesses they belong to
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return businesses based on user role"""
        if self.request.user.is_superuser:
            # Superusers see all businesses
            return Business.objects.all().order_by('name')
        else:
            # Normal users see only their businesses
            return Business.objects.filter(
                memberships__user=self.request.user
            ).distinct().order_by('name')
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'create':
            return BusinessCreateSerializer
        elif self.action == 'list':
            return BusinessListSerializer
        return BusinessSerializer
    
    def get_permissions(self):
        """Only superusers can create businesses"""
        if self.action == 'create':
            return [IsAuthenticated(), IsSuperUser()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            # For update/delete, check in perform methods
            return [IsAuthenticated()]
        return [IsAuthenticated()]
    
    def perform_update(self, serializer):
        """Only superusers and business admins can update"""
        business = self.get_object()
        user = self.request.user
        
        # Superusers can update any business
        if user.is_superuser:
            serializer.save()
            return
        
        # Check if user is admin of this business
        membership = business.memberships.filter(user=user, role='admin').first()
        if membership:
            serializer.save()
            return
        
        # Otherwise, deny
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("Only superusers and business admins can update businesses.")
    
    def perform_destroy(self, instance):
        """Only superusers can delete businesses"""
        if not self.request.user.is_superuser:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only superusers can delete businesses.")
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def select(self, request, pk=None):
        """Select a business and store in session"""
        business = self.get_object()
        
        # Verify user has access to this business
        if not business.memberships.filter(user=request.user).exists():
            return Response(
                {'detail': 'You do not have access to this business.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Store in session
        request.session[BUSINESS_ID_SESSION_KEY] = business.id
        
        return Response({
            'id': business.id,
            'name': business.name,
            'description': business.description
        })
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get currently selected business"""
        if hasattr(request, 'business') and request.business:
            serializer = BusinessSerializer(request.business, context={'request': request})
            return Response(serializer.data)
        # Return 204 No Content instead of 400 when no business selected
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """Add a member to the business (superuser or admin only)"""
        business = self.get_object()
        user = request.user
        
        # Check permissions: superuser or business admin
        if not user.is_superuser:
            membership = business.memberships.filter(user=user, role='admin').first()
            if not membership:
                return Response(
                    {'detail': 'Only superusers and business admins can add members.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Validate input
        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_id = serializer.validated_data['user_id']
        role = serializer.validated_data['role']
        
        # Check if user already a member
        target_user = User.objects.get(id=user_id)
        if business.memberships.filter(user=target_user).exists():
            return Response(
                {'detail': 'User is already a member of this business.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Add member
        membership = BusinessMembership.objects.create(
            business=business,
            user=target_user,
            role=role
        )
        
        from .serializers import BusinessMembershipSerializer
        return Response(
            BusinessMembershipSerializer(membership).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['delete'], url_path='remove_member/(?P<user_id>[^/.]+)')
    def remove_member(self, request, pk=None, user_id=None):
        """Remove a member from the business (superuser or admin only)"""
        business = self.get_object()
        user = request.user
        
        # Check permissions: superuser or business admin
        if not user.is_superuser:
            membership = business.memberships.filter(user=user, role='admin').first()
            if not membership:
                return Response(
                    {'detail': 'Only superusers and business admins can remove members.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Get the membership to remove
        try:
            target_membership = business.memberships.get(user_id=user_id)
        except BusinessMembership.DoesNotExist:
            return Response(
                {'detail': 'User is not a member of this business.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Prevent removing the last admin
        if target_membership.role == 'admin':
            admin_count = business.memberships.filter(role='admin').count()
            if admin_count <= 1:
                return Response(
                    {'detail': 'Cannot remove the last admin from the business.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        target_membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['patch'], url_path='update_role/(?P<user_id>[^/.]+)')
    def update_role(self, request, pk=None, user_id=None):
        """Update a member's role (superuser or admin only)"""
        business = self.get_object()
        user = request.user
        
        # Check permissions: superuser or business admin
        if not user.is_superuser:
            membership = business.memberships.filter(user=user, role='admin').first()
            if not membership:
                return Response(
                    {'detail': 'Only superusers and business admins can update roles.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Get the membership to update
        try:
            target_membership = business.memberships.get(user_id=user_id)
        except BusinessMembership.DoesNotExist:
            return Response(
                {'detail': 'User is not a member of this business.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get new role
        new_role = request.data.get('role')
        if new_role not in ['admin', 'member']:
            return Response(
                {'detail': 'Invalid role. Must be "admin" or "member".'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # If demoting from admin, check we're not removing the last admin
        if target_membership.role == 'admin' and new_role == 'member':
            admin_count = business.memberships.filter(role='admin').count()
            if admin_count <= 1:
                return Response(
                    {'detail': 'Cannot demote the last admin of the business.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        target_membership.role = new_role
        target_membership.save()
        
        from .serializers import BusinessMembershipSerializer
        return Response(BusinessMembershipSerializer(target_membership).data)


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product CRUD operations.
    List and retrieve: all authenticated users with business access
    Create, update, delete: staff only with business access
    """
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, HasBusinessAccess]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['item_name', 'description']
    ordering_fields = ['item_name', 'unit_price', 'created_at']
    
    def get_queryset(self):
        """Filter products by current business"""
        if hasattr(self.request, 'business') and self.request.business:
            return Product.objects.filter(business=self.request.business).order_by('item_name')
        return Product.objects.none()
    
    def get_permissions(self):
        """Staff only for create, update, delete + business access required"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsStaffUser(), HasBusinessAccess()]
        return [IsAuthenticated(), HasBusinessAccess()]
    
    @action(detail=True, methods=['get'])
    def stock_history(self, request, pk=None):
        """Get stock movement history for a product with running totals"""
        product = self.get_object()
        movements = StockMovement.objects.filter(
            product=product,
            business=request.business
        ).order_by('movement_date', 'created_at')
        
        # Calculate running totals
        running_total = Decimal('0')
        history_data = []
        
        for movement in movements:
            if movement.movement_type == 'IN':
                running_total += movement.quantity
            else:  # OUT
                running_total -= movement.quantity
            
            history_data.append({
                'movement_type': movement.movement_type,
                'quantity': movement.quantity,
                'movement_date': movement.movement_date,
                'notes': movement.notes or '',
                'created_by_username': movement.created_by.username if movement.created_by else 'N/A',
                'created_at': movement.created_at,
                'running_total': running_total
            })
        
        # Subtract invoice quantities
        invoices_qs = InvoiceItem.objects.filter(
            product=product,
            invoice__business=request.business
        ).select_related('invoice', 'invoice__user').order_by('invoice__invoice_date', 'invoice__created_at')
        for item in invoices_qs:
            running_total -= item.quantity
            history_data.append({
                'movement_type': 'SALE',
                'quantity': item.quantity,
                'movement_date': item.invoice.invoice_date,
                'notes': f'Invoice {item.invoice.invoice_number} - {item.invoice.client_name}',
                'created_by_username': item.invoice.user.username,
                'created_at': item.invoice.created_at,
                'running_total': running_total
            })
        
        # Sort by date
        history_data.sort(key=lambda x: (x['movement_date'], x['created_at']))
        
        serializer = ProductStockHistorySerializer(history_data, many=True)
        return Response(serializer.data)


class StockMovementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for StockMovement operations.
    List and retrieve: all authenticated users with business access
    Create: staff only with business access
    Update, delete: not allowed
    """
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated, HasBusinessAccess]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['product', 'movement_type', 'movement_date']
    ordering_fields = ['movement_date', 'created_at']
    
    def get_queryset(self):
        """Filter stock movements by current business"""
        if hasattr(self.request, 'business') and self.request.business:
            queryset = StockMovement.objects.filter(
                business=self.request.business
            ).order_by('-movement_date', '-created_at')
        else:
            queryset = StockMovement.objects.none()
        
        # Optionally filter recent movements
        recent = self.request.query_params.get('recent', None)
        if recent:
            try:
                limit = int(recent)
                queryset = queryset[:limit]
            except ValueError:
                pass
        return queryset
    
    def get_permissions(self):
        """Staff only for create + business access required"""
        if self.action == 'create':
            return [IsAuthenticated(), IsStaffUser(), HasBusinessAccess()]
        return [IsAuthenticated(), HasBusinessAccess()]
    
    # Disable update and delete
    def update(self, request, *args, **kwargs):
        return Response(
            {"detail": "Stock movements cannot be updated."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Stock movements cannot be deleted."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Invoice operations.
    Requires business access for all operations.
    """
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, HasBusinessAccess]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['invoice_date']
    ordering_fields = ['invoice_date', 'created_at', 'invoice_number']
    
    def get_queryset(self):
        """
        Regular users see only their invoices.
        Staff users see all invoices with optional filters.
        All filtered by current business.
        """
        user = self.request.user
        
        # Filter by business first
        if hasattr(self.request, 'business') and self.request.business:
            queryset = Invoice.objects.filter(
                business=self.request.business
            ).prefetch_related('items', 'items__product').order_by('-invoice_date', '-created_at')
        else:
            queryset = Invoice.objects.none()
        
        if not user.is_staff:
            # Regular users only see their own invoices
            queryset = queryset.filter(user=user)
        else:
            # Staff can filter by user
            user_id = self.request.query_params.get('user_id', None)
            if user_id and user_id != 'all':
                queryset = queryset.filter(user_id=user_id)
            
            # Date range filter
            date_range = self.request.query_params.get('date_range', None)
            from_date = self.request.query_params.get('from_date', None)
            to_date = self.request.query_params.get('to_date', None)
            
            # Custom date range takes precedence
            if from_date:
                queryset = queryset.filter(invoice_date__gte=from_date)
            if to_date:
                queryset = queryset.filter(invoice_date__lte=to_date)
            # Fallback to preset date range if no custom dates
            elif date_range and date_range != 'all' and not from_date and not to_date:
                try:
                    days = int(date_range)
                    start_date = datetime.now().date() - timedelta(days=days)
                    queryset = queryset.filter(invoice_date__gte=start_date)
                except ValueError:
                    pass
        
        return queryset
    
    def get_permissions(self):
        """Check ownership for retrieve, update, delete"""
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOwnerOrStaff()]
        return [IsAuthenticated()]
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsStaffUser])
    def stats(self, request):
        """Get invoice statistics for admin"""
        queryset = self.get_queryset()
        
        total_count = queryset.count()
        total_amount = sum(invoice.total for invoice in queryset)
        
        # Calculate cash and online payment totals
        cash_invoices = queryset.filter(payment_type='cash')
        online_invoices = queryset.filter(payment_type='online')
        
        total_cash_amount = sum(invoice.total for invoice in cash_invoices)
        total_online_amount = sum(invoice.total for invoice in online_invoices)
        
        # Get users who have created invoices in this business
        users_with_invoices = User.objects.filter(
            id__in=queryset.values_list('user_id', flat=True).distinct()
        ).values('id', 'username')
        
        return Response({
            'total_count': total_count,
            'total_amount': float(total_amount),
            'total_cash_amount': float(total_cash_amount),
            'total_online_amount': float(total_online_amount),
            'users': list(users_with_invoices)
        })


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for User management (staff only).
    """
    queryset = User.objects.all().order_by('username')
    permission_classes = [IsAuthenticated, IsStaffUser, CannotModifySelf]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'date_joined']
    
    def get_queryset(self):
        """
        Filter users based on permissions:
        - Superusers see all users
        - Staff users see only non-superusers
        """
        queryset = super().get_queryset()
        
        # Superusers can see all users
        if self.request.user.is_superuser:
            return queryset
        
        # Staff users cannot see superusers
        return queryset.filter(is_superuser=False)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get user statistics"""
        # Filter based on permissions
        if request.user.is_superuser:
            queryset = User.objects.all()
        else:
            queryset = User.objects.filter(is_superuser=False)
        
        total_users = queryset.count()
        active_users = queryset.filter(is_active=True).count()
        staff_users = queryset.filter(is_staff=True).count()
        users_need_password_change = UserProfile.objects.filter(
            must_change_password=True,
            user__in=queryset
        ).count()
        
        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'staff_users': staff_users,
            'users_need_password_change': users_need_password_change
        })
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Reset user password to default Welcome@123"""
        user = self.get_object()
        user.set_password('Welcome@123')
        user.save()
        
        # Set must_change_password flag
        profile, created = UserProfile.objects.get_or_create(user=user)
        profile.must_change_password = True
        profile.save()
        
        return Response({'message': 'Password reset successfully. Default password: Welcome@123'})
    
    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Enable or disable user"""
        user = self.get_object()
        
        # Prevent disabling self
        if user == request.user:
            return Response(
                {'detail': 'You cannot disable your own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_active = not user.is_active
        user.save()
        
        return Response({
            'message': f'User {"enabled" if user.is_active else "disabled"} successfully.',
            'is_active': user.is_active
        })
    
    def destroy(self, request, *args, **kwargs):
        """Delete user with self-protection"""
        user = self.get_object()
        
        # Prevent deleting self
        if user == request.user:
            return Response(
                {'detail': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().destroy(request, *args, **kwargs)


class AuthViewSet(viewsets.ViewSet):
    """
    ViewSet for authentication-related actions.
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user info"""
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change user password"""
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Password changed successfully.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def check_password_change_required(self, request):
        """Check if user needs to change password"""
        needs_change = False
        if hasattr(request.user, 'profile'):
            needs_change = request.user.profile.must_change_password
        
        return Response({'must_change_password': needs_change})


class InventoryViewSet(viewsets.ViewSet):
    """
    ViewSet for inventory management overview.
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get inventory overview with stats"""
        if hasattr(request, 'business') and request.business:
            products = Product.objects.filter(business=request.business, is_active=True)
        else:
            products = Product.objects.none()
        
        inventory_data = []
        low_stock_count = 0
        
        for product in products:
            stock = product.quantity_in_stock
            if stock < 10:
                low_stock_count += 1
            
            inventory_data.append({
                'id': product.id,
                'name': product.item_name,
                'unit': product.unit_of_measure,
                'unit_price': float(product.unit_price),
                'stock': float(stock),
                'stock_status': 'low' if stock < 10 else 'medium' if stock < 50 else 'good'
            })
        
        # Get recent movements for this business
        if hasattr(request, 'business') and request.business:
            recent_movements = StockMovement.objects.filter(
                business=request.business
            ).order_by('-movement_date', '-created_at')[:50]
        else:
            recent_movements = StockMovement.objects.none()
        movements_data = StockMovementSerializer(recent_movements, many=True).data
        
        return Response({
            'products': inventory_data,
            'recent_movements': movements_data,
            'stats': {
                'total_products': len(inventory_data),
                'low_stock_count': low_stock_count
            }
        })


class DepositViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Deposit operations.
    Regular users see only their deposits.
    Staff users see all deposits with filters.
    """
    serializer_class = DepositSerializer
    permission_classes = [IsAuthenticated, HasBusinessAccess]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['deposit_date']
    ordering_fields = ['deposit_date', 'created_at', 'amount']
    
    def get_queryset(self):
        """
        Regular users see only their deposits.
        Staff users see all deposits with optional filters.
        """
        user = self.request.user
        
        # Filter by business first
        if hasattr(self.request, 'business') and self.request.business:
            queryset = Deposit.objects.filter(
                business=self.request.business
            ).select_related('user').order_by('-deposit_date', '-created_at')
        else:
            queryset = Deposit.objects.none()
        
        if not user.is_staff:
            # Regular users only see their own deposits
            queryset = queryset.filter(user=user)
        else:
            # Staff can filter by user
            user_id = self.request.query_params.get('user_id', None)
            if user_id and user_id != 'all':
                queryset = queryset.filter(user_id=user_id)
            
            # Date range filter
            date_range = self.request.query_params.get('date_range', None)
            from_date = self.request.query_params.get('from_date', None)
            to_date = self.request.query_params.get('to_date', None)
            
            # Custom date range takes precedence
            if from_date:
                queryset = queryset.filter(deposit_date__gte=from_date)
            if to_date:
                queryset = queryset.filter(deposit_date__lte=to_date)
            # Fallback to preset date range
            elif date_range and date_range != 'all' and not from_date and not to_date:
                try:
                    days = int(date_range)
                    start_date = datetime.now().date() - timedelta(days=days)
                    queryset = queryset.filter(deposit_date__gte=start_date)
                except ValueError:
                    pass
        
        return queryset
    
    def get_permissions(self):
        """Check permissions - only superusers and business admins can delete"""
        if self.action == 'destroy':
            return [IsAuthenticated(), IsSuperuserOrBusinessAdmin(), HasBusinessAccess()]
        if self.action in ['retrieve', 'update', 'partial_update']:
            return [IsAuthenticated(), IsOwnerOrStaff(), HasBusinessAccess()]
        return [IsAuthenticated(), HasBusinessAccess()]
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsStaffUser])
    def stats(self, request):
        """Get deposit statistics for admin"""
        queryset = self.get_queryset()
        
        total_count = queryset.count()
        total_amount = sum(deposit.amount for deposit in queryset)
        
        return Response({
            'total_count': total_count,
            'total_amount': float(total_amount)
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsStaffUser])
    def users(self, request):
        """Get all unique users who have made deposits - independent of filters"""
        from django.db.models import Count
        
        # Get all deposits for the current business without applying user filters
        if hasattr(request, 'business') and request.business:
            base_queryset = Deposit.objects.filter(business=request.business)
        else:
            base_queryset = Deposit.objects.none()
        
        # Get unique users
        users_with_deposits = base_queryset.values('user__id', 'user__username').annotate(
            count=Count('user__id')
        ).values('user__id', 'user__username').order_by('user__username')
        
        return Response(list(users_with_deposits))
