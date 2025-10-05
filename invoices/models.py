from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal

class Invoice(models.Model):
    """Invoice model"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Client information
    client_name = models.CharField(max_length=200)
    client_email = models.EmailField()
    client_address = models.TextField()
    
    # Invoice details
    invoice_number = models.CharField(max_length=50, unique=True)
    invoice_date = models.DateField()
    due_date = models.DateField()
    
    # Invoice items (using a simple text field for now)
    description = models.TextField(help_text="Describe the services or products")
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Calculated fields
    @property
    def subtotal(self):
        return self.quantity * self.unit_price
    
    @property
    def tax_amount(self):
        return self.subtotal * Decimal('0.1')  # 10% tax
    
    @property
    def total(self):
        return self.subtotal + self.tax_amount
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.client_name}"
