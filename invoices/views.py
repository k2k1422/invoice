from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.contrib import messages
from django.http import HttpResponse
from .models import Invoice
from .forms import InvoiceForm

def home(request):
    """Home page view"""
    return render(request, 'invoices/home.html')

@login_required
def invoice_list(request):
    """List all invoices for the current user"""
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
    invoice = get_object_or_404(Invoice, id=invoice_id, user=request.user)
    return render(request, 'invoices/invoice_detail.html', {'invoice': invoice})

@login_required
def invoice_print(request, invoice_id):
    """Print-friendly view of invoice"""
    invoice = get_object_or_404(Invoice, id=invoice_id, user=request.user)
    return render(request, 'invoices/invoice_print.html', {'invoice': invoice})

def custom_logout_view(request):
    """Custom logout view that works with GET requests"""
    logout(request)
    messages.success(request, 'You have been successfully logged out.')
    return redirect('invoices:home')
