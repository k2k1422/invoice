from django.contrib import admin
from .models import Product, Invoice, UserProfile, StockMovement


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin interface for UserProfile management"""
    list_display = ['user', 'must_change_password']
    list_filter = ['must_change_password']
    search_fields = ['user__username', 'user__email']


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    """Admin interface for StockMovement management"""
    list_display = ['movement_date', 'product', 'movement_type', 'quantity', 'created_by', 'created_at']
    list_filter = ['movement_type', 'movement_date', 'created_at']
    search_fields = ['product__item_name', 'notes']
    readonly_fields = ['created_at']
    date_hierarchy = 'movement_date'


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Admin interface for Product/Inventory management - Only staff can access"""
    list_display = ['item_name', 'unit_of_measure', 'unit_price', 'quantity_in_stock', 'is_active', 'updated_at']
    list_filter = ['is_active', 'unit_of_measure', 'created_at']
    search_fields = ['item_name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Product Information', {
            'fields': ('item_name', 'description', 'unit_of_measure')
        }),
        ('Pricing & Stock', {
            'fields': ('unit_price', 'quantity_in_stock', 'is_active')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_module_permission(self, request):
        """Only staff/admin users can access product management"""
        return request.user.is_staff
    
    def has_view_permission(self, request, obj=None):
        """Only staff/admin users can view products"""
        return request.user.is_staff
    
    def has_add_permission(self, request):
        """Only staff/admin users can add products"""
        return request.user.is_staff
    
    def has_change_permission(self, request, obj=None):
        """Only staff/admin users can change products"""
        return request.user.is_staff
    
    def has_delete_permission(self, request, obj=None):
        """Only staff/admin users can delete products"""
        return request.user.is_staff


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    """Admin interface for Invoice management"""
    list_display = ['invoice_number', 'client_name', 'user', 'invoice_date', 'created_at']
    list_filter = ['invoice_date', 'created_at']
    search_fields = ['invoice_number', 'client_name']
    readonly_fields = ['invoice_number', 'created_at', 'updated_at']
