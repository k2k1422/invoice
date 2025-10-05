from django.urls import path
from . import views

app_name = 'invoices'

urlpatterns = [
    path('', views.home, name='home'),
    path('invoices/', views.invoice_list, name='invoice_list'),
    path('invoices/create/', views.create_invoice, name='create_invoice'),
    path('invoices/<int:invoice_id>/', views.invoice_detail, name='invoice_detail'),
    path('invoices/<int:invoice_id>/print/', views.invoice_print, name='invoice_print'),
    path('logout/', views.custom_logout_view, name='logout'),
]