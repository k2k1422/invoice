from django.contrib import admin
from .models import Product, Invoice, InvoiceItem, UserProfile, StockMovement, Business, BusinessMembership, Deposit


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    """Admin interface for Business management"""
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(BusinessMembership)
class BusinessMembershipAdmin(admin.ModelAdmin):
    """Admin interface for BusinessMembership management"""
    list_display = ['user', 'business', 'role', 'created_at']
    list_filter = ['role', 'business']
    search_fields = ['user__username', 'business__name']
    readonly_fields = ['created_at']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin interface for UserProfile management"""
    list_display = ['user', 'must_change_password']
    list_filter = ['must_change_password']
    search_fields = ['user__username', 'user__email']


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    """Admin interface for StockMovement management"""
    list_display = ['movement_date', 'business', 'product', 'movement_type', 'quantity', 'created_by', 'created_at']
    list_filter = ['movement_type', 'business', 'movement_date', 'created_at']
    search_fields = ['product__item_name', 'notes', 'business__name']
    readonly_fields = ['created_at']
    date_hierarchy = 'movement_date'


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Admin interface for Product/Inventory management - Only staff can access"""
    list_display = ['item_name', 'business', 'unit_of_measure', 'unit_price', 'quantity_in_stock', 'is_active', 'updated_at']
    list_filter = ['is_active', 'business', 'unit_of_measure', 'created_at']
    search_fields = ['item_name', 'description', 'business__name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Product Information', {
            'fields': ('business', 'item_name', 'description', 'unit_of_measure')
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


class InvoiceItemInline(admin.TabularInline):
    """Inline admin for invoice items"""
    model = InvoiceItem
    extra = 1
    fields = ['product', 'quantity', 'unit_price', 'line_total']
    readonly_fields = ['line_total']
    
    def line_total(self, obj):
        return f"₹{obj.line_total:.2f}" if obj.id else "-"
    line_total.short_description = 'Line Total'


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    """Admin interface for Invoice management"""
    list_display = ['invoice_number', 'business', 'client_name', 'user', 'invoice_date', 'total', 'created_at']
    list_filter = ['business', 'invoice_date', 'created_at']
    search_fields = ['invoice_number', 'client_name', 'business__name']
    readonly_fields = ['invoice_number', 'subtotal', 'tax_amount', 'total', 'created_at', 'updated_at']
    inlines = [InvoiceItemInline]
    
    fieldsets = (
        ('Invoice Information', {
            'fields': ('invoice_number', 'client_name', 'user', 'invoice_date')
        }),
        ('Totals', {
            'fields': ('subtotal', 'tax_amount', 'total')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def total(self, obj):
        return f"₹{obj.total:.2f}"
    total.short_description = 'Total'


@admin.register(Deposit)
class DepositAdmin(admin.ModelAdmin):
    """Admin interface for Deposit management"""
    list_display = ['user', 'business', 'amount', 'deposit_date', 'created_at']
    list_filter = ['business', 'deposit_date', 'created_at']
    search_fields = ['user__username', 'description']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'deposit_date'
    
    fieldsets = (
        ('Deposit Information', {
            'fields': ('business', 'user', 'amount', 'deposit_date', 'description')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
