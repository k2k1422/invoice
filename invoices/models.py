from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal
from datetime import date
from django.db import transaction


class UserProfile(models.Model):
    """Extended user profile to track password change requirement"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    must_change_password = models.BooleanField(default=False)
    
    def __str__(self):
        return f"Profile for {self.user.username}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create a UserProfile when a new User is created"""
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save the UserProfile when the User is saved"""
    if not hasattr(instance, 'profile'):
        UserProfile.objects.create(user=instance)
    instance.profile.save()


class Product(models.Model):
    """Inventory/Product model - only admin users can create and modify"""
    item_name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    unit_of_measure = models.CharField(
        max_length=50,
        help_text="e.g., pcs, kg, liter, hour, etc."
    )
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(
        default=True,
        help_text="Active status"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['item_name']
    
    @property
    def quantity_in_stock(self):
        """Calculate current stock from incoming - outgoing - invoices (sales)"""
        # Sum all incoming stock
        incoming = self.stock_movements.filter(movement_type='IN').aggregate(
            total=models.Sum('quantity')
        )['total'] or Decimal('0')
        
        # Sum all outgoing stock
        outgoing = self.stock_movements.filter(movement_type='OUT').aggregate(
            total=models.Sum('quantity')
        )['total'] or Decimal('0')
        
        # Sum all invoice quantities (sales) through InvoiceItem
        from .models import InvoiceItem
        invoiced = InvoiceItem.objects.filter(product=self).aggregate(
            total=models.Sum('quantity')
        )['total'] or Decimal('0')
        
        return incoming - outgoing - invoiced
    
    def __str__(self):
        return f"{self.item_name} ({self.unit_of_measure})"


class StockMovement(models.Model):
    """Track inventory stock movements (incoming and outgoing)"""
    MOVEMENT_TYPES = [
        ('IN', 'Incoming Stock'),
        ('OUT', 'Outgoing Stock'),
    ]
    
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_movements')
    movement_type = models.CharField(max_length=3, choices=MOVEMENT_TYPES)
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Quantity added or removed"
    )
    movement_date = models.DateField(default=date.today)
    notes = models.TextField(blank=True, help_text="Optional notes about this movement")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-movement_date', '-created_at']
    
    def __str__(self):
        return f"{self.get_movement_type_display()} - {self.product.item_name} ({self.quantity})"


class Invoice(models.Model):
    """Invoice model - header information"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Client information
    client_name = models.CharField(max_length=200)
    
    # Invoice details
    invoice_number = models.CharField(max_length=50, unique=True, blank=True)
    invoice_date = models.DateField(default=date.today)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    @property
    def subtotal(self):
        """Calculate subtotal from all line items"""
        return sum(item.line_total for item in self.items.all())
    
    @property
    def tax_amount(self):
        """Calculate 10% tax on subtotal"""
        return self.subtotal * Decimal('0.1')
    
    @property
    def total(self):
        """Calculate total including tax"""
        return self.subtotal + self.tax_amount
    
    def save(self, *args, **kwargs):
        """Auto-generate invoice number if not provided"""
        if not self.invoice_number:
            # Use transaction with select_for_update to prevent race conditions
            with transaction.atomic():
                # Generate invoice number: INV-YYYYMMDD-XXXX
                today = date.today()
                date_str = today.strftime('%Y%m%d')
                # Get the count of invoices created today with a lock
                today_count = Invoice.objects.filter(
                    invoice_number__startswith=f'INV-{date_str}'
                ).select_for_update().count()
                self.invoice_number = f'INV-{date_str}-{today_count + 1:04d}'
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.client_name}"


class InvoiceItem(models.Model):
    """Invoice line items - products in an invoice"""
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['id']
    
    @property
    def line_total(self):
        """Calculate line total"""
        return self.quantity * self.unit_price
    
    def save(self, *args, **kwargs):
        """Auto-set unit_price from product if not provided"""
        if not self.unit_price:
            self.unit_price = self.product.unit_price
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.product.item_name} x {self.quantity}"
