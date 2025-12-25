from django import forms
from .models import Invoice, InvoiceItem, Product, StockMovement

class InvoiceForm(forms.ModelForm):
    """Form for creating and editing invoices"""
    
    class Meta:
        model = Invoice
        fields = ['client_name', 'invoice_date']
        widgets = {
            'client_name': forms.TextInput(attrs={'class': 'form-control'}),
            'invoice_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make all fields required
        for field_name, field in self.fields.items():
            field.required = True


class InvoiceItemForm(forms.ModelForm):
    """Form for invoice line items"""
    
    class Meta:
        model = InvoiceItem
        fields = ['product', 'quantity']
        widgets = {
            'product': forms.Select(attrs={'class': 'form-control'}),
            'quantity': forms.NumberInput(attrs={'class': 'form-control', 'min': '0.01', 'step': '0.01'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Only show active products
        self.fields['product'].queryset = Product.objects.filter(is_active=True)
        # Make all fields required
        for field_name, field in self.fields.items():
            field.required = True


class ProductForm(forms.ModelForm):
    """Form for creating and editing products - Admin only"""
    
    class Meta:
        model = Product
        fields = ['item_name', 'description', 'unit_of_measure', 'unit_price', 'is_active']
        widgets = {
            'item_name': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'unit_of_measure': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g., pcs, kg, liter, hour'}),
            'unit_price': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01', 'min': '0'}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make all fields required except description and is_active
        for field_name, field in self.fields.items():
            if field_name not in ['description', 'is_active']:
                field.required = True


class StockMovementForm(forms.ModelForm):
    """Form for adding stock movements - Admin only"""
    
    class Meta:
        model = StockMovement
        fields = ['product', 'movement_type', 'quantity', 'movement_date', 'notes']
        widgets = {
            'product': forms.Select(attrs={'class': 'form-control'}),
            'movement_type': forms.Select(attrs={'class': 'form-control'}),
            'quantity': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01', 'min': '0.01'}),
            'movement_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Only show active products
        self.fields['product'].queryset = Product.objects.filter(is_active=True)
        # Make fields required except notes
        for field_name, field in self.fields.items():
            if field_name != 'notes':
                field.required = True