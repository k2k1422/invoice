from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.db.models import Sum, Q
from django_filters.rest_framework import DjangoFilterBackend
from datetime import datetime, timedelta
from decimal import Decimal

from .models import Product, StockMovement, Invoice, InvoiceItem, UserProfile
from .serializers import (
    ProductSerializer, StockMovementSerializer, InvoiceSerializer,
    UserSerializer, UserCreateSerializer, PasswordChangeSerializer,
    ProductStockHistorySerializer
)
from .permissions import IsStaffUser, IsOwnerOrStaff, CannotModifySelf


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product CRUD operations.
    List and retrieve: all authenticated users
    Create, update, delete: staff only
    """
    queryset = Product.objects.all().order_by('item_name')
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['item_name', 'description']
    ordering_fields = ['item_name', 'unit_price', 'created_at']
    
    def get_permissions(self):
        """Staff only for create, update, delete"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsStaffUser()]
        return [IsAuthenticated()]
    
    @action(detail=True, methods=['get'])
    def stock_history(self, request, pk=None):
        """Get stock movement history for a product with running totals"""
        product = self.get_object()
        movements = StockMovement.objects.filter(product=product).order_by('movement_date', 'created_at')
        
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
        invoices = Invoice.objects.filter(product=product).order_by('invoice_date', 'created_at')
        for invoice in invoices:
            running_total -= invoice.quantity
            history_data.append({
                'movement_type': 'SALE',
                'quantity': invoice.quantity,
                'movement_date': invoice.invoice_date,
                'notes': f'Invoice {invoice.invoice_number} - {invoice.client_name}',
                'created_by_username': invoice.user.username,
                'created_at': invoice.created_at,
                'running_total': running_total
            })
        
        # Sort by date
        history_data.sort(key=lambda x: (x['movement_date'], x['created_at']))
        
        serializer = ProductStockHistorySerializer(history_data, many=True)
        return Response(serializer.data)


class StockMovementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for StockMovement operations.
    List and retrieve: all authenticated users
    Create: staff only
    Update, delete: not allowed
    """
    queryset = StockMovement.objects.all().order_by('-movement_date', '-created_at')
    serializer_class = StockMovementSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['product', 'movement_type', 'movement_date']
    ordering_fields = ['movement_date', 'created_at']
    
    def get_permissions(self):
        """Staff only for create"""
        if self.action == 'create':
            return [IsAuthenticated(), IsStaffUser()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """Optionally filter recent movements"""
        queryset = super().get_queryset()
        recent = self.request.query_params.get('recent', None)
        if recent:
            try:
                limit = int(recent)
                queryset = queryset[:limit]
            except ValueError:
                pass
        return queryset
    
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
    """
    serializer_class = InvoiceSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['invoice_date']
    ordering_fields = ['invoice_date', 'created_at', 'invoice_number']
    
    def get_queryset(self):
        """
        Regular users see only their invoices.
        Staff users see all invoices with optional filters.
        """
        user = self.request.user
        queryset = Invoice.objects.prefetch_related('items', 'items__product').all().order_by('-invoice_date', '-created_at')
        
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
        
        # Get users who have created invoices
        users_with_invoices = User.objects.filter(
            id__in=queryset.values_list('user_id', flat=True).distinct()
        ).values('id', 'username')
        
        return Response({
            'total_count': total_count,
            'total_amount': float(total_amount),
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
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get user statistics"""
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        staff_users = User.objects.filter(is_staff=True).count()
        users_need_password_change = UserProfile.objects.filter(must_change_password=True).count()
        
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
        serializer = UserSerializer(request.user)
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
        products = Product.objects.filter(is_active=True)
        
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
        
        # Get recent movements
        recent_movements = StockMovement.objects.all().order_by('-movement_date', '-created_at')[:50]
        movements_data = StockMovementSerializer(recent_movements, many=True).data
        
        return Response({
            'products': inventory_data,
            'recent_movements': movements_data,
            'stats': {
                'total_products': len(inventory_data),
                'low_stock_count': low_stock_count
            }
        })
