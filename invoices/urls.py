from django.urls import path
from . import views

app_name = 'invoices'

urlpatterns = [
    path('', views.home, name='home'),
    path('invoices/', views.invoice_list, name='invoice_list'),
    path('invoices/admin/', views.admin_invoice_list, name='admin_invoice_list'),
    path('invoices/create/', views.create_invoice, name='create_invoice'),
    path('invoices/<int:invoice_id>/', views.invoice_detail, name='invoice_detail'),
    path('invoices/<int:invoice_id>/print/', views.invoice_print, name='invoice_print'),
    path('logout/', views.custom_logout_view, name='logout'),
    path('change-password/', views.change_password, name='change_password'),
    
    # Product management URLs - Staff only
    path('products/', views.product_list, name='product_list'),
    path('products/create/', views.create_product, name='create_product'),
    path('products/<int:product_id>/edit/', views.edit_product, name='edit_product'),
    path('products/<int:product_id>/delete/', views.delete_product, name='delete_product'),
    
    # User management URLs - Admin only
    path('users/', views.user_management, name='user_management'),
    path('users/create/', views.create_user, name='create_user'),
    path('users/<int:user_id>/delete/', views.delete_user, name='delete_user'),
    path('users/<int:user_id>/reset-password/', views.reset_user_password, name='reset_user_password'),
    path('users/<int:user_id>/toggle-status/', views.toggle_user_status, name='toggle_user_status'),
    
    # Inventory management URLs - Admin only
    path('inventory/', views.inventory_management, name='inventory_management'),
    path('inventory/add-stock/', views.add_stock_movement, name='add_stock_movement'),
    path('inventory/product/<int:product_id>/history/', views.product_stock_history, name='product_stock_history'),
]