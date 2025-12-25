#!/usr/bin/env python3
"""
Script to update Django settings and URLs for React integration
"""
import re
from pathlib import Path

BASE_DIR = Path(__file__).parent

def update_settings():
    """Update settings.py for React integration"""
    settings_file = BASE_DIR / 'invoice_app' / 'settings.py'
    content = settings_file.read_text()
    
    # Update TEMPLATES DIRS
    old_templates = """        'DIRS': [BASE_DIR / 'templates'],"""
    new_templates = """        'DIRS': [
            BASE_DIR / 'templates',
            BASE_DIR / 'frontend' / 'build',  # React build directory
        ],"""
    content = content.replace(old_templates, new_templates)
    
    # Update STATICFILES_DIRS
    old_static = """STATIC_URL = 'static/'
STATICFILES_DIRS = [
    BASE_DIR / "static",
]
STATIC_ROOT = BASE_DIR / "staticfiles\""""
    
    new_static = """STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

STATICFILES_DIRS = [
    BASE_DIR / 'frontend' / 'build' / 'static',  # React build static files
]"""
    
    content = content.replace(old_static, new_static)
    
    settings_file.write_text(content)
    print("✓ Updated settings.py")

def update_urls():
    """Update urls.py for React integration"""
    urls_file = BASE_DIR / 'invoice_app' / 'urls.py'
    content = urls_file.read_text()
    
    # Update imports
    old_imports = """from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from rest_framework.routers import DefaultRouter"""
    
    new_imports = """from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter"""
    
    content = content.replace(old_imports, new_imports)
    
    # Update urlpatterns
    old_patterns = """    # DRF Browsable API auth (for testing)
    path('api-auth/', include('rest_framework.urls')),
    
    # Legacy template views (keep for now)
    path('', include('invoices.urls')),
    path('accounts/', include('django.contrib.auth.urls')),
]"""
    
    new_patterns = """    # DRF Browsable API auth (for testing)
    path('api-auth/', include('rest_framework.urls')),
    
    # React App - catch-all route (must be last)
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html'), name='react-app'),
]

# Serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)"""
    
    content = content.replace(old_patterns, new_patterns)
    
    urls_file.write_text(content)
    print("✓ Updated urls.py")

if __name__ == '__main__':
    print("Updating Django configuration for React integration...")
    update_settings()
    update_urls()
    print("\n✓ Configuration updated successfully!")
    print("\nNext steps:")
    print("1. Run: chmod +x deploy_react.sh")
    print("2. Run: ./deploy_react.sh")
    print("3. Run: python manage.py runserver 0.0.0.0:8000")
