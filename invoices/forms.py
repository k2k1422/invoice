from django import forms
from .models import Invoice

class InvoiceForm(forms.ModelForm):
    """Form for creating and editing invoices"""
    
    class Meta:
        model = Invoice
        fields = ['client_name', 'client_email', 'client_address', 'invoice_number', 
                 'invoice_date', 'due_date', 'description', 'quantity', 'unit_price']
        widgets = {
            'client_name': forms.TextInput(attrs={'class': 'form-control'}),
            'client_email': forms.EmailInput(attrs={'class': 'form-control'}),
            'client_address': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'invoice_number': forms.TextInput(attrs={'class': 'form-control'}),
            'invoice_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'due_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'quantity': forms.NumberInput(attrs={'class': 'form-control'}),
            'unit_price': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name, field in self.fields.items():
            field.required = True