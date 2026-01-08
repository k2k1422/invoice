from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Product, StockMovement, Invoice, InvoiceItem, Business, BusinessMembership
from decimal import Decimal


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile model"""
    class Meta:
        model = UserProfile
        fields = ['must_change_password']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model with profile"""
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    must_change_password = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'full_name', 'is_staff', 'is_active', 'is_superuser', 'date_joined', 
                  'profile', 'must_change_password']
        read_only_fields = ['id', 'date_joined']
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username
    
    def get_must_change_password(self, obj):
        """Get must_change_password from user profile"""
        if hasattr(obj, 'profile'):
            return obj.profile.must_change_password
        return False


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for Product model with computed stock"""
    quantity_in_stock = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ['id', 'item_name', 'description', 'unit_of_measure', 'unit_price', 
                  'is_active', 'quantity_in_stock', 'created_at', 'updated_at']
        read_only_fields = ['id', 'quantity_in_stock', 'created_at', 'updated_at']
    
    def get_quantity_in_stock(self, obj):
        """Calculate stock quantity dynamically"""
        return float(obj.quantity_in_stock)
    
    def create(self, validated_data):
        """Set business from request context"""
        if hasattr(self.context['request'], 'business'):
            validated_data['business'] = self.context['request'].business
        return super().create(validated_data)


class StockMovementSerializer(serializers.ModelSerializer):
    """Serializer for StockMovement model"""
    product_name = serializers.CharField(source='product.item_name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = StockMovement
        fields = ['id', 'product', 'product_name', 'movement_type', 'quantity', 
                  'movement_date', 'notes', 'created_by', 'created_by_username', 'created_at']
        read_only_fields = ['id', 'created_by', 'created_by_username', 'created_at']
    
    def create(self, validated_data):
        """Set created_by and business to current user/business"""
        validated_data['created_by'] = self.context['request'].user
        if hasattr(self.context['request'], 'business'):
            validated_data['business'] = self.context['request'].business
        return super().create(validated_data)


class InvoiceItemSerializer(serializers.ModelSerializer):
    """Serializer for Invoice line items"""
    product_name = serializers.CharField(source='product.item_name', read_only=True)
    unit_of_measure = serializers.CharField(source='product.unit_of_measure', read_only=True)
    line_total = serializers.SerializerMethodField()
    
    class Meta:
        model = InvoiceItem
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price', 
                  'unit_of_measure', 'line_total']
        read_only_fields = ['id', 'product_name', 'unit_of_measure', 'line_total']
    
    def get_line_total(self, obj):
        return float(obj.line_total)


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for Invoice model with line items"""
    user_username = serializers.CharField(source='user.username', read_only=True)
    items = InvoiceItemSerializer(many=True)
    subtotal = serializers.SerializerMethodField()
    tax_amount = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = ['id', 'user', 'user_username', 'client_name', 'invoice_number', 
                  'invoice_date', 'payment_type', 'discount', 'items', 'subtotal', 'tax_amount', 'total', 
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'user_username', 'invoice_number', 
                           'subtotal', 'tax_amount', 'total',
                           'created_at', 'updated_at']
    
    def get_subtotal(self, obj):
        return float(obj.subtotal)
    
    def get_tax_amount(self, obj):
        return float(obj.tax_amount)
    
    def get_total(self, obj):
        return float(obj.total)
    
    def create(self, validated_data):
        """Create invoice with line items"""
        items_data = validated_data.pop('items')
        validated_data['user'] = self.context['request'].user
        if hasattr(self.context['request'], 'business'):
            validated_data['business'] = self.context['request'].business
        invoice = Invoice.objects.create(**validated_data)
        
        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)
        
        return invoice
    
    def update(self, instance, validated_data):
        """Update invoice and line items"""
        items_data = validated_data.pop('items', None)
        
        # Update invoice fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update items if provided
        if items_data is not None:
            # Delete existing items
            instance.items.all().delete()
            # Create new items
            for item_data in items_data:
                InvoiceItem.objects.create(invoice=instance, **item_data)
        
        return instance


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new users"""
    password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'is_staff']
    
    def create(self, validated_data):
        """Create user with default password Welcome@123"""
        password = validated_data.pop('password', 'Welcome@123')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        # Set must_change_password flag
        profile, created = UserProfile.objects.get_or_create(user=user)
        profile.must_change_password = True
        profile.save()
        
        return user


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change"""
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    
    def validate_old_password(self, value):
        """Check that old password is correct"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value
    
    def validate_new_password(self, value):
        """Validate new password"""
        # Add password validation here if needed
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        return value
    
    def save(self):
        """Update user password"""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        
        # Clear must_change_password flag
        if hasattr(user, 'profile'):
            user.profile.must_change_password = False
            user.profile.save()
        
        return user


class ProductStockHistorySerializer(serializers.Serializer):
    """Serializer for product stock history with running totals"""
    movement_type = serializers.CharField()
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2)
    movement_date = serializers.DateField()
    notes = serializers.CharField()
    created_by_username = serializers.CharField()
    created_at = serializers.DateTimeField()
    running_total = serializers.DecimalField(max_digits=10, decimal_places=2)


class BusinessMembershipSerializer(serializers.ModelSerializer):
    """Serializer for BusinessMembership with user details"""
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = BusinessMembership
        fields = ['id', 'user_id', 'username', 'email', 'full_name', 'role', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class BusinessListSerializer(serializers.ModelSerializer):
    """Simple serializer for listing businesses"""
    member_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Business
        fields = ['id', 'name', 'description', 'member_count']
        read_only_fields = ['id']
    
    def get_member_count(self, obj):
        return obj.memberships.count()


class BusinessSerializer(serializers.ModelSerializer):
    """Serializer for Business with member information"""
    members = BusinessMembershipSerializer(source='memberships', many=True, read_only=True)
    member_count = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    
    class Meta:
        model = Business
        fields = ['id', 'name', 'description', 'created_at', 'members', 'member_count', 'user_role']
        read_only_fields = ['id', 'created_at']
    
    def get_member_count(self, obj):
        return obj.memberships.count()
    
    def get_user_role(self, obj):
        """Get current user's role in this business"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            membership = obj.memberships.filter(user=request.user).first()
            return membership.role if membership else None
        return None


class BusinessCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new business"""
    class Meta:
        model = Business
        fields = ['name', 'description']
    
    def create(self, validated_data):
        """Create business and add creator as admin"""
        business = Business.objects.create(**validated_data)
        
        # Add the creator as an admin
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            BusinessMembership.objects.create(
                business=business,
                user=request.user,
                role='admin'
            )
        
        return business


class AddMemberSerializer(serializers.Serializer):
    """Serializer for adding a member to a business"""
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=['admin', 'member'], default='member')
    
    def validate_user_id(self, value):
        """Validate that user exists"""
        try:
            User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")
        return value
