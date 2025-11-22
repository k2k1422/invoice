from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth import logout, update_session_auth_hash
from django.contrib.auth.models import User
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib import messages
from django.http import HttpResponse
from datetime import datetime, timedelta
from django.utils import timezone
from .models import Invoice, Product, StockMovement
from .forms import InvoiceForm, ProductForm, StockMovementForm

def home(request):
    """Home page view"""
    # Check if user must change password
    if request.user.is_authenticated and hasattr(request.user, 'profile'):
        if request.user.profile.must_change_password:
            messages.warning(request, 'You must change your password before continuing.')
            return redirect('invoices:change_password')
    
    return render(request, 'invoices/home.html')

@login_required
def invoice_list(request):
    """List all invoices for the current user"""
    # Redirect admin users to the admin invoice list
    if request.user.is_staff:
        return redirect('invoices:admin_invoice_list')
    
    invoices = Invoice.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'invoices/invoice_list.html', {'invoices': invoices})

@login_required
def create_invoice(request):
    """Create a new invoice"""
    if request.method == 'POST':
        form = InvoiceForm(request.POST)
        if form.is_valid():
            invoice = form.save(commit=False)
            invoice.user = request.user
            invoice.save()
            messages.success(request, 'Invoice created successfully!')
            return redirect('invoices:invoice_detail', invoice_id=invoice.id)
    else:
        form = InvoiceForm()
    return render(request, 'invoices/create_invoice.html', {'form': form})

@login_required
def invoice_detail(request, invoice_id):
    """Display invoice details"""
    # Admin can view all invoices, regular users only their own
    if request.user.is_staff:
        invoice = get_object_or_404(Invoice, id=invoice_id)
    else:
        invoice = get_object_or_404(Invoice, id=invoice_id, user=request.user)
    return render(request, 'invoices/invoice_detail.html', {'invoice': invoice})

@login_required
def invoice_print(request, invoice_id):
    """Print-friendly view of invoice"""
    # Admin can view all invoices, regular users only their own
    if request.user.is_staff:
        invoice = get_object_or_404(Invoice, id=invoice_id)
    else:
        invoice = get_object_or_404(Invoice, id=invoice_id, user=request.user)
    return render(request, 'invoices/invoice_print.html', {'invoice': invoice})

def custom_logout_view(request):
    """Custom logout view that works with GET requests"""
    logout(request)
    messages.success(request, 'You have been successfully logged out.')
    return redirect('invoices:home')


@login_required
def change_password(request):
    """Allow users to change their password"""
    # Check if user must change password
    must_change = hasattr(request.user, 'profile') and request.user.profile.must_change_password
    
    if request.method == 'POST':
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            # Important: update the session to prevent logout
            update_session_auth_hash(request, user)
            
            # Clear the must_change_password flag
            if hasattr(user, 'profile'):
                user.profile.must_change_password = False
                user.profile.save()
            
            messages.success(request, 'Your password has been changed successfully!')
            return redirect('invoices:home')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = PasswordChangeForm(request.user)
    
    return render(request, 'invoices/change_password.html', {
        'form': form,
        'must_change': must_change
    })


# Helper function to check if user is staff
def is_staff_user(user):
    """Check if user is staff/admin"""
    return user.is_authenticated and user.is_staff


@user_passes_test(is_staff_user, login_url='/admin/login/')
def admin_invoice_list(request):
    """List all invoices with filters - Admin only"""
    # Get filter parameters
    user_id = request.GET.get('user', 'all')
    date_range = request.GET.get('date_range', '30')  # Default to 30 days
    
    # Start with all invoices
    invoices = Invoice.objects.all()
    
    # Apply user filter
    if user_id != 'all':
        try:
            invoices = invoices.filter(user_id=int(user_id))
        except (ValueError, TypeError):
            pass
    
    # Apply date range filter
    if date_range != 'all':
        try:
            days = int(date_range)
            start_date = timezone.now() - timedelta(days=days)
            invoices = invoices.filter(created_at__gte=start_date)
        except (ValueError, TypeError):
            pass
    
    # Order by most recent
    invoices = invoices.select_related('user', 'product').order_by('-created_at')
    
    # Get all users for the filter dropdown
    users = User.objects.filter(invoice__isnull=False).distinct().order_by('username')
    
    # Calculate stats
    total_count = invoices.count()
    total_amount = sum(invoice.total for invoice in invoices)
    
    context = {
        'invoices': invoices,
        'users': users,
        'selected_user': user_id,
        'selected_date_range': date_range,
        'total_count': total_count,
        'total_amount': total_amount,
    }
    
    return render(request, 'invoices/admin_invoice_list.html', context)


@login_required
def product_list(request):
    """List all products - All users can view"""
    products = Product.objects.all().order_by('item_name')
    active_count = products.filter(is_active=True).count()
    total_count = products.count()
    
    return render(request, 'invoices/product_list.html', {
        'products': products,
        'active_count': active_count,
        'total_count': total_count,
    })


@user_passes_test(is_staff_user, login_url='/admin/login/')
def create_product(request):
    """Create a new product - Staff only"""
    if request.method == 'POST':
        form = ProductForm(request.POST)
        if form.is_valid():
            product = form.save()
            messages.success(request, f'Product "{product.item_name}" created successfully!')
            return redirect('invoices:product_list')
    else:
        form = ProductForm()
    return render(request, 'invoices/create_product.html', {'form': form})


@user_passes_test(is_staff_user, login_url='/admin/login/')
def edit_product(request, product_id):
    """Edit an existing product - Staff only"""
    product = get_object_or_404(Product, id=product_id)
    
    if request.method == 'POST':
        form = ProductForm(request.POST, instance=product)
        if form.is_valid():
            product = form.save()
            messages.success(request, f'Product "{product.item_name}" updated successfully!')
            return redirect('invoices:product_list')
    else:
        form = ProductForm(instance=product)
    
    return render(request, 'invoices/edit_product.html', {'form': form, 'product': product})


@user_passes_test(is_staff_user, login_url='/admin/login/')
def delete_product(request, product_id):
    """Delete a product - Staff only"""
    product = get_object_or_404(Product, id=product_id)
    
    if request.method == 'POST':
        product_name = product.item_name
        product.delete()
        messages.success(request, f'Product "{product_name}" deleted successfully!')
        return redirect('invoices:product_list')
    
    return render(request, 'invoices/delete_product_confirm.html', {'product': product})


# User Management Views - Admin only

@user_passes_test(is_staff_user, login_url='/admin/login/')
def user_management(request):
    """List all users - Admin only"""
    users = User.objects.all().order_by('username')
    
    # Calculate stats
    total_count = users.count()
    active_count = users.filter(is_active=True).count()
    inactive_count = users.filter(is_active=False).count()
    staff_count = users.filter(is_staff=True).count()
    
    context = {
        'users': users,
        'total_count': total_count,
        'active_count': active_count,
        'inactive_count': inactive_count,
        'staff_count': staff_count,
    }
    
    return render(request, 'invoices/user_management.html', context)


@user_passes_test(is_staff_user, login_url='/admin/login/')
def create_user(request):
    """Create a new user with default password - Admin only"""
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        email = request.POST.get('email', '').strip()
        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()
        is_staff = request.POST.get('is_staff') == 'on'
        
        # Validation
        if not username:
            messages.error(request, 'Username is required.')
            return render(request, 'invoices/create_user.html', {
                'username': username,
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
            })
        
        # Check if username already exists
        if User.objects.filter(username=username).exists():
            messages.error(request, f'Username "{username}" already exists.')
            return render(request, 'invoices/create_user.html', {
                'username': username,
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
            })
        
        # Create user with default password
        default_password = 'Welcome@123'
        user = User.objects.create_user(
            username=username,
            email=email,
            password=default_password,
            first_name=first_name,
            last_name=last_name,
            is_staff=is_staff
        )
        
        # Set profile to require password change
        user.profile.must_change_password = True
        user.profile.save()
        
        messages.success(request, f'User "{username}" created successfully! Default password: {default_password}')
        return redirect('invoices:user_management')
    
    return render(request, 'invoices/create_user.html')


@user_passes_test(is_staff_user, login_url='/admin/login/')
def delete_user(request, user_id):
    """Delete a user - Admin only"""
    user_to_delete = get_object_or_404(User, id=user_id)
    
    # Prevent deleting yourself
    if user_to_delete.id == request.user.id:
        messages.error(request, 'You cannot delete your own account.')
        return redirect('invoices:user_management')
    
    if request.method == 'POST':
        username = user_to_delete.username
        user_to_delete.delete()
        messages.success(request, f'User "{username}" deleted successfully!')
        return redirect('invoices:user_management')
    
    return render(request, 'invoices/delete_user_confirm.html', {'user_to_delete': user_to_delete})


@user_passes_test(is_staff_user, login_url='/admin/login/')
def reset_user_password(request, user_id):
    """Reset user password to default - Admin only"""
    user_to_reset = get_object_or_404(User, id=user_id)
    
    if request.method == 'POST':
        default_password = 'Welcome@123'
        user_to_reset.set_password(default_password)
        user_to_reset.save()
        
        # Set profile to require password change
        user_to_reset.profile.must_change_password = True
        user_to_reset.profile.save()
        
        messages.success(request, f'Password reset for "{user_to_reset.username}". New password: {default_password}')
        return redirect('invoices:user_management')
    
    return render(request, 'invoices/reset_password_confirm.html', {'user_to_reset': user_to_reset})


@user_passes_test(is_staff_user, login_url='/admin/login/')
def toggle_user_status(request, user_id):
    """Enable or disable a user - Admin only"""
    user_to_toggle = get_object_or_404(User, id=user_id)
    
    # Prevent disabling yourself
    if user_to_toggle.id == request.user.id:
        messages.error(request, 'You cannot disable your own account.')
        return redirect('invoices:user_management')
    
    if request.method == 'POST':
        user_to_toggle.is_active = not user_to_toggle.is_active
        user_to_toggle.save()
        
        status = 'enabled' if user_to_toggle.is_active else 'disabled'
        messages.success(request, f'User "{user_to_toggle.username}" has been {status}.')
        return redirect('invoices:user_management')
    
    return render(request, 'invoices/toggle_user_status_confirm.html', {'user_to_toggle': user_to_toggle})


# Inventory Management Views - Admin only

@login_required
def inventory_management(request):
    """View all stock movements and current inventory - All users can view"""
    # Get all products with their stock levels
    products = Product.objects.all().order_by('item_name')
    
    # Get recent stock movements
    recent_movements = StockMovement.objects.select_related('product', 'created_by').all()[:50]
    
    # Calculate totals
    total_products = products.count()
    low_stock_count = sum(1 for p in products if p.quantity_in_stock < 10)
    
    context = {
        'products': products,
        'recent_movements': recent_movements,
        'total_products': total_products,
        'low_stock_count': low_stock_count,
    }
    
    return render(request, 'invoices/inventory_management.html', context)


@user_passes_test(is_staff_user, login_url='/admin/login/')
def add_stock_movement(request):
    """Add incoming or outgoing stock - Admin only"""
    if request.method == 'POST':
        form = StockMovementForm(request.POST)
        if form.is_valid():
            movement = form.save(commit=False)
            movement.created_by = request.user
            movement.save()
            
            movement_type = movement.get_movement_type_display()
            messages.success(request, f'{movement_type} of {movement.quantity} {movement.product.unit_of_measure} recorded for {movement.product.item_name}!')
            return redirect('invoices:inventory_management')
    else:
        form = StockMovementForm()
    
    return render(request, 'invoices/add_stock_movement.html', {'form': form})


@login_required
def product_stock_history(request, product_id):
    """View stock movement history for a specific product - All users can view"""
    product = get_object_or_404(Product, id=product_id)
    movements = product.stock_movements.select_related('created_by').all()
    
    # Calculate running totals
    running_total = 0
    movement_data = []
    for movement in reversed(list(movements)):
        if movement.movement_type == 'IN':
            running_total += movement.quantity
        else:
            running_total -= movement.quantity
        movement_data.append({
            'movement': movement,
            'running_total': running_total
        })
    
    movement_data.reverse()
    
    context = {
        'product': product,
        'movement_data': movement_data,
        'current_stock': product.quantity_in_stock,
    }
    
    return render(request, 'invoices/product_stock_history.html', context)
